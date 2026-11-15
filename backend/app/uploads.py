"""Image storage in MongoDB GridFS (bucket "uploads": collections uploads.files + uploads.chunks)."""

import re

from bson import ObjectId
from gridfs import AsyncGridFSBucket
from gridfs.errors import NoFile

from .db import get_db
from .errors import ApiError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # images
MAX_VIDEO_BYTES = 50 * 1024 * 1024
UPLOAD_URL_PREFIX = "/api/uploads/"
UPLOAD_URL_RE = re.compile(r"^/api/uploads/([0-9a-f]{24})$")


def bucket() -> AsyncGridFSBucket:
    return AsyncGridFSBucket(get_db(), bucket_name="uploads")


def sniff_image_type(data: bytes) -> str | None:
    """Detect the real image type from its first bytes (never trust the filename/header)."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def sniff_video_type(data: bytes) -> str | None:
    if data[4:8] == b"ftyp":
        return "video/mp4"
    if data.startswith(b"\x1a\x45\xdf\xa3"):
        return "video/webm"
    return None


def upload_id(url: str | None) -> ObjectId | None:
    """ObjectId of one of our uploads from its URL, or None for external URLs / empty values."""
    match = UPLOAD_URL_RE.match(url or "")
    return ObjectId(match.group(1)) if match else None


async def save_image(data: bytes, content_type: str, owner_id: ObjectId) -> str:
    file_id = await bucket().upload_from_stream(
        "image",
        data,
        metadata={"owner": owner_id, "contentType": content_type, "size": len(data)},
    )
    return f"{UPLOAD_URL_PREFIX}{file_id}"


async def get_file_info(file_id: ObjectId) -> dict | None:
    return await get_db()["uploads.files"].find_one({"_id": file_id})


async def ensure_own_upload(url: str | None, owner_id: ObjectId, kind: str = "image") -> None:
    """
    If `url` points at an upload, it must exist, belong to `owner_id` and be of `kind`
    ("image" or "video"). External URLs pass.
    """
    file_id = upload_id(url)
    if file_id is None:
        return
    info = await get_file_info(file_id)
    meta = (info or {}).get("metadata", {})
    if info is None or meta.get("owner") != owner_id:
        raise ApiError(400, f"Invalid {kind}: upload it first")
    if not meta.get("contentType", "").startswith(f"{kind}/"):
        raise ApiError(400, f"That upload is not a {kind}")


async def delete_upload(url: str | None) -> None:
    """Delete an upload by URL. Ignores external URLs and files that are already gone."""
    file_id = upload_id(url)
    if file_id is None:
        return
    try:
        await bucket().delete(file_id)
    except NoFile:
        pass


async def delete_uploads_of(owner_id: ObjectId) -> None:
    async for info in get_db()["uploads.files"].find({"metadata.owner": owner_id}, {"_id": 1}):
        try:
            await bucket().delete(info["_id"])
        except NoFile:
            pass
