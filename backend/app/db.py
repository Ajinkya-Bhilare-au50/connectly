from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from .config import get_settings

_client: AsyncMongoClient | None = None
_db: AsyncDatabase | None = None


async def connect() -> None:
    global _client, _db
    settings = get_settings()
    _client = AsyncMongoClient(settings.mongo_uri, tz_aware=True)
    db = _client.get_default_database(default="test")
    if settings.env == "test":
        db = _client[f"{db.name}-test"]
    _db = db
    await _client.admin.command("ping")
    await ensure_indexes()


async def disconnect() -> None:
    if _client is not None:
        await _client.close()


def get_db() -> AsyncDatabase:
    if _db is None:
        raise RuntimeError("Database is not connected")
    return _db


async def ensure_indexes() -> None:
    db = get_db()
    # Same index names Mongoose created, so an existing database is reused as-is.
    await db.users.create_index([("email", ASCENDING)], unique=True, name="email_1")
    await db.users.create_index([("username", ASCENDING)], unique=True, name="username_1")
    await db.profiles.create_index([("user", ASCENDING)], name="user_1")
    await db.tweets.create_index([("author", ASCENDING), ("createdAt", DESCENDING)], name="author_1_createdAt_-1")
    await db.tweets.create_index([("replyTo", ASCENDING)], name="replyTo_1")
    # GridFS image uploads: find a user's files when deleting their account.
    await db["uploads.files"].create_index([("metadata.owner", ASCENDING)], name="metadata.owner_1")
    await db.tweets.create_index([("hashtags", ASCENDING), ("createdAt", DESCENDING)], name="hashtags_1_createdAt_-1")
    await db.notifications.create_index([("user", ASCENDING), ("createdAt", DESCENDING)], name="user_1_createdAt_-1")
    await db.notifications.create_index(
        [("user", ASCENDING), ("actor", ASCENDING), ("type", ASCENDING), ("tweet", ASCENDING)], name="dedupe"
    )
    await db.conversations.create_index([("pair", ASCENDING)], unique=True, name="pair_1")
    await db.conversations.create_index([("participants", ASCENDING), ("updatedAt", DESCENDING)], name="participants_1_updatedAt_-1")
    await db.messages.create_index([("conversation", ASCENDING), ("_id", DESCENDING)], name="conversation_1__id_-1")
    await db.lists.create_index([("owner", ASCENDING)], name="owner_1")
    # Password-reset tokens disappear automatically once expired.
    await db.password_resets.create_index([("expiresAt", ASCENDING)], expireAfterSeconds=0, name="expiresAt_ttl")
