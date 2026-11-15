"""Request bodies (replaces the Joi validation files)."""

import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, model_validator

from .utils import OBJECT_ID_RE

USERNAME_RE = re.compile(r"^[0-9a-zA-Z_.-]+$")
# Loose URL check, similar to validator.isURL: optional scheme, a host with a dot, optional path.
URL_RE = re.compile(
    r"^(https?://)?(localhost|[\w-]+(\.[\w-]+)+|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#]\S*)?$",
    re.IGNORECASE,
)


def _password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("password must be at least 8 characters")
    if not re.search(r"\d", v) or not re.search(r"[a-zA-Z]", v):
        raise ValueError("password must contain at least 1 letter and 1 number")
    return v


def _username(v: str) -> str:
    if not USERNAME_RE.match(v.replace(" ", "")):
        raise ValueError('username must only contain numbers, letters, ".", "-", "_"')
    return v


def _url_or_empty(v: str) -> str:
    v = v.strip()
    if v and not URL_RE.match(v):
        raise ValueError("must be a valid url")
    return v


UPLOAD_URL_RE = re.compile(r"^/api/uploads/[0-9a-f]{24}$")


def _image_ref(v: str) -> str:
    """External image URL, or one of our uploads (/api/uploads/<id>), or '' to clear."""
    v = v.strip()
    if v and not (UPLOAD_URL_RE.match(v) or URL_RE.match(v)):
        raise ValueError("must be a valid url or an uploaded image")
    return v


def _upload_url(v: str) -> str:
    if not UPLOAD_URL_RE.match(v):
        raise ValueError("must be an uploaded image (/api/uploads/<id>)")
    return v


def _object_id(v: str) -> str:
    if not OBJECT_ID_RE.match(v):
        raise ValueError("must be a valid mongo id")
    return v


Password = Annotated[str, AfterValidator(_password)]
Username = Annotated[str, Field(min_length=3, max_length=30), AfterValidator(_username)]
Url = Annotated[str, Field(max_length=255), AfterValidator(_url_or_empty)]
ImageRef = Annotated[str, Field(max_length=255), AfterValidator(_image_ref)]
UploadUrl = Annotated[str, AfterValidator(_upload_url)]
ObjectIdStr = Annotated[str, AfterValidator(_object_id)]
Role = Literal["user", "admin"]


class _Body(BaseModel):
    # Unknown fields are rejected, like Joi did.
    model_config = ConfigDict(extra="forbid")


class RegisterIn(_Body):
    name: Annotated[str, Field(min_length=1)]
    username: Username
    email: EmailStr
    password: Password
    avatar: Url | None = None


class LoginIn(_Body):
    username: Annotated[str, Field(min_length=1)]  # username or email
    password: Annotated[str, Field(min_length=1)]


class UserCreateIn(_Body):
    name: Annotated[str, Field(min_length=1)]
    username: Username
    email: EmailStr
    password: Password
    role: Role
    avatar: Url | None = None


class UserUpdateIn(_Body):
    name: Annotated[str, Field(min_length=1)] | None = None
    username: Username | None = None
    email: EmailStr | None = None
    password: Password | None = None
    avatar: ImageRef | None = None
    role: Role | None = None  # only admins may set it (checked in the router)


class ProfileUpdateIn(_Body):
    bio: Annotated[str, Field(max_length=255)] | None = None
    location: Annotated[str, Field(max_length=255)] | None = None
    website: Url | None = None
    birthday: datetime | Literal[""] | None = None
    backgroundImage: ImageRef | None = None


PollOption = Annotated[str, Field(min_length=1, max_length=25), AfterValidator(lambda v: v.strip() or _empty())]


def _empty():
    raise ValueError("poll options can't be empty")


class PollIn(_Body):
    options: Annotated[list[PollOption], Field(min_length=2, max_length=4)]
    durationHours: Annotated[int, Field(ge=1, le=168)] = 24

    @model_validator(mode="after")
    def _unique(self):
        if len({o.lower() for o in self.options}) != len(self.options):
            raise ValueError("poll options must be different")
        return self


class EventIn(_Body):
    title: Annotated[str, Field(min_length=1, max_length=80)]
    startsAt: datetime
    location: Annotated[str, Field(max_length=80)] = ""


class TweetCreateIn(_Body):
    text: Annotated[str, Field(max_length=280)] = ""
    image: UploadUrl | None = None
    video: UploadUrl | None = None
    poll: PollIn | None = None
    event: EventIn | None = None
    replyTo: ObjectIdStr | None = None

    @model_validator(mode="after")
    def _content(self):
        if not self.text.strip() and not (self.image or self.video or self.poll or self.event):
            raise ValueError("a post needs text or an attachment")
        if sum(x is not None for x in (self.image, self.video, self.poll, self.event)) > 1:
            raise ValueError("a post can have only one attachment (image, video, poll or event)")
        return self


class VoteIn(_Body):
    option: Annotated[int, Field(ge=0, le=3)]


class ForgotPasswordIn(_Body):
    email: EmailStr


class ResetPasswordIn(_Body):
    token: Annotated[str, Field(min_length=20, max_length=200)]
    password: Password


class ConversationCreateIn(_Body):
    userId: ObjectIdStr


class MessageIn(_Body):
    text: Annotated[str, Field(max_length=1000)] = ""
    image: UploadUrl | None = None

    @model_validator(mode="after")
    def _content(self):
        if not self.text.strip() and not self.image:
            raise ValueError("a message needs text or an image")
        return self


class ListIn(_Body):
    name: Annotated[str, Field(min_length=1, max_length=25)]
    description: Annotated[str, Field(max_length=100)] = ""
    private: bool = False


class ListUpdateIn(_Body):
    name: Annotated[str, Field(min_length=1, max_length=25)] | None = None
    description: Annotated[str, Field(max_length=100)] | None = None
    private: bool | None = None


class TweetUpdateIn(_Body):
    text: Annotated[str, Field(min_length=1, max_length=280)]
