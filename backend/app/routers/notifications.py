from typing import Annotated

from fastapi import APIRouter, Query

from ..db import get_db
from ..deps import CurrentUser
from ..errors import ApiError
from ..social import NOTIFICATION_TYPES
from ..utils import PUBLIC_USER_FIELDS, paginate, populate, serialize, to_object_id

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    user: CurrentUser,
    unreadOnly: bool = False,
    type: str | None = None,
    limit: Annotated[int | None, Query()] = None,
    page: Annotated[int | None, Query()] = None,
):
    """Your notifications, newest first: likes, retweets, follows, replies and mentions."""
    db = get_db()
    filter_: dict = {"user": user["_id"]}
    if unreadOnly:
        filter_["read"] = False
    if type:
        filter_["type"] = {"$in": [t for t in type.split(",") if t in NOTIFICATION_TYPES]}
    docs, meta = await paginate(db.notifications, filter_, sort_by="createdAt:desc", limit=limit or 20, page=page)
    await populate(docs, "actor", db.users, PUBLIC_USER_FIELDS)
    await populate(docs, "tweet", db.tweets, {"text": 1, "image": 1, "video": 1, "author": 1})
    # Hide notifications whose user or tweet no longer exists.
    docs = [d for d in docs if d.get("actor") and (d.get("tweet") is not None or d["type"] == "follow")]
    return {"results": serialize(docs), **meta}


@router.get("/unread-count")
async def unread_count(user: CurrentUser):
    count = await get_db().notifications.count_documents({"user": user["_id"], "read": False})
    return {"count": count}


@router.post("/read-all")
async def mark_all_read(user: CurrentUser):
    result = await get_db().notifications.update_many({"user": user["_id"], "read": False}, {"$set": {"read": True}})
    return {"updated": result.modified_count}


@router.post("/{notificationId}/read")
async def mark_read(notificationId: str, user: CurrentUser):
    result = await get_db().notifications.update_one(
        {"_id": to_object_id(notificationId, "notificationId"), "user": user["_id"]}, {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise ApiError(404, "Notification not found")
    return {"read": True}
