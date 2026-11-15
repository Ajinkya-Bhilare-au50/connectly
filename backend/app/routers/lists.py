"""Lists: curated groups of people with their own timeline."""

from typing import Annotated

from fastapi import APIRouter, Query

from ..db import get_db
from ..deps import CurrentUser, OptionalUser
from ..errors import ApiError
from ..schemas import ListIn, ListUpdateIn
from ..social import shape_tweets
from ..utils import PUBLIC_USER_FIELDS, now, paginate, populate, serialize, to_object_id

router = APIRouter(prefix="/lists", tags=["lists"])

MAX_MEMBERS = 500


def _out(doc: dict) -> dict:
    doc = dict(doc)
    doc["memberCount"] = len(doc.get("members", []))
    return serialize(doc)


async def _get_list(list_id: str, viewer: dict | None) -> dict:
    """Private lists are only visible to their owner (others get a 404, not a 403)."""
    doc = await get_db().lists.find_one({"_id": to_object_id(list_id, "listId")})
    if doc is None or (doc.get("private") and (viewer is None or viewer["_id"] != doc["owner"])):
        raise ApiError(404, "List not found")
    return doc


async def _get_own_list(list_id: str, user: dict) -> dict:
    doc = await _get_list(list_id, user)
    if doc["owner"] != user["_id"]:
        raise ApiError(403, "Only the list owner can change it")
    return doc


@router.get("")
async def my_lists(user: CurrentUser):
    docs = await get_db().lists.find({"owner": user["_id"]}).sort("updatedAt", -1).to_list()
    return {"results": [_out(d) for d in docs]}


@router.post("", status_code=201)
async def create_list(body: ListIn, user: CurrentUser):
    ts = now()
    doc = {**body.model_dump(), "owner": user["_id"], "members": [], "createdAt": ts, "updatedAt": ts}
    doc["_id"] = (await get_db().lists.insert_one(doc)).inserted_id
    return {"list": _out(doc)}


@router.get("/{listId}")
async def get_list(listId: str, viewer: OptionalUser):
    doc = await _get_list(listId, viewer)
    await populate([doc], "owner", get_db().users, PUBLIC_USER_FIELDS)
    return {"list": _out(doc)}


@router.patch("/{listId}")
async def update_list(listId: str, body: ListUpdateIn, user: CurrentUser):
    doc = await _get_own_list(listId, user)
    values = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    values["updatedAt"] = now()
    doc = await get_db().lists.find_one_and_update({"_id": doc["_id"]}, {"$set": values}, return_document=True)
    return {"list": _out(doc)}


@router.delete("/{listId}")
async def delete_list(listId: str, user: CurrentUser):
    doc = await _get_own_list(listId, user)
    await get_db().lists.delete_one({"_id": doc["_id"]})
    return {"list": _out(doc)}


@router.get("/{listId}/members")
async def list_members(listId: str, viewer: OptionalUser):
    doc = await _get_list(listId, viewer)
    users = get_db().users.find({"_id": {"$in": doc.get("members", [])}}, PUBLIC_USER_FIELDS)
    return {"results": serialize([u async for u in users])}


@router.post("/{listId}/members/{userId}")
async def add_member(listId: str, userId: str, user: CurrentUser):
    doc = await _get_own_list(listId, user)
    member = to_object_id(userId, "userId")
    if await get_db().users.find_one({"_id": member}, {"_id": 1}) is None:
        raise ApiError(404, "User not found")
    if len(doc.get("members", [])) >= MAX_MEMBERS:
        raise ApiError(400, f"A list can have at most {MAX_MEMBERS} members")
    doc = await get_db().lists.find_one_and_update(
        {"_id": doc["_id"]}, {"$addToSet": {"members": member}, "$set": {"updatedAt": now()}}, return_document=True
    )
    return {"list": _out(doc)}


@router.delete("/{listId}/members/{userId}")
async def remove_member(listId: str, userId: str, user: CurrentUser):
    doc = await _get_own_list(listId, user)
    doc = await get_db().lists.find_one_and_update(
        {"_id": doc["_id"]},
        {"$pull": {"members": to_object_id(userId, "userId")}, "$set": {"updatedAt": now()}},
        return_document=True,
    )
    return {"list": _out(doc)}


@router.get("/{listId}/tweets")
async def list_timeline(
    listId: str,
    viewer: OptionalUser,
    limit: Annotated[int | None, Query()] = None,
    page: Annotated[int | None, Query()] = None,
):
    """Latest tweets (no replies) from the list's members."""
    doc = await _get_list(listId, viewer)
    docs, meta = await paginate(
        get_db().tweets,
        {"author": {"$in": doc.get("members", [])}, "replyTo": None},
        sort_by="createdAt:desc",
        limit=limit,
        page=page,
    )
    return {"results": await shape_tweets(docs, viewer), **meta}
