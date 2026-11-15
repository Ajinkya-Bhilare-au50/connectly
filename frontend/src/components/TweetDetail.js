'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RiChat3Line } from 'react-icons/ri';
import { useUser } from '@/context/UserContext';
import { fullTime } from '@/lib/format';
import { errorMessage } from '@/lib/api';
import { useRemoveTweet, useTweet, useTweets } from '@/lib/queries';
import { media } from '@/lib/theme';
import Composer from './Composer';
import { ConfirmDialog } from './Modal';
import { ActionBar, EventCard, PollView, PostMedia, PostMenu, RichText } from './PostParts';
import TweetsBoard from './TweetsBoard';
import { Avatar, Button, Card, ErrorState, SkeletonList } from './ui';

const Main = styled(Card)`
  padding: 20px 24px 12px;

  ${({ $flat }) => $flat && 'border: none; box-shadow: none; padding: 4px 4px 8px;'}

  ${media.mobile} {
    padding: 16px;
    border-radius: 0;
  }
`;

const Author = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .who {
    flex: 1;
    min-width: 0;
    line-height: 1.35;
  }

  a:hover strong {
    text-decoration: underline;
  }

  strong {
    font-weight: 600;
  }

  span {
    display: block;
    font-size: 13px;
    color: var(--text-muted);
  }
`;

const Text = styled.p`
  margin-top: 14px;
  font-size: 17px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Time = styled.p`
  padding: 14px 0;
  font-size: 13px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
`;

const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);

  strong {
    color: var(--text);
  }
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
`;

const Prompt = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  color: var(--text-muted);
`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** A single post with its replies. Used by the post page and the post modal. */
export default function TweetDetail({ tweetId, flat = false }) {
  const user = useUser();
  const { isPending, data, error, refetch } = useTweet(tweetId);
  const replies = useTweets({ replyTo: tweetId });

  if (error) {
    return error.response?.status === 404 ? (
      <ErrorState message="This post doesn't exist anymore. It may have been deleted." />
    ) : (
      <ErrorState message={errorMessage(error)} onRetry={refetch} />
    );
  }
  if (isPending) return <SkeletonList rows={2} avatar={48} />;

  return <Detail tweet={data.tweet} replies={replies} user={user} flat={flat} />;
}

function Detail({ tweet, replies, user, flat }) {
  const router = useRouter();
  const queryKey = ['tweets', tweet._id];
  const removeTweet = useRemoveTweet(queryKey);
  const [confirming, setConfirming] = useState(false);
  const { author } = tweet;
  const reposts = tweet.retweets?.length ?? 0;
  const focusReply = () => document.querySelector('textarea[aria-label="Reply"]')?.focus();

  return (
    <>
      <Main $flat={flat}>
        <Author>
          {author ? (
            <>
              <Link href={`/profile/${author._id}`}>
                <Avatar src={author.avatar} alt={`${author.name}'s avatar`} $size={48} />
              </Link>
              <div className="who">
                <Link href={`/profile/${author._id}`}>
                  <strong>{author.name}</strong>
                </Link>
                <span>@{author.username}</span>
              </div>
            </>
          ) : (
            <>
              <Avatar $size={48} />
              <div className="who">
                <strong>Deleted account</strong>
              </div>
            </>
          )}
          <PostMenu tweet={tweet} onDelete={() => setConfirming(true)} />
        </Author>

        {tweet.text && (
          <Text>
            <RichText text={tweet.text} />
          </Text>
        )}
        <PostMedia tweet={tweet} tall />
        {tweet.poll && <PollView tweet={tweet} queryKey={queryKey} />}
        {tweet.event && <EventCard tweet={tweet} />}

        <Time>
          <time dateTime={tweet.createdAt}>{fullTime(tweet.createdAt)}</time>
          {tweet.edited && ' · Edited'}
        </Time>

        {(tweet.repliesCount > 0 || reposts > 0 || tweet.likes.length > 0) && (
          <Stats>
            <span>
              <strong>{tweet.repliesCount}</strong> {tweet.repliesCount === 1 ? 'Comment' : 'Comments'}
            </span>
            <span>
              <strong>{reposts}</strong> {reposts === 1 ? 'Repost' : 'Reposts'}
            </span>
            <span>
              <strong>{tweet.likes.length}</strong> {tweet.likes.length === 1 ? 'Like' : 'Likes'}
            </span>
          </Stats>
        )}

        <ActionBar tweet={tweet} queryKey={queryKey} onComment={focusReply} showCounts={false} />
      </Main>

      <Section>
        {user ? (
          <Composer replyTo={tweet._id} placeholder="Post your reply" submitLabel="Reply" compact />
        ) : (
          <Prompt>
            <span>Sign in to join the conversation.</span>
            <Button as={Link} href="/signin" $variant="primary" $size="md">
              Sign In
            </Button>
          </Prompt>
        )}

        <TweetsBoard
          query={replies}
          emptyTitle="No comments yet"
          emptyText="Be the first to reply."
          emptyIcon={RiChat3Line}
        />
      </Section>

      {confirming && (
        <ConfirmDialog
          title="Delete post?"
          message={`This can't be undone.${tweet.repliesCount ? ` ${plural(tweet.repliesCount, 'reply', 'replies')} will stay visible.` : ''}`}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            removeTweet.mutate(tweet._id, { onSuccess: () => router.back() });
          }}
        />
      )}
    </>
  );
}
