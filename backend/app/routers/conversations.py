"""Direct messages: one conversation per pair of people."""

from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Query

from ..db import get_db
from ..deps import CurrentUser
from ..errors import ApiError
from ..schemas import ConversationCreateIn, MessageIn
from ..uploads import ensure_own_upload
from ..utils import PUBLIC_USER_FIELDS, now, serialize, to_object_id

router = APIRouter(prefix="/conversations", tags=["messages"])


def _pair_key(a: ObjectId, b: ObjectId) -> str:
    return "_".join(sorted((str(a), str(b))))


def _is_unread(conv: dict, me: ObjectId) -> bool:
    last = conv.get("lastMessage")
    if not last or last.get("sender") == me:
        return False
    seen = conv.get("reads", {}).get(str(me))
    return seen is None or seen < last["createdAt"]


async def _shape(convs: list[dict], me: ObjectId) -> list[dict]:
    """Add `otherUser` and `unread` for the viewer; hide the read-receipt map."""
    other_ids = {p for c in convs for p in c["participants"] if p != me}
    users = {u["_id"]: u async for u in get_db().users.find({"_id": {"$in": list(other_ids)}}, PUBLIC_USER_FIELDS)}
    out = []
    for c in convs:
        other = next((p for p in c["participants"] if p != me), None)
        their_read = c.get("reads", {}).get(str(other)) if other else None
        last = c.get("lastMessage")
        item = {
            "_id": c["_id"],
            "otherUser": users.get(other),
            "lastMessage": last,
            "updatedAt": c.get("updatedAt"),
            "unread": _is_unread(c, me),
            # True when the other person has seen my latest message ("Seen" receipt).
            "seenByOther": bool(last and last.get("sender") == me and their_read and their_read >= last["createdAt"]),
        }
        out.append(item)
    return serialize(out)


async def _get_my_conversation(conversation_id: str, me: ObjectId) -> dict:
    conv = await get_db().conversations.find_one({"_id": to_object_id(conversation_id, "conversationId")})
    if conv is None or me not in conv["participants"]:
        raise ApiError(404, "Conversation not found")
    return conv


@router.get("")
async def list_conversations(user: CurrentUser):
    """Your conversations, most recent first."""
    convs = (
        await get_db()
        .conversations.find({"participants": user["_id"], "lastMessage": {"$ne": None}})
        .sort("updatedAt", -1)
        .limit(100)
        .to_list()
    )
    return {"results": await _shape(convs, user["_id"])}


@router.get("/unread-count")
async def unread_count(user: CurrentUser):
    convs = get_db().conversations.find({"participants": user["_id"]}, {"lastMessage": 1, "reads": 1})
    count = sum([1 async for c in convs if _is_unread(c, user["_id"])])
    return {"count": count}


@router.post("")
async def start_conversation(body: ConversationCreateIn, user: CurrentUser):
    """Open (or reuse) the conversation with another person."""
    me, other = user["_id"], to_object_id(body.userId, "userId")
    if me == other:
        raise ApiError(400, "You can't message yourself")
    db = get_db()
    if await db.users.find_one({"_id": other}, {"_id": 1}) is None:
        raise ApiError(404, "User not found")

    ts = now()
    conv = await db.conversations.find_one_and_update(
        {"pair": _pair_key(me, other)},
        {
            "$setOnInsert": {
                "pair": _pair_key(me, other),
                "participants": [me, other],
                "lastMessage": None,
                "reads": {},
                "createdAt": ts,
                "updatedAt": ts,
            }
        },
        upsert=True,
        return_document=True,
    )
    return {"conversation": (await _shape([conv], me))[0]}


@router.get("/{conversationId}")
async def get_conversation(conversationId: str, user: CurrentUser):
    conv = await _get_my_conversation(conversationId, user["_id"])
    return {"conversation": (await _shape([conv], user["_id"]))[0]}


@router.get("/{conversationId}/messages")
async def list_messages(
    conversationId: str,
    user: CurrentUser,
    before: str | None = None,
    after: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
):
    """
    Messages oldest-to-newest. `before=<messageId>` loads older history;
    `after=<messageId>` fetches only new messages (used for polling).
    """
    conv = await _get_my_conversation(conversationId, user["_id"])
    filter_: dict = {"conversation": conv["_id"]}
    if before:
        filter_["_id"] = {"$lt": to_object_id(before, "before")}
    if after:
        filter_["_id"] = {"$gt": to_object_id(after, "after")}
    docs = await get_db().messages.find(filter_).sort("_id", -1).limit(limit).to_list()
    docs.reverse()
    return {"results": serialize(docs), "hasMore": len(docs) == limit and not after}


@router.post("/{conversationId}/messages", status_code=201)
async def send_message(conversationId: str, body: MessageIn, user: CurrentUser):
    me = user["_id"]
    conv = await _get_my_conversation(conversationId, me)
    if body.image:
        await ensure_own_upload(body.image, me, "image")

    ts = now()
    message = {"conversation": conv["_id"], "sender": me, "text": body.text.strip(), "image": body.image, "createdAt": ts}
    message["_id"] = (await get_db().messages.insert_one(message)).inserted_id
    await get_db().conversations.update_one(
        {"_id": conv["_id"]},
        {
            "$set": {
                "lastMessage": {"text": message["text"], "sender": me, "createdAt": ts, "hasImage": bool(body.image)},
                "updatedAt": ts,
                f"reads.{me}": ts,
            }
        },
    )
    return {"message": serialize(message)}


@router.post("/{conversationId}/read")
async def mark_read(conversationId: str, user: CurrentUser):
    conv = await _get_my_conversation(conversationId, user["_id"])
    await get_db().conversations.update_one({"_id": conv["_id"]}, {"$set": {f"reads.{user['_id']}": now()}})
    return {"read": True}
