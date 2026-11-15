import re
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from pymongo.asynchronous.collection import AsyncCollection

from .errors import ApiError

OBJECT_ID_RE = re.compile(r"^[0-9a-fA-F]{24}$")

# Fields returned when a user is embedded in a tweet / profile (Mongoose "populate").
PUBLIC_USER_FIELDS = {"name": 1, "username": 1, "avatar": 1}
PRIVATE_FIELDS = {"password", "bookmarks"}


def now() -> datetime:
    return datetime.now(UTC)


def to_object_id(value: str, label: str = "id") -> ObjectId:
    if not isinstance(value, str) or not OBJECT_ID_RE.match(value):
        raise ApiError(400, f'"{label}" must be a valid mongo id')
    return ObjectId(value)


def serialize(value: Any) -> Any:
    """Turn a Mongo document into JSON-friendly data (ObjectId -> str, datetime -> ISO)."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    if isinstance(value, dict):
        # Never send password hashes or (private) bookmark lists to clients.
        return {k: serialize(v) for k, v in value.items() if k not in PRIVATE_FIELDS}
    if isinstance(value, list):
        return [serialize(v) for v in value]
    return value


def parse_sort(sort_by: str | None) -> list[tuple[str, int]]:
    """'createdAt:desc,name:asc' -> [('createdAt', -1), ('name', 1)]"""
    if not sort_by:
        return [("createdAt", 1)]
    criteria = []
    for option in sort_by.split(","):
        key, _, order = option.partition(":")
        if key.strip():
            criteria.append((key.strip(), -1 if order.strip() == "desc" else 1))
    return criteria or [("createdAt", 1)]


async def populate(
    docs: list[dict], field: str, collection: AsyncCollection, projection: dict | None = None
) -> list[dict]:
    """Replace `doc[field]` (an ObjectId) with the referenced document, or None if missing."""
    ids = {d[field] for d in docs if isinstance(d.get(field), ObjectId)}
    found = {}
    if ids:
        async for ref in collection.find({"_id": {"$in": list(ids)}}, projection or {}):
            found[ref["_id"]] = ref
    for d in docs:
        if field in d:
            d[field] = found.get(d[field])
    return docs


async def paginate(
    collection: AsyncCollection,
    filter_: dict,
    *,
    sort_by: str | None = None,
    limit: int | None = None,
    page: int | None = None,
    projection: dict | None = None,
) -> tuple[list[dict], dict]:
    """Returns (documents, meta) where meta is {page, limit, totalPages, totalResults}."""
    limit = limit if limit and limit > 0 else 10
    page = page if page and page > 0 else 1
    total = await collection.count_documents(filter_)
    cursor = (
        collection.find(filter_, projection)
        .sort(parse_sort(sort_by))
        .skip((page - 1) * limit)
        .limit(limit)
    )
    docs = await cursor.to_list()
    meta = {"page": page, "limit": limit, "totalPages": -(-total // limit), "totalResults": total}
    return docs, meta
