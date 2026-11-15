"""Dev/test-only helpers used by the Cypress tests: reset + seed the database."""

import json
from datetime import datetime
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter

from ..config import BASE_DIR
from ..db import get_db
from ..social import backfill_hashtags
from ..utils import serialize

router = APIRouter(prefix="/testData", tags=["test data"])

SEED_FILE = BASE_DIR / "data" / "database-seed.json"
COLLECTIONS = ("users", "profiles", "tweets")
ID_FIELDS = {"_id", "user", "author", "replyTo"}
ID_LIST_FIELDS = {"following", "followers", "likes", "retweets"}
DATE_FIELDS = {"createdAt", "updatedAt", "birthday"}


def _convert(doc: dict) -> dict:
    """The seed JSON stores ids and dates as strings; turn them into real BSON types."""
    out = {}
    for key, value in doc.items():
        if key in ID_FIELDS and isinstance(value, str):
            out[key] = ObjectId(value)
        elif key in ID_LIST_FIELDS and isinstance(value, list):
            out[key] = [ObjectId(v) for v in value]
        elif key in DATE_FIELDS and isinstance(value, str):
            out[key] = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            out[key] = value
    return out


async def seed_db() -> None:
    db = get_db()
    # Only touch this app's collections (and its image uploads), never anything else.
    for name in (*COLLECTIONS, "uploads.files", "uploads.chunks", "notifications", "conversations", "messages", "lists", "password_resets"):
        await db[name].delete_many({})

    seed = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    for name, docs in seed.items():
        if docs:
            await db[name].insert_many([_convert(d) for d in docs])
    await backfill_hashtags()


@router.post("/seed", status_code=200)
async def seed():
    await seed_db()
    return None


@router.get("/{entity}")
async def get_collection(entity: Literal["users", "profiles", "tweets"]):
    docs = await get_db()[entity].find().to_list()
    return serialize(docs)
