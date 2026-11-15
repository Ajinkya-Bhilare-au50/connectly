import re

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import Response, StreamingResponse

from ..deps import CurrentUser
from ..errors import ApiError
from ..uploads import (
    MAX_UPLOAD_BYTES,
    MAX_VIDEO_BYTES,
    bucket,
    get_file_info,
    save_image,
    sniff_image_type,
    sniff_video_type,
)
from ..utils import to_object_id

router = APIRouter(prefix="/uploads", tags=["uploads"])

CHUNK = 1024 * 1024
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


@router.post("", status_code=201)
async def upload_file(user: CurrentUser, file: UploadFile = File(...)):
    """
    Upload an image (JPEG, PNG, GIF or WebP, max 5 MB) or a video (MP4 or WebM, max 50 MB)
    as multipart field `file`. Returns `{"url": "/api/uploads/<id>", "kind": "image" | "video"}`.
    """
    data = await file.read(MAX_VIDEO_BYTES + 1)
    if not data:
        raise ApiError(400, "The file is empty")

    content_type = sniff_image_type(data)
    if content_type:
        if len(data) > MAX_UPLOAD_BYTES:
            raise ApiError(413, "Image must be 5 MB or smaller")
    else:
        content_type = sniff_video_type(data)
        if content_type is None:
            raise ApiError(400, "Only JPEG, PNG, GIF, WebP images and MP4 or WebM videos are allowed")
        if len(data) > MAX_VIDEO_BYTES:
            raise ApiError(413, "Video must be 50 MB or smaller")

    url = await save_image(data, content_type, user["_id"])
    return {"url": url, "kind": content_type.split("/")[0]}


@router.get("/{file_id}")
async def get_file(file_id: str, request: Request):
    """
    Serve an upload. Uploads never change, so browsers may cache them forever.
    Supports HTTP Range requests so videos can be seeked.
    """
    oid = to_object_id(file_id, "file_id")
    info = await get_file_info(oid)
    if info is None:
        raise ApiError(404, "File not found")

    size = info["length"]
    content_type = info.get("metadata", {}).get("contentType", "application/octet-stream")
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Accept-Ranges": "bytes",
        # Images/videos are already compressed; this also makes GZipMiddleware leave
        # (partial) responses untouched, which byte ranges require.
        "Content-Encoding": "identity",
    }

    start, end = 0, size - 1
    status = 200
    match = RANGE_RE.fullmatch(request.headers.get("range", "").strip())
    if match and (match.group(1) or match.group(2)):
        if match.group(1):
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else size - 1
        else:  # "bytes=-500" = last 500 bytes
            start = max(0, size - int(match.group(2)))
        end = min(end, size - 1)
        if start > end or start >= size:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
        status = 206
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"

    stream = await bucket().open_download_stream(oid)
    await stream.seek(start)
    length = end - start + 1
    headers["Content-Length"] = str(length)

    async def body():
        remaining = length
        while remaining > 0:
            chunk = await stream.read(min(CHUNK, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk

    return StreamingResponse(body(), status_code=status, media_type=content_type, headers=headers)
