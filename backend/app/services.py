"""Shared database operations used by more than one router."""

from bson import ObjectId

from .db import get_db
from .errors import ApiError
from .security import hash_password
from .utils import now


def format_username(username: str) -> str:
    return username.replace(" ", "").lower()


async def is_email_taken(email: str, exclude_id: ObjectId | None = None) -> bool:
    query: dict = {"email": email.strip().lower()}
    if exclude_id:
        query["_id"] = {"$ne": exclude_id}
    return await get_db().users.find_one(query, {"_id": 1}) is not None


async def is_username_taken(username: str, exclude_id: ObjectId | None = None) -> bool:
    query: dict = {"username": format_username(username)}
    if exclude_id:
        query["_id"] = {"$ne": exclude_id}
    return await get_db().users.find_one(query, {"_id": 1}) is not None


async def create_user_with_profile(data: dict) -> dict:
    """Create a user plus their (empty) profile. Returns the user document."""
    if await is_email_taken(data["email"]):
        raise ApiError(400, "Email already taken")
    if await is_username_taken(data["username"]):
        raise ApiError(400, "Username already taken")

    ts = now()
    user = {
        "name": data["name"].strip(),
        "username": format_username(data["username"]),
        "email": data["email"].strip().lower(),
        "password": hash_password(data["password"]),
        "role": data.get("role") or "user",
        "createdAt": ts,
        "updatedAt": ts,
    }
    if data.get("avatar"):
        user["avatar"] = data["avatar"]

    db = get_db()
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    await db.profiles.insert_one(
        {
            "user": user["_id"],
            "following": [],
            "followers": [],
            "likes": [],
            "retweets": [],
            "createdAt": ts,
            "updatedAt": ts,
        }
    )
    return user


async def get_profile_or_404(user_id: ObjectId, message: str = "Profile not found") -> dict:
    profile = await get_db().profiles.find_one({"user": user_id})
    if profile is None:
        raise ApiError(404, message)
    return profile


async def get_tweet_or_404(tweet_id: ObjectId) -> dict:
    tweet = await get_db().tweets.find_one({"_id": tweet_id})
    if tweet is None:
        raise ApiError(404, "Tweet not found")
    return tweet


async def update_replies_count(tweet_id: ObjectId | None) -> None:
    if tweet_id is None:
        return
    db = get_db()
    count = await db.tweets.count_documents({"replyTo": tweet_id})
    await db.tweets.update_one({"_id": tweet_id}, {"$set": {"repliesCount": count}})
