'use client';

import { Fragment, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RiGroupLine } from 'react-icons/ri';
import { useIntersectionObserver } from '@/hooks';
import { useProfiles } from '@/lib/queries';
import { errorMessage } from '@/lib/api';
import FollowButton from './FollowButton';
import { Avatar, Card, EmptyState, ErrorState, SkeletonList, Spinner } from './ui';

const Row = styled.div`
  display: flex;
  gap: 12px;
  padding: ${({ $compact }) => ($compact ? '10px 20px' : '14px 20px')};
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background: var(--bg-hover);
  }

  & + & {
    border-top: ${({ $compact }) => ($compact ? 'none' : '1px solid var(--border)')};
  }
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .names {
    min-width: 0;
    line-height: 1.35;

    strong,
    span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      font-weight: 600;
    }

    a:hover strong {
      text-decoration: underline;
    }

    span {
      font-size: 13px;
      color: var(--text-muted);
    }
  }

  p {
    margin-top: 4px;
    overflow-wrap: anywhere;
  }
`;

/** One profile row: avatar, name, handle, bio, follow button. */
export function ProfileRow({ profile, showBio = true, compact = false, action }) {
  const router = useRouter();
  const { user, bio } = profile;
  if (!user) return null;
  const href = `/profile/${user._id}`;
  return (
    <Row onClick={() => router.push(href)} $compact={compact}>
      <Avatar src={user.avatar} alt={`${user.name}'s avatar`} $size={40} />
      <Info>
        <div className="top">
          <div className="names">
            <Link href={href} onClick={(e) => e.stopPropagation()}>
              <strong>{user.name}</strong>
            </Link>
            <span>@{user.username}</span>
          </div>
          {action ?? <FollowButton profile={profile} />}
        </div>
        {showBio && bio && <p>{bio}</p>}
      </Info>
    </Row>
  );
}

/** Infinite list of profiles in a card. `filters` = { following, followers, likes, retweets, q }. */
export default function ProfilesGrid({ filters = {}, emptyTitle = 'No one here yet', emptyText }) {
  const { isPending, error, data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useProfiles(filters);
  const sentinelRef = useRef(null);

  useIntersectionObserver({ target: sentinelRef, onIntersect: fetchNextPage, enabled: !!hasNextPage, threshold: 0 });

  if (error) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (isPending) return <SkeletonList rows={5} />;

  const count = data.pages.reduce((acc, page) => acc + page.results.length, 0);
  if (count === 0) {
    return (
      <EmptyState title={emptyTitle} icon={RiGroupLine}>
        {emptyText}
      </EmptyState>
    );
  }

  return (
    <Card $clip $flushMobile>
      {data.pages.map((page, i) => (
        <Fragment key={i}>
          {page.results.map((profile) => (
            <ProfileRow key={profile._id} profile={profile} />
          ))}
        </Fragment>
      ))}
      <div ref={sentinelRef} />
      {isFetchingNextPage && <Spinner />}
    </Card>
  );
}
