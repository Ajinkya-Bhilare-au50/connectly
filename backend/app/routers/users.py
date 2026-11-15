from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ..db import get_db
from ..deps import require_rights
from ..errors import ApiError
from ..schemas import UserCreateIn, UserUpdateIn
from ..security import hash_password
from ..services import create_user_with_profile, format_username, is_email_taken, is_username_taken
from ..uploads import delete_upload, delete_uploads_of, ensure_own_upload
from ..utils import now, paginate, serialize, to_object_id

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def get_users(
    _: Annotated[dict, Depends(require_rights("getUsers"))],
    name: str | None = None,
    role: str | None = None,
    sortBy: str | None = None,
    limit: Annotated[int | None, Query()] = None,
    page: Annotated[int | None, Query()] = None,
):
    """Get all users (admin)."""
    filter_ = {k: v for k, v in {"name": name, "role": role}.items() if v}
    docs, meta = await paginate(get_db().users, filter_, sort_by=sortBy, limit=limit, page=page)
    return {"results": serialize(docs), **meta}


@router.get("/{userId}")
async def get_user(userId: str, _: Annotated[dict, Depends(require_rights("getUsers"))]):
    """Get a user by id (owner or admin)."""
    user = await get_db().users.find_one({"_id": to_object_id(userId, "userId")})
    if user is None:
        raise ApiError(404, "User not found")
    return {"user": serialize(user)}


@router.post("", status_code=201)
async def create_user(body: UserCreateIn, _: Annotated[dict, Depends(require_rights("manageUsers"))]):
    """Create a user (admin)."""
    user = await create_user_with_profile(body.model_dump())
    return {"user": serialize(user)}


@router.patch("/{userId}")
async def update_user(
    userId: str,
    body: UserUpdateIn,
    auth_user: Annotated[dict, Depends(require_rights("manageUsers"))],
):
    """Update a user (owner or admin). Only admins can change `role`."""
    user_id = to_object_id(userId, "userId")
    # Ignore explicit nulls, except avatar which may be cleared.
    values = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k == "avatar"}

    if "role" in values and auth_user.get("role") != "admin":
        raise ApiError(400, '"role" is not allowed')
    if not values:
        raise ApiError(400, '"value" must have at least 1 key')

    if values.get("email"):
        if await is_email_taken(values["email"], user_id):
            raise ApiError(400, "Email already taken")
        values["email"] = values["email"].strip().lower()
    if values.get("username"):
        if await is_username_taken(values["username"], user_id):
            raise ApiError(400, "Username already taken")
        values["username"] = format_username(values["username"])
    if values.get("password"):
        values["password"] = hash_password(values["password"])

    old_user = await get_db().users.find_one({"_id": user_id}, {"avatar": 1})
    if old_user is None:
        raise ApiError(404, "User not found")
    if values.get("avatar"):
        # An uploaded avatar must belong to the account being edited.
        await ensure_own_upload(values["avatar"], user_id)

    unset = {"avatar": ""} if "avatar" in values and not values["avatar"] else {}
    to_set = {k: v for k, v in values.items() if k not in unset}
    to_set["updatedAt"] = now()

    update = {"$set": to_set}
    if unset:
        update["$unset"] = unset
    user = await get_db().users.find_one_and_update({"_id": user_id}, update, return_document=True)
    if user is None:
        raise ApiError(404, "User not found")
    # The previous avatar is no longer used: remove it if it was an upload.
    if "avatar" in values and old_user.get("avatar") != user.get("avatar"):
        await delete_upload(old_user.get("avatar"))
    return {"user": serialize(user)}


@router.delete("/{userId}")
async def delete_user(userId: str, _: Annotated[dict, Depends(require_rights("manageUsers"))]):
    """Delete a user, their profile and tweets, and remove them from other users' lists."""
    user_id = to_object_id(userId, "userId")
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if user is None:
        raise ApiError(404, "User not found")

    await db.users.delete_one({"_id": user_id})
    await db.profiles.delete_one({"user": user_id})
    await db.tweets.delete_many({"author": user_id})
    # Clean up dangling references (the old server left these behind).
    await db.profiles.update_many({}, {"$pull": {"following": user_id, "followers": user_id}})
    await db.tweets.update_many({}, {"$pull": {"likes": user_id, "retweets": user_id}})
    await delete_uploads_of(user_id)  # their avatar, cover and post images
    await db.notifications.delete_many({"$or": [{"user": user_id}, {"actor": user_id}]})
    conversation_ids = [c["_id"] async for c in db.conversations.find({"participants": user_id}, {"_id": 1})]
    await db.messages.delete_many({"conversation": {"$in": conversation_ids}})
    await db.conversations.delete_many({"_id": {"$in": conversation_ids}})
    await db.lists.delete_many({"owner": user_id})
    await db.lists.update_many({}, {"$pull": {"members": user_id}})
    await db.password_resets.delete_many({"user": user_id})

    return {"user": serialize(user)}
