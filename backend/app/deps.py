from typing import Annotated

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import get_db
from .errors import ApiError
from .security import decode_access_token

ROLES = ("user", "admin")
ROLE_RIGHTS: dict[str, set[str]] = {
    "user": set(),
    "admin": {"getUsers", "manageUsers"},
}

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict:
    if creds is None:
        raise ApiError(401, "You are not authenticated")
    try:
        payload = decode_access_token(creds.credentials)
        user_id = ObjectId(payload["sub"])
    except (jwt.PyJWTError, KeyError, InvalidId, TypeError):
        raise ApiError(401, "You are not authenticated")

    user = await get_db().users.find_one({"_id": user_id})
    if user is None:
        raise ApiError(401, "You are not authenticated")
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]


async def get_optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict | None:
    """The logged-in user if a valid token was sent, else None (for public endpoints)."""
    if creds is None:
        return None
    try:
        return await get_current_user(creds)
    except ApiError:
        return None


OptionalUser = Annotated[dict | None, Depends(get_optional_user)]


def require_rights(*rights: str):
    """
    Logged-in user must have every right in `rights`, OR be acting on their own
    account (the `userId` path parameter equals their id) - same rule as the old server.
    """

    async def dependency(request: Request, user: CurrentUser) -> dict:
        if rights:
            user_rights = ROLE_RIGHTS.get(user.get("role", "user"), set())
            is_owner = request.path_params.get("userId") == str(user["_id"])
            if not set(rights).issubset(user_rights) and not is_owner:
                raise ApiError(403, "You are not authorized")
        return user

    return dependency
