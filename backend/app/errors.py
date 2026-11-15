import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app")


class ApiError(Exception):
    """Raise anywhere to return `{"message": ...}` with the given status code."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _format_validation_error(exc: RequestValidationError) -> str:
    messages = []
    for err in exc.errors():
        # loc looks like ("body", "password") or ("query", "limit")
        field = ".".join(str(p) for p in err.get("loc", ())[1:]) or "request"
        msg = err.get("msg", "is invalid")
        if msg.startswith("Value error, "):
            msg = msg.removeprefix("Value error, ")
        if err.get("type") == "extra_forbidden":
            msg = "is not allowed"
        if field == "request" or msg.startswith(field):
            messages.append(msg)  # whole-body errors (e.g. "a post needs text or an image")
        else:
            messages.append(f'"{field}" {msg}')
    return ", ".join(messages)


def register_error_handlers(app: FastAPI) -> None:
    """Keep the old Express error format: `{ "message": "..." }` and 400 for bad input."""

    @app.exception_handler(ApiError)
    async def api_error_handler(_: Request, exc: ApiError):
        return JSONResponse(status_code=exc.status_code, content={"message": exc.message})

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=400, content={"message": _format_validation_error(exc)})

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException):
        message = exc.detail if isinstance(exc.detail, str) else "Error"
        if exc.status_code == 404 and message == "Not Found":
            message = f"Route {request.url.path} Not Found"
        return JSONResponse(status_code=exc.status_code, content={"message": message}, headers=exc.headers)

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception):
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(status_code=500, content={"message": "Internal Server Error"})
