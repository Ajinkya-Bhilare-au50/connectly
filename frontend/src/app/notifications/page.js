'use client';

import { Fragment, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import {
  RiAtLine,
  RiChat3Fill,
  RiCheckDoubleLine,
  RiHeart3Fill,
  RiNotification3Line,
  RiRepeat2Fill,
  RiUserFollowFill,
} from 'react-icons/ri';
import { useIntersectionObserver } from '@/hooks';
import { errorMessage } from '@/lib/api';
import { fullTime, shortTime } from '@/lib/format';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/lib/queries';
import { media } from '@/lib/theme';
import RequireAuth from '@/components/RequireAuth';
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, SkeletonList, Spinner, Tab, TabBar } from '@/components/ui';

const TYPES = {
  like: { icon: RiHeart3Fill, color: 'var(--like)', text: 'liked your post' },
  retweet: { icon: RiRepeat2Fill, color: 'var(--repost)', text: 'reposted your post' },
  follow: { icon: RiUserFollowFill, color: 'var(--primary)', text: 'followed you' },
  reply: { icon: RiChat3Fill, color: 'var(--primary)', text: 'replied to your post' },
  mention: { icon: RiAtLine, color: 'var(--primary)', text: 'mentioned you' },
};

const Item = styled.div`
  position: relative;
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  background: ${({ $unread }) => ($unread ? 'var(--primary-soft)' : 'transparent')};
  transition: background-color 0.15s;

  & + & {
    border-top: 1px solid var(--border);
  }

  &:hover {
    background: ${({ $unread }) => ($unread ? 'var(--primary-100)' : 'var(--bg-hover)')};
  }

  .type {
    font-size: 24px;
    flex-shrink: 0;
    width: 28px;
    display: flex;
    justify-content: center;
    padding-top: 6px;
  }

  .body {
    flex: 1;
    min-width: 0;
  }

  .line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .line a:hover {
    text-decoration: underline;
  }

  .new {
    font-size: 11px;
    font-weight: 700;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .snippet {
    margin-top: 4px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow-wrap: anywhere;
  }

  time {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }

  ${media.mobile} {
    padding: 12px 16px;
  }
`;

function NotificationItem({ n }) {
  const router = useRouter();
  const markRead = useMarkNotificationRead();
  const type = TYPES[n.type] ?? TYPES.mention;
  const Icon = type.icon;
  const tweet = n.tweet;
  const href = n.type === 'follow' || !tweet ? `/profile/${n.actor._id}` : `/${tweet.author}/status/${tweet._id}`;

  const open = () => {
    if (!n.read) markRead.mutate(n._id);
    router.push(href);
  };

  return (
    <Item
      $unread={!n.read}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      aria-label={`${n.read ? '' : 'Unread: '}${n.actor.name} ${type.text}`}
    >
      <span className="type" style={{ color: type.color }}>
        <Icon aria-hidden />
      </span>
      <div className="body">
        <Link href={`/profile/${n.actor._id}`} onClick={(e) => e.stopPropagation()} aria-label={`${n.actor.name}'s profile`}>
          <Avatar src={n.actor.avatar} name={n.actor.name} $size={32} />
        </Link>
        <div className="line">
          <span>
            <Link href={`/profile/${n.actor._id}`} onClick={(e) => e.stopPropagation()}>
              <strong>{n.actor.name}</strong>
            </Link>{' '}
            {type.text}
          </span>
          {!n.read && <span className="new">New</span>}
          <time dateTime={n.createdAt} title={fullTime(n.createdAt)}>
            {shortTime(n.createdAt)}
          </time>
        </div>
        {tweet && (tweet.text || tweet.image || tweet.video) && (
          <p className="snippet">{tweet.text || (tweet.video ? 'Video' : 'Photo')}</p>
        )}
      </div>
    </Item>
  );
}

function NotificationList({ type }) {
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useNotifications(type);
  const sentinelRef = useRef(null);
  useIntersectionObserver({ target: sentinelRef, onIntersect: fetchNextPage, enabled: !!hasNextPage, threshold: 0 });

  if (error) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (isPending) return <SkeletonList rows={5} avatar={32} />;

  const count = data.pages.reduce((n, p) => n + p.results.length, 0);
  if (!count) {
    return type ? (
      <EmptyState title="No mentions yet" icon={RiAtLine}>
        When someone @mentions you, you&apos;ll find it here.
      </EmptyState>
    ) : (
      <EmptyState title="No notifications yet" icon={RiNotification3Line}>
        Likes, reposts, new followers and replies will show up here.
      </EmptyState>
    );
  }

  return (
    <Card $clip $flushMobile>
      {data.pages.map((page, i) => (
        <Fragment key={i}>
          {page.results.map((n) => (
            <NotificationItem key={n._id} n={n} />
          ))}
        </Fragment>
      ))}
      <div ref={sentinelRef} />
      {isFetchingNextPage && <Spinner />}
    </Card>
  );
}

function Notifications() {
  const [tab, setTab] = useState('all');
  const markAll = useMarkAllNotificationsRead();

  return (
    <>
      <PageHeader
        title="Notifications"
        icon={RiNotification3Line}
        action={
          <Button $variant="ghost" $size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <RiCheckDoubleLine aria-hidden /> Mark all as read
          </Button>
        }
      >
        <TabBar role="tablist" aria-label="Notification filter">
          <Tab selected={tab === 'all'} onClick={() => setTab('all')}>
            All
          </Tab>
          <Tab selected={tab === 'mention'} onClick={() => setTab('mention')}>
            Mentions
          </Tab>
        </TabBar>
      </PageHeader>
      <NotificationList key={tab} type={tab === 'all' ? null : 'mention,reply'} />
    </>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <Notifications />
    </RequireAuth>
  );
}
