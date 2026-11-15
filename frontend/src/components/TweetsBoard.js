'use client';

import { Fragment, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RiQuillPenLine } from 'react-icons/ri';
import { useIntersectionObserver } from '@/hooks';
import { fullTime, shortTime } from '@/lib/format';
import { errorMessage } from '@/lib/api';
import { useRemoveTweet } from '@/lib/queries';
import { media } from '@/lib/theme';
import { ConfirmDialog } from './Modal';
import { ActionBar, EventCard, PollView, PostMedia, PostMenu, RichText } from './PostParts';
import { Avatar, Button, Card, EmptyState, ErrorState, SkeletonList, Spinner } from './ui';

// Re-exported for older imports.
export { PostImage, useShareTweet, useTweetActions } from './PostParts';

const Article = styled(Card).attrs({ as: 'article' })`
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--border-strong);
  }

  ${media.mobile} {
    padding: 12px 16px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Meta = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;

  .line {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    column-gap: 6px;
    min-width: 0;
    line-height: 1.35;
    color: var(--text-muted);
    font-size: 13px;
  }

  .name {
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a:hover .name,
  time:hover {
    text-decoration: underline;
  }
`;

const Text = styled.p`
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const ReplyingTo = styled.p`
  font-size: 12px;
  color: var(--text-muted);
`;

/** One post as a card. Clicking opens it (as a modal when inside the app). */
export function TweetCard({ tweet, queryKey }) {
  const router = useRouter();
  const removeTweet = useRemoveTweet(queryKey);
  const [confirming, setConfirming] = useState(false);

  const { author } = tweet; // null when the author deleted their account
  const href = author ? `/${author._id}/status/${tweet._id}` : null;
  const profileHref = author ? `/profile/${author._id}` : null;

  // Clicking anywhere on the card opens the post, unless text is being selected.
  const open = () => {
    if (href && !window.getSelection()?.toString()) router.push(href);
  };
  const stop = (e) => e.stopPropagation();

  return (
    <Article onClick={open} aria-label={`Post by ${author?.name || 'a deleted account'}`}>
      {profileHref ? (
        <Link href={profileHref} onClick={stop} aria-label={`${author.name}'s profile`}>
          <Avatar src={author.avatar} name={author.name} $size={44} />
        </Link>
      ) : (
        <Avatar $size={44} />
      )}
      <Body>
        <Meta>
          <div className="line">
            {profileHref ? (
              <Link href={profileHref} onClick={stop} className="name">
                {author.name}
              </Link>
            ) : (
              <span className="name">Deleted account</span>
            )}
            {author && <span>@{author.username}</span>}
            <span aria-hidden>·</span>
            <time dateTime={tweet.createdAt} title={fullTime(tweet.createdAt)}>
              {shortTime(tweet.createdAt)}
            </time>
            {tweet.edited && <span>· Edited</span>}
          </div>
          <PostMenu tweet={tweet} onDelete={() => setConfirming(true)} />
        </Meta>
        {tweet.replyTo && <ReplyingTo>Replying to a post</ReplyingTo>}
        {tweet.text && (
          <Text>
            <RichText text={tweet.text} />
          </Text>
        )}
        <PostMedia tweet={tweet} />
        {tweet.poll && <PollView tweet={tweet} queryKey={queryKey} />}
        {tweet.event && <EventCard tweet={tweet} />}
        <ActionBar tweet={tweet} queryKey={queryKey} onComment={open} />
      </Body>

      {confirming && (
        <div onClick={stop}>
          <ConfirmDialog
            title="Delete post?"
            message="This can't be undone. It will be removed from your profile and everyone's feed."
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              removeTweet.mutate(tweet._id);
            }}
          />
        </div>
      )}
    </Article>
  );
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  ${media.mobile} {
    gap: 8px;
  }
`;

/**
 * Infinite list of posts. Pass the result of a tweets query (`useTweets()`, `useFeedTweets()`, …) as `query`.
 * Shows skeletons while loading, an empty state, and an error state with retry.
 */
export default function TweetsBoard({ query, emptyTitle = 'Nothing to see here yet', emptyText, emptyAction, emptyIcon = RiQuillPenLine }) {
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError, refetch, queryKey } = query;
  const sentinelRef = useRef(null);

  useIntersectionObserver({ target: sentinelRef, onIntersect: fetchNextPage, enabled: !!hasNextPage && !isFetchNextPageError, threshold: 0 });

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (isPending) return <SkeletonList rows={4} avatar={44} />;

  const pages = data?.pages ?? [];
  const count = pages.reduce((acc, page) => acc + page.results.length, 0);
  if (count === 0) {
    return (
      <EmptyState title={emptyTitle} icon={emptyIcon} action={emptyAction}>
        {emptyText}
      </EmptyState>
    );
  }

  return (
    <List>
      {pages.map((page, i) => (
        <Fragment key={i}>
          {page.results.map((tweet) => (
            <TweetCard key={tweet._id} tweet={tweet} queryKey={queryKey} />
          ))}
        </Fragment>
      ))}
      <div ref={sentinelRef} />
      {isFetchingNextPage && <Spinner />}
      {isFetchNextPageError && (
        <div style={{ textAlign: 'center' }}>
          <Button $variant="secondary" onClick={() => fetchNextPage()}>
            Couldn&apos;t load more — retry
          </Button>
        </div>
      )}
    </List>
  );
}
