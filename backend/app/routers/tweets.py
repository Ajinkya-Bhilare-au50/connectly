import re
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Query

from ..db import get_db
from ..deps import CurrentUser, OptionalUser
from ..errors import ApiError
from ..schemas import TweetCreateIn, TweetUpdateIn, VoteIn
from ..services import get_profile_or_404, get_tweet_or_404, update_replies_count
from ..social import extract_hashtags, notify, resolve_mentions, shape_tweet, shape_tweets, unnotify
from ..uploads import delete_upload, ensure_own_upload
from ..utils import now, paginate, serialize, to_object_id

router = APIRouter(prefix="/tweets", tags=["tweets"])

Page = Annotated[int | None, Query()]


async def _page_of_tweets(
    filter_: dict, sort_by: str | None, limit: int | None, page: int | None, viewer: dict | None
) -> dict:
    docs, meta = await paginate(get_db().tweets, filter_, sort_by=sort_by or "createdAt:desc", limit=limit, page=page)
    return {"results": await shape_tweets(docs, viewer), **meta}


def _ensure_can_modify(tweet: dict, user: dict, action: str) -> None:
    if tweet["author"] != user["_id"] and user.get("role") != "admin":
        raise ApiError(403, f"You cannot {action} someone's tweet")


# Static paths ("/feed", "/like/...", "/retweet/...") come before "/{tweetId}".


@router.get("/feed")
async def get_feed(auth_user: CurrentUser, limit: Page = None, page: Page = None):
    """Tweets by the logged-in user and the people they follow (no replies), newest first."""
    profile = await get_profile_or_404(auth_user["_id"])
    authors = [auth_user["_id"], *profile.get("following", [])]
    return await _page_of_tweets(
        {"replyTo": None, "author": {"$in": authors}}, "createdAt:desc", limit, page, auth_user
    )


@router.get("/trending")
async def get_trending(viewer: OptionalUser, limit: Annotated[int, Query(ge=1, le=20)] = 5):
    """Top-level tweets with the most likes + reposts + replies."""
    pipeline = [
        {"$match": {"replyTo": None}},
        {
            "$addFields": {
                "_score": {
                    "$add": [
                        {"$size": {"$ifNull": ["$likes", []]}},
                        {"$size": {"$ifNull": ["$retweets", []]}},
                        {"$ifNull": ["$repliesCount", 0]},
                    ]
                }
            }
        },
        {"$sort": {"_score": -1, "createdAt": -1}},
        {"$limit": limit},
        {"$project": {"_score": 0}},
    ]
    docs = await (await get_db().tweets.aggregate(pipeline)).to_list()
    return {"results": await shape_tweets(docs, viewer)}


@router.get("/trends")
async def get_trends(limit: Annotated[int, Query(ge=1, le=30)] = 5):
    """'Trends for you': most used hashtags, with how many posts use each."""
    pipeline = [
        {"$match": {"hashtags.0": {"$exists": True}}},
        {"$unwind": "$hashtags"},
        {"$group": {"_id": "$hashtags", "count": {"$sum": 1}, "latest": {"$max": "$createdAt"}}},
        {"$sort": {"count": -1, "latest": -1}},
        {"$limit": limit},
    ]
    rows = await (await get_db().tweets.aggregate(pipeline)).to_list()
    return {"results": [{"tag": r["_id"], "count": r["count"]} for r in rows]}


# ---- bookmarks (private: only the owner ever sees their bookmarks)


@router.get("/bookmarks")
async def get_bookmarks(auth_user: CurrentUser, limit: Page = None, page: Page = None):
    """The logged-in user's bookmarked tweets, newest first."""
    profile = await get_profile_or_404(auth_user["_id"])
    return await _page_of_tweets(
        {"_id": {"$in": profile.get("bookmarks", [])}}, "createdAt:desc", limit, page, auth_user
    )


@router.get("/bookmarks/ids")
async def get_bookmark_ids(auth_user: CurrentUser):
    """Ids of the logged-in user's bookmarked tweets (to show the bookmark state)."""
    profile = await get_profile_or_404(auth_user["_id"])
    return {"ids": serialize(profile.get("bookmarks", []))}


@router.post("/bookmark/{tweetId}")
async def bookmark_tweet(tweetId: str, auth_user: CurrentUser):
    tweet_id = to_object_id(tweetId, "tweetId")
    await get_tweet_or_404(tweet_id)
    await get_db().profiles.update_one({"user": auth_user["_id"]}, {"$addToSet": {"bookmarks": tweet_id}})
    return {"bookmarked": True}


@router.delete("/bookmark/{tweetId}")
async def unbookmark_tweet(tweetId: str, auth_user: CurrentUser):
    tweet_id = to_object_id(tweetId, "tweetId")
    await get_db().profiles.update_one({"user": auth_user["_id"]}, {"$pull": {"bookmarks": tweet_id}})
    return {"bookmarked": False}


@router.post("/like/{tweetId}")
async def like_tweet(tweetId: str, auth_user: CurrentUser):
    return await _toggle(tweetId, auth_user, field="likes", add=True)


@router.delete("/like/{tweetId}")
async def unlike_tweet(tweetId: str, auth_user: CurrentUser):
    return await _toggle(tweetId, auth_user, field="likes", add=False)


@router.post("/retweet/{tweetId}")
async def retweet(tweetId: str, auth_user: CurrentUser):
    return await _toggle(tweetId, auth_user, field="retweets", add=True)


@router.delete("/retweet/{tweetId}")
async def unretweet(tweetId: str, auth_user: CurrentUser):
    return await _toggle(tweetId, auth_user, field="retweets", add=False)


async def _toggle(tweet_id_str: str, user: dict, *, field: str, add: bool) -> dict:
    """Like/unlike or retweet/unretweet: updates both the tweet and the user's profile atomically."""
    tweet_id = to_object_id(tweet_id_str, "tweetId")
    await get_tweet_or_404(tweet_id)
    profile = await get_profile_or_404(user["_id"])

    already = tweet_id in profile.get(field, [])
    verb = "liked" if field == "likes" else "retweeted"
    if add and already:
        raise ApiError(400, f"User already {verb} the tweet")
    if not add and not already:
        raise ApiError(400, f"User did not {verb} the tweet yet")

    op = "$addToSet" if add else "$pull"
    db = get_db()
    await db.profiles.update_one({"_id": profile["_id"]}, {op: {field: tweet_id}})
    tweet = await db.tweets.find_one_and_update({"_id": tweet_id}, {op: {field: user["_id"]}}, return_document=True)

    kind = "like" if field == "likes" else "retweet"
    if add:
        await notify(tweet["author"], user["_id"], kind, tweet_id)
    else:
        await unnotify(tweet["author"], user["_id"], kind, tweet_id)
    return {"tweet": await shape_tweet(tweet, user)}


@router.get("")
async def get_tweets(
    viewer: OptionalUser,
    author: str | None = None,
    likes: str | None = None,
    retweets: str | None = None,
    replyTo: str | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    hashtag: Annotated[str | None, Query(max_length=50)] = None,
    includeReplies: bool = False,
    hasImage: bool = False,
    hasMedia: bool = False,
    sortBy: str | None = None,
    limit: Page = None,
    page: Page = None,
):
    """
    List tweets. Filters: author, likes (user id), retweets (user id), replyTo (tweet id),
    q (text search), hashtag, hasImage, hasMedia (image or video).
    Replies are excluded unless `replyTo` or `includeReplies` is given.
    """
    db = get_db()
    filter_: dict = {}
    for field, value in (("author", author), ("likes", likes), ("retweets", retweets)):
        if value:
            oid = to_object_id(value, field)
            if await db.users.find_one({"_id": oid}, {"_id": 1}) is None:
                raise ApiError(404, "User does not exists")
            filter_[field] = oid

    if replyTo:
        reply_id = to_object_id(replyTo, "replyTo")
        if await db.tweets.find_one({"_id": reply_id}, {"_id": 1}) is None:
            raise ApiError(404, "Tweet does not exists")
        filter_["replyTo"] = reply_id
    elif not includeReplies:
        filter_["replyTo"] = None

    if hasImage:
        filter_["image"] = {"$nin": [None, ""]}
    if hasMedia:
        filter_["$or"] = [{"image": {"$nin": [None, ""]}}, {"video": {"$nin": [None, ""]}}]
    if hashtag and hashtag.strip().lstrip("#"):
        filter_["hashtags"] = hashtag.strip().lstrip("#").lower()
    if q and q.strip():
        filter_["text"] = {"$regex": re.escape(q.strip()), "$options": "i"}

    return await _page_of_tweets(filter_, sortBy, limit, page, viewer)


@router.post("", status_code=201)
async def create_tweet(body: TweetCreateIn, auth_user: CurrentUser):
    """Create a tweet (optionally with an image, video, poll or event), or a reply when `replyTo` is set."""
    db = get_db()
    me = auth_user["_id"]
    parent = None
    if body.replyTo:
        parent = await get_tweet_or_404(to_object_id(body.replyTo, "replyTo"))
    if body.image:
        await ensure_own_upload(body.image, me, "image")
    if body.video:
        await ensure_own_upload(body.video, me, "video")

    ts = now()
    tweet = {
        "author": me,
        "text": body.text,
        "image": body.image,
        "video": body.video,
        "replyTo": parent["_id"] if parent else None,
        "hashtags": extract_hashtags(body.text),
        "mentions": await resolve_mentions(body.text),
        "repliesCount": 0,
        "edited": False,
        "likes": [],
        "retweets": [],
        "createdAt": ts,
        "updatedAt": ts,
    }
    if body.poll:
        tweet["poll"] = {
            "options": [{"text": text, "votes": []} for text in body.poll.options],
            "endsAt": ts + timedelta(hours=body.poll.durationHours),
        }
    if body.event:
        tweet["event"] = body.event.model_dump()

    tweet["_id"] = (await db.tweets.insert_one(tweet)).inserted_id

    if parent:
        await update_replies_count(parent["_id"])
        await notify(parent["author"], me, "reply", tweet["_id"])
    for user_id in tweet["mentions"]:
        if not parent or user_id != parent["author"]:
            await notify(user_id, me, "mention", tweet["_id"])

    return {"tweet": await shape_tweet(tweet, auth_user)}


@router.get("/{tweetId}")
async def get_tweet(tweetId: str, viewer: OptionalUser):
    tweet = await get_tweet_or_404(to_object_id(tweetId, "tweetId"))
    return {"tweet": await shape_tweet(tweet, viewer)}


@router.post("/{tweetId}/vote")
async def vote(tweetId: str, body: VoteIn, auth_user: CurrentUser):
    """Vote in a tweet's poll. One vote per person; votes are anonymous."""
    tweet_id = to_object_id(tweetId, "tweetId")
    tweet = await get_tweet_or_404(tweet_id)
    poll = tweet.get("poll")
    if not poll:
        raise ApiError(400, "This tweet has no poll")
    if body.option >= len(poll["options"]):
        raise ApiError(400, "Invalid poll option")
    if poll["endsAt"] <= now():
        raise ApiError(400, "This poll has ended")

    me = auth_user["_id"]
    # Atomic: only succeeds if this user hasn't voted on any option yet.
    result = await get_db().tweets.update_one(
        {"_id": tweet_id, "poll.options.votes": {"$ne": me}},
        {"$addToSet": {f"poll.options.{body.option}.votes": me}},
    )
    if result.modified_count == 0:
        raise ApiError(400, "You already voted in this poll")
    return {"tweet": await shape_tweet(await get_tweet_or_404(tweet_id), auth_user)}


@router.patch("/{tweetId}")
async def update_tweet(tweetId: str, body: TweetUpdateIn, auth_user: CurrentUser):
    """Edit a tweet's text (author or admin)."""
    tweet_id = to_object_id(tweetId, "tweetId")
    tweet = await get_tweet_or_404(tweet_id)
    _ensure_can_modify(tweet, auth_user, "update")

    tweet = await get_db().tweets.find_one_and_update(
        {"_id": tweet_id},
        {
            "$set": {
                "text": body.text,
                "hashtags": extract_hashtags(body.text),
                "mentions": await resolve_mentions(body.text),
                "edited": True,
                "updatedAt": now(),
            }
        },
        return_document=True,
    )
    return {"tweet": await shape_tweet(tweet, auth_user)}


@router.delete("/{tweetId}")
async def delete_tweet(tweetId: str, auth_user: CurrentUser):
    """Delete a tweet (author or admin)."""
    tweet_id = to_object_id(tweetId, "tweetId")
    tweet = await get_tweet_or_404(tweet_id)
    _ensure_can_modify(tweet, auth_user, "delete")

    db = get_db()
    await db.tweets.delete_one({"_id": tweet_id})
    await db.profiles.update_many({}, {"$pull": {"likes": tweet_id, "retweets": tweet_id, "bookmarks": tweet_id}})
    await db.notifications.delete_many({"tweet": tweet_id})
    await delete_upload(tweet.get("image"))
    await delete_upload(tweet.get("video"))
    await update_replies_count(tweet.get("replyTo"))
    return {"tweet": await shape_tweet(tweet, auth_user)}
