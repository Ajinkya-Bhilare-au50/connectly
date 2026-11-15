from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from .config import get_settings

ALGORITHM = "HS256"


def _pw_bytes(password: str) -> bytes:
    # bcryptjs (used by the old Node server) silently truncates to 72 bytes; do the same
    # so passwords created there keep working and long ones don't raise.
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt(rounds=10)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_pw_bytes(password), hashed.encode())
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(seconds=settings.jwt_expires)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
