'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiCalendarEventLine,
  RiChat3Line,
  RiCheckboxCircleFill,
  RiDeleteBin6Line,
  RiDownloadLine,
  RiEdit2Line,
  RiHeart3Fill,
  RiHeart3Line,
  RiLinksLine,
  RiMapPinLine,
  RiMore2Fill,
  RiRepeat2Line,
  RiUpload2Line,
} from 'react-icons/ri';
import { useUser } from '@/context/UserContext';
import { useAlert } from '@/context/AlertContext';
import { compactNumber } from '@/lib/format';
import { mediaUrl } from '@/lib/uploads';
import { errorMessage } from '@/lib/api';
import {
  useBookmarkIds,
  useEditTweet,
  useToggleBookmark,
  useTweetLike,
  useTweetRetweet,
  useTweetUnlike,
  useTweetUnretweet,
  useVote,
} from '@/lib/queries';
import { MenuItem, MenuPanel, usePopover } from './AccountMenu';
import Modal from './Modal';
import { Button, FeedbackMessage, IconButton, Textarea } from './ui';

// ------------------------------------------------------------------ rich text

const TOKEN_RE = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(?<![\w#])#(\w{1,50})|(?<![\w@])@([A-Za-z0-9_.-]{1,30})/gu;

const TextLink = styled(Link)`
  color: var(--primary);

  &:hover {
    text-decoration: underline;
  }
`;

/** Post text with clickable #hashtags, @mentions and web links. */
export function RichText({ text }) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [whole, url, tag, mention] = match;
    const stop = (e) => e.stopPropagation();
    if (url) {
      parts.push(
        <TextLink key={match.index} href={url} target="_blank" rel="noopener noreferrer nofollow" onClick={stop}>
          {url.replace(/^https?:\/\//, '').slice(0, 40)}
          {url.replace(/^https?:\/\//, '').length > 40 ? '…' : ''}
        </TextLink>
      );
    } else if (tag) {
      parts.push(
        <TextLink key={match.index} href={`/explore?hashtag=${encodeURIComponent(tag.toLowerCase())}`} onClick={stop}>
          {whole}
        </TextLink>
      );
    } else if (mention) {
      parts.push(
        <TextLink key={match.index} href={`/u/${encodeURIComponent(mention.replace(/\.$/, ''))}`} onClick={stop}>
          {whole}
        </TextLink>
      );
    }
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => (typeof p === 'string' ? <Fragment key={`t${i}`}>{p}</Fragment> : p))}</>;
}

// ------------------------------------------------------------------ media

export const PostImage = styled.img.attrs(({ src }) => ({ src: mediaUrl(src), loading: 'lazy', decoding: 'async' }))`
  display: block;
  width: 100%;
  max-height: ${({ $tall }) => ($tall ? '640px' : '480px')};
  margin-top: 12px;
  object-fit: cover;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-subtle);
`;

const Video = styled.video`
  display: block;
  width: 100%;
  max-height: 520px;
  margin-top: 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: #000;
`;

/** Image or video attached to a post. Videos never autoplay with sound. */
export function PostMedia({ tweet, tall = false }) {
  const stop = (e) => e.stopPropagation();
  if (tweet.video) {
    return (
      <Video
        src={mediaUrl(tweet.video)}
        controls
        playsInline
        preload="metadata"
        onClick={stop}
        aria-label={tweet.text ? `Video: ${tweet.text.slice(0, 80)}` : 'Video'}
      />
    );
  }
  if (tweet.image) {
    const img = <PostImage src={tweet.image} alt={tweet.text ? `Image: ${tweet.text.slice(0, 80)}` : 'Image'} $tall={tall} />;
    return tall ? (
      <a href={mediaUrl(tweet.image)} target="_blank" rel="noopener noreferrer" title="Open full image" onClick={stop}>
        {img}
      </a>
    ) : (
      img
    );
  }
  return null;
}

// ------------------------------------------------------------------ poll

const PollBox = styled.div`
  margin-top: 12px;
  display: grid;
  gap: 8px;

  .meta {
    font-size: 12px;
    color: var(--text-muted);
  }
`;

const PollChoice = styled.button`
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--primary);
  border-radius: var(--radius-md);
  background: none;
  color: var(--primary);
  font-weight: 600;
  text-align: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--primary-soft);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;

const PollResult = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  overflow: hidden;

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: ${({ $mine, $winner }) => ($mine || $winner ? 'var(--primary-100)' : 'var(--bg-subtle)')};
    border-radius: var(--radius-md);
  }

  span {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: ${({ $winner }) => ($winner ? 700 : 500)};
  }

  svg {
    color: var(--primary);
  }
`;

function timeLeft(endsAt) {
  return `${formatDistanceToNowStrict(new Date(endsAt))} left`;
}

/** Vote (once), then see results. Shows a check next to your choice (not color alone). */
export function PollView({ tweet, queryKey }) {
  const user = useUser();
  const router = useRouter();
  const vote = useVote(queryKey);
  const { poll } = tweet;
  const showResults = poll.closed || poll.myVote !== null || !user;
  const max = Math.max(...poll.options.map((o) => o.votes));
  const stop = (e) => e.stopPropagation();

  return (
    <PollBox onClick={stop} role="group" aria-label="Poll">
      {poll.options.map((option, i) => {
        if (!showResults) {
          return (
            <PollChoice
              key={i}
              disabled={vote.isPending}
              onClick={() => (user ? vote.mutate({ tweetId: tweet._id, option: i }) : router.push('/signin'))}
            >
              {option.text}
            </PollChoice>
          );
        }
        const pct = poll.totalVotes ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
        const mine = poll.myVote === i;
        return (
          <PollResult key={i} $mine={mine} $winner={poll.closed && option.votes === max && max > 0}>
            <div className="fill" style={{ width: `${pct}%` }} />
            <span>
              {option.text}
              {mine && <RiCheckboxCircleFill aria-label="(your vote)" />}
            </span>
            <span>{pct}%</span>
          </PollResult>
        );
      })}
      <span className="meta">
        {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} · {poll.closed ? 'Final results' : timeLeft(poll.endsAt)}
        {!user && !poll.closed && ' · Sign in to vote'}
      </span>
    </PollBox>
  );
}

// ------------------------------------------------------------------ event

const EventBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--primary-soft);

  .date {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    background: var(--bg);
    border: 1px solid var(--border);
    line-height: 1.1;

    small {
      font-size: 11px;
      font-weight: 600;
      color: var(--danger);
      text-transform: uppercase;
    }

    strong {
      font-size: 20px;
    }
  }

  .info {
    flex: 1 1 180px;
    min-width: 0;
  }

  /* Narrow screens: the calendar button moves onto its own row. */
  > button {
    flex: 0 0 auto;
  }

  @media (max-width: 639px) {
    > button {
      flex: 1 1 100%;
    }
  }

  h3 {
    font-size: 15px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  p {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
  }
`;

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(text) {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

/** Builds a standard .ics file so the event can be added to any calendar app. */
function downloadIcs(tweet) {
  const { event } = tweet;
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Connectly//Events//EN',
    'BEGIN:VEVENT',
    `UID:${tweet._id}@connectly`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
    `URL:${window.location.origin}/${tweet.author?._id}/status/${tweet._id}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^\w-]+/g, '-').slice(0, 40) || 'event'}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function EventCard({ tweet }) {
  const start = new Date(tweet.event.startsAt);
  const past = start < new Date();
  return (
    <EventBox onClick={(e) => e.stopPropagation()}>
      <div className="date" aria-hidden>
        <small>{format(start, 'MMM')}</small>
        <strong>{format(start, 'd')}</strong>
      </div>
      <div className="info">
        <h3>{tweet.event.title}</h3>
        <p>
          <RiCalendarEventLine aria-hidden /> {format(start, "EEE, MMM d, yyyy 'at' h:mm a")}
          {past && ' · Ended'}
        </p>
        {tweet.event.location && (
          <p>
            <RiMapPinLine aria-hidden /> {tweet.event.location}
          </p>
        )}
      </div>
      {!past && (
        <Button type="button" $variant="secondary" $size="sm" onClick={() => downloadIcs(tweet)} title="Download an .ics file">
          <RiDownloadLine aria-hidden /> Add to calendar
        </Button>
      )}
    </EventBox>
  );
}

// ------------------------------------------------------------------ actions

/** Copy a post's link and confirm with a toast. */
export function useShareTweet() {
  const { setAlert } = useAlert();
  return async (path) => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setAlert({ type: 'success', msg: 'Link copied to clipboard' });
    } catch {
      window.prompt('Copy this link:', url);
    }
  };
}

/** Like / repost / bookmark with optimistic updates (reverted on failure). */
export function useTweetActions(tweet, queryKey) {
  const user = useUser();
  const router = useRouter();
  const like = useTweetLike(queryKey);
  const unlike = useTweetUnlike(queryKey);
  const repost = useTweetRetweet(queryKey);
  const unrepost = useTweetUnretweet(queryKey);
  const bookmarks = useBookmarkIds();
  const toggleBookmark = useToggleBookmark();

  const liked = !!(user && tweet.likes.includes(user._id));
  const reposted = !!(user && tweet.retweets?.includes(user._id));
  const bookmarked = bookmarks.has(tweet._id);

  const run = (fn) => (e) => {
    e?.stopPropagation();
    if (!user) return router.push('/signin');
    if (!tweet.author) return;
    fn();
  };

  return {
    liked,
    reposted,
    bookmarked,
    toggleLike: run(() => (liked ? unlike : like).mutate(tweet._id)),
    toggleRepost: run(() => (reposted ? unrepost : repost).mutate(tweet._id)),
    toggleBookmark: run(() => toggleBookmark.mutate({ tweetId: tweet._id, add: !bookmarked })),
  };
}

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  max-width: 520px;
  margin: 8px 0 -6px -8px;

  button span:last-child:not(.icon) {
    min-width: 18px;
    text-align: left;
  }
`;

/** Comment · Repost · Like · Bookmark · Share */
export function ActionBar({ tweet, queryKey, onComment, showCounts = true }) {
  const share = useShareTweet();
  const { liked, reposted, bookmarked, toggleLike, toggleRepost, toggleBookmark } = useTweetActions(tweet, queryKey);
  const href = tweet.author ? `/${tweet.author._id}/status/${tweet._id}` : null;
  const stop = (e) => e.stopPropagation();

  return (
    <ActionRow>
      <IconButton $tone="primary" onClick={(e) => (stop(e), onComment?.())} disabled={!href} aria-label={`Comment (${tweet.repliesCount})`}>
        <span className="icon">
          <RiChat3Line />
        </span>
        {showCounts && <span>{compactNumber(tweet.repliesCount)}</span>}
      </IconButton>
      <IconButton
        $tone="repost"
        $active={reposted}
        onClick={toggleRepost}
        disabled={!href}
        aria-label={reposted ? 'Undo repost' : 'Repost'}
        aria-pressed={reposted}
      >
        <span className="icon">
          <RiRepeat2Line />
        </span>
        {showCounts && <span>{compactNumber(tweet.retweets?.length)}</span>}
      </IconButton>
      <IconButton
        $tone="like"
        $active={liked}
        onClick={toggleLike}
        disabled={!href}
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
      >
        <span className="icon">{liked ? <RiHeart3Fill /> : <RiHeart3Line />}</span>
        {showCounts && <span>{compactNumber(tweet.likes.length)}</span>}
      </IconButton>
      <IconButton
        $tone="primary"
        $active={bookmarked}
        onClick={toggleBookmark}
        disabled={!href}
        aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
        aria-pressed={bookmarked}
      >
        <span className="icon">{bookmarked ? <RiBookmarkFill /> : <RiBookmarkLine />}</span>
      </IconButton>
      <IconButton $tone="primary" onClick={(e) => (stop(e), href && share(href))} disabled={!href} aria-label="Share">
        <span className="icon">
          <RiUpload2Line />
        </span>
      </IconButton>
    </ActionRow>
  );
}

// ------------------------------------------------------------------ ⋯ menu + edit

function EditDialog({ tweet, onClose }) {
  const edit = useEditTweet();
  const { setAlert } = useAlert();
  const [text, setText] = useState(tweet.text);
  const valid = text.trim().length > 0 && text.length <= 280;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Modal label="Edit post" title="Edit post" maxWidth={560} onDismiss={onClose}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            edit.mutate(
              { tweetId: tweet._id, text },
              {
                onSuccess: () => {
                  setAlert({ type: 'success', msg: 'Post updated.' });
                  onClose();
                },
              }
            );
          }}
        >
          <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={280} aria-label="Post text" autoFocus />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>{280 - text.length} characters left</span>
            {edit.isError && <FeedbackMessage>{errorMessage(edit.error)}</FeedbackMessage>}
            <Button type="button" $variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" $variant="primary" disabled={!valid || edit.isPending}>
              {edit.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** The ⋯ menu: bookmark, copy link, and edit/delete for your own posts. */
export function PostMenu({ tweet, onDelete }) {
  const user = useUser();
  const share = useShareTweet();
  const { bookmarked, toggleBookmark } = useTweetActions(tweet, null);
  const { open, toggle, close, wrapRef, triggerRef } = usePopover();
  const [editing, setEditing] = useState(false);
  const isOwner = !!(user && tweet.author && user._id === tweet.author._id);
  const href = tweet.author ? `/${tweet.author._id}/status/${tweet._id}` : null;

  const choose = (fn) => (e) => {
    e.stopPropagation();
    close();
    fn(e);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
      <IconButton ref={triggerRef} $tone="primary" aria-label="More options" aria-haspopup="menu" aria-expanded={open} onClick={toggle} style={{ marginRight: -8, marginTop: -6 }}>
        <span className="icon">
          <RiMore2Fill />
        </span>
      </IconButton>
      {open && (
        <MenuPanel role="menu" $placement="down">
          <MenuItem role="menuitem" onClick={choose(toggleBookmark)}>
            {bookmarked ? <RiBookmarkFill aria-hidden /> : <RiBookmarkLine aria-hidden />}
            {bookmarked ? 'Remove from Bookmarks' : 'Bookmark'}
          </MenuItem>
          {href && (
            <MenuItem role="menuitem" onClick={choose(() => share(href))}>
              <RiLinksLine aria-hidden /> Copy link
            </MenuItem>
          )}
          {isOwner && tweet.text && (
            <MenuItem role="menuitem" onClick={choose(() => setEditing(true))}>
              <RiEdit2Line aria-hidden /> Edit
            </MenuItem>
          )}
          {isOwner && (
            <MenuItem role="menuitem" $danger onClick={choose(onDelete)}>
              <RiDeleteBin6Line aria-hidden /> Delete
            </MenuItem>
          )}
        </MenuPanel>
      )}
      {editing && <EditDialog tweet={tweet} onClose={() => setEditing(false)} />}
    </div>
  );
}
