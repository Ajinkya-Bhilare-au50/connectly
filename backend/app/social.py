"""Hashtags & mentions, notifications, and how tweets are shaped for a given viewer."""

import re

from bson import ObjectId

from .db import get_db
from .utils import PUBLIC_USER_FIELDS, now, populate, serialize

HASHTAG_RE = re.compile(r"(?<![\w#])#(\w{1,50})", re.UNICODE)
MENTION_RE = re.compile(r"(?<![\w@])@([A-Za-z0-9_.-]{1,30})")


def extract_hashtags(text: str) -> list[str]:
    """'#NextJS and #nextjs' -> ['nextjs'] (lowercase, unique, in order)."""
    seen: list[str] = []
    for tag in HASHTAG_RE.findall(text or ""):
        tag = tag.lower()
        if tag not in seen and not tag.isdigit():
            seen.append(tag)
    return seen[:10]


async def resolve_mentions(text: str) -> list[ObjectId]:
    names = {m.lower().rstrip(".") for m in MENTION_RE.findall(text or "")}
    if not names:
        return []
    users = get_db().users.find({"username": {"$in": list(names)}}, {"_id": 1})
    return [u["_id"] async for u in users]


# ------------------------------------------------------------------ notifications

NOTIFICATION_TYPES = ("like", "retweet", "follow", "reply", "mention")


async def notify(recipient: ObjectId | None, actor: ObjectId, type_: str, tweet: ObjectId | None = None) -> None:
    """Create (or refresh) a notification. Nobody is notified about their own actions."""
    if recipient is None or recipient == actor:
        return
    await get_db().notifications.update_one(
        {"user": recipient, "actor": actor, "type": type_, "tweet": tweet},
        {"$set": {"read": False, "createdAt": now()}},
        upsert=True,
    )


async def unnotify(recipient: ObjectId | None, actor: ObjectId, type_: str, tweet: ObjectId | None = None) -> None:
    """Undo a notification (e.g. after an unlike or unfollow)."""
    if recipient is None:
        return
    await get_db().notifications.delete_one({"user": recipient, "actor": actor, "type": type_, "tweet": tweet})


# ------------------------------------------------------------------ tweets as seen by a viewer


def _shape_poll(poll: dict, viewer_id: ObjectId | None) -> dict:
    """Never expose who voted: only counts, plus which option the viewer picked."""
    options, my_vote = [], None
    for i, option in enumerate(poll.get("options", [])):
        votes = option.get("votes", [])
        if viewer_id is not None and viewer_id in votes:
            my_vote = i
        options.append({"text": option["text"], "votes": len(votes)})
    ends_at = poll.get("endsAt")
    return {
        "options": options,
        "totalVotes": sum(o["votes"] for o in options),
        "endsAt": ends_at,
        "closed": bool(ends_at and ends_at <= now()),
        "myVote": my_vote,
    }


async def shape_tweets(docs: list[dict], viewer: dict | None) -> list:
    """Populate authors and turn raw tweet documents into API output for `viewer`."""
    await populate(docs, "author", get_db().users, PUBLIC_USER_FIELDS)
    viewer_id = viewer["_id"] if viewer else None
    for doc in docs:
        if doc.get("poll"):
            doc["poll"] = _shape_poll(doc["poll"], viewer_id)
        doc.pop("mentions", None)
    return serialize(docs)


async def shape_tweet(doc: dict, viewer: dict | None) -> dict:
    return (await shape_tweets([doc], viewer))[0]


# ------------------------------------------------------------------ one-off data upgrades


async def backfill_hashtags() -> None:
    """Older tweets were saved before hashtags were extracted: add them once."""
    db = get_db()
    async for tweet in db.tweets.find({"hashtags": {"$exists": False}}, {"text": 1}):
        await db.tweets.update_one({"_id": tweet["_id"]}, {"$set": {"hashtags": extract_hashtags(tweet.get("text", ""))}})
