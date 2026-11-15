import hashlib
import logging
import secrets
from datetime import timedelta

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter

from ..config import get_settings
from ..db import get_db
from ..errors import ApiError
from ..schemas import ForgotPasswordIn, LoginIn, RegisterIn, ResetPasswordIn
from ..security import create_access_token, hash_password, verify_password
from ..services import create_user_with_profile, format_username
from ..utils import now, serialize

logger = logging.getLogger("app")

router = APIRouter(prefix="/auth", tags=["auth"])


def _looks_like_email(value: str) -> bool:
    try:
        validate_email(value, check_deliverability=False)
        return True
    except EmailNotValidError:
        return False


@router.post("/register", status_code=201)
async def register(body: RegisterIn):
    """Register user and return a JWT."""
    user = await create_user_with_profile(body.model_dump())
    token = create_access_token(str(user["_id"]))
    return {"user": serialize(user), "token": token}


@router.post("/login")
async def login(body: LoginIn):
    """Login with username or email. Returns a JWT."""
    if _looks_like_email(body.username):
        query = {"email": body.username.strip().lower()}
    else:
        query = {"username": format_username(body.username)}

    user = await get_db().users.find_one(query)
    if user is None or not verify_password(body.password, user["password"]):
        raise ApiError(400, "Invalid login credentials")

    return {"user": serialize(user), "token": create_access_token(str(user["_id"]))}


RESET_TTL = timedelta(minutes=30)
RESET_MESSAGE = "If an account exists for that email, we've sent a link to reset your password."


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordIn):
    """
    Start password recovery. Always answers the same way, so it can't be used to find out
    which emails have accounts. The link expires after 30 minutes and works once.

    No email service is configured yet: the link is written to the server log, and in
    development it is also returned as `devResetUrl`.
    """
    settings = get_settings()
    db = get_db()
    response: dict = {"message": RESET_MESSAGE}

    user = await db.users.find_one({"email": body.email.strip().lower()}, {"_id": 1})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_resets.delete_many({"user": user["_id"]})  # only the newest link works
        await db.password_resets.insert_one(
            {"user": user["_id"], "tokenHash": _hash_token(token), "expiresAt": now() + RESET_TTL, "createdAt": now()}
        )
        url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
        logger.info("Password reset link for user %s: %s", user["_id"], url)
        if settings.is_dev_or_test:
            response["devResetUrl"] = url
    return response


@router.post("/reset-password")
async def reset_password(body: ResetPasswordIn):
    """Set a new password with a reset token. The token is consumed even if it was the last step."""
    db = get_db()
    record = await db.password_resets.find_one_and_delete(
        {"tokenHash": _hash_token(body.token), "expiresAt": {"$gt": now()}}
    )
    if record is None:
        raise ApiError(400, "This reset link is invalid or has expired. Please request a new one.")

    await db.users.update_one(
        {"_id": record["user"]}, {"$set": {"password": hash_password(body.password), "updatedAt": now()}}
    )
    return {"message": "Your password has been reset. You can sign in now."}
