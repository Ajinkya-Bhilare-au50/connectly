import re
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ..db import get_db
from ..deps import CurrentUser, require_rights
from ..errors import ApiError
from ..schemas import ProfileUpdateIn
from ..services import get_profile_or_404
from ..social import notify, unnotify
from ..uploads import delete_upload, ensure_own_upload
from ..utils import PUBLIC_USER_FIELDS, now, paginate, populate, serialize, to_object_id

router = APIRouter(prefix="/profiles", tags=["profiles"])


async def _populated(profile: dict) -> dict:
    await populate([profile], "user", get_db().users, PUBLIC_USER_FIELDS)
    return profile


# Static paths are declared before "/{userId}" so they are matched first.


@router.post("/follow/{userId}")
async def follow_profile(userId: str, auth_user: CurrentUser):
    """Follow a profile. Returns the logged-in user's updated profile."""
    target_id = to_object_id(userId, "userId")
    me = auth_user["_id"]
    if target_id == me:
        raise ApiError(400, "You cannot follow your own profile")

    await get_profile_or_404(target_id, "Profile does not exists")
    my_profile = await get_profile_or_404(me)
    if target_id in my_profile.get("following", []):
        raise ApiError(400, "You already follow that profile")

    db = get_db()
    ts = now()
    # $addToSet is atomic, so two quick clicks can't create duplicates or lose updates.
    await db.profiles.update_one({"user": target_id}, {"$addToSet": {"followers": me}, "$set": {"updatedAt": ts}})
    my_profile = await db.profiles.find_one_and_update(
        {"user": me}, {"$addToSet": {"following": target_id}, "$set": {"updatedAt": ts}}, return_document=True
    )
    await notify(target_id, me, "follow")
    return {"profile": serialize(my_profile)}


@router.delete("/follow/{userId}")
async def unfollow_profile(userId: str, auth_user: CurrentUser):
    """Unfollow a profile. Returns the logged-in user's updated profile."""
    target_id = to_object_id(userId, "userId")
    me = auth_user["_id"]
    if target_id == me:
        raise ApiError(400, "You cannot unfollow your own profile")

    await get_profile_or_404(target_id, "Profile does not exists")
    my_profile = await get_profile_or_404(me)
    if target_id not in my_profile.get("following", []):
        raise ApiError(400, "You do not follow that profile")

    db = get_db()
    ts = now()
    await db.profiles.update_one({"user": target_id}, {"$pull": {"followers": me}, "$set": {"updatedAt": ts}})
    my_profile = await db.profiles.find_one_and_update(
        {"user": me}, {"$pull": {"following": target_id}, "$set": {"updatedAt": ts}}, return_document=True
    )
    await unnotify(target_id, me, "follow")
    return {"profile": serialize(my_profile)}


@router.get("")
async def get_profiles(
    following: str | None = None,
    followers: str | None = None,
    likes: str | None = None,
    retweets: str | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    sortBy: str | None = None,
    limit: Annotated[int | None, Query()] = None,
    page: Annotated[int | None, Query()] = None,
):
    """
    List profiles. Filters:
    - following=<userId>: profiles that follow that user
    - followers=<userId>: profiles followed by that user
    - likes / retweets=<tweetId>: profiles that liked / retweeted that tweet
    - q=<text>: name or username contains the text
    """
    db = get_db()
    filter_ = {}
    for field, value, coll, msg in (
        ("following", following, db.users, "User does not exists"),
        ("followers", followers, db.users, "User does not exists"),
        ("likes", likes, db.tweets, "Tweet does not exists"),
        ("retweets", retweets, db.tweets, "Tweet does not exists"),
    ):
        if value:
            oid = to_object_id(value, field)
            if await coll.find_one({"_id": oid}, {"_id": 1}) is None:
                raise ApiError(404, msg)
            filter_[field] = oid

    if q and q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        matches = db.users.find({"$or": [{"name": rx}, {"username": rx}]}, {"_id": 1}).limit(500)
        filter_["user"] = {"$in": [u["_id"] async for u in matches]}

    docs, meta = await paginate(db.profiles, filter_, sort_by=sortBy, limit=limit, page=page)
    await populate(docs, "user", db.users, PUBLIC_USER_FIELDS)
    return {"results": serialize(docs), **meta}


@router.get("/by-username/{username}")
async def get_profile_by_username(username: str):
    """Resolve an @username (used by @mention links)."""
    user = await get_db().users.find_one({"username": username.strip().lstrip("@").lower()}, {"_id": 1})
    if user is None:
        raise ApiError(404, "Profile not found")
    profile = await get_profile_or_404(user["_id"])
    return {"profile": serialize(await _populated(profile))}


@router.get("/{userId}")
async def get_profile(userId: str):
    """Get a user's profile."""
    profile = await get_profile_or_404(to_object_id(userId, "userId"))
    return {"profile": serialize(await _populated(profile))}


@router.patch("/{userId}")
async def update_profile(
    userId: str,
    body: ProfileUpdateIn,
    _: Annotated[dict, Depends(require_rights("manageUsers"))],
):
    """Update a profile (owner or admin)."""
    user_id = to_object_id(userId, "userId")
    values = body.model_dump(exclude_unset=True)
    if not values:
        raise ApiError(400, '"value" must have at least 1 key')
    if values.get("birthday") == "":
        values["birthday"] = None
    if values.get("backgroundImage"):
        await ensure_own_upload(values["backgroundImage"], user_id)

    old = await get_profile_or_404(user_id)
    values["updatedAt"] = now()
    profile = await get_db().profiles.find_one_and_update(
        {"user": user_id}, {"$set": values}, return_document=True
    )
    if profile is None:
        raise ApiError(404, "Profile not found")
    # The previous cover image is no longer used: remove it if it was an upload.
    if "backgroundImage" in values and old.get("backgroundImage") != profile.get("backgroundImage"):
        await delete_upload(old.get("backgroundImage"))
    return {"profile": serialize(profile)}
