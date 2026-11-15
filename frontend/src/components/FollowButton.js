'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useUser } from '@/context/UserContext';
import { useProfileFollowMutation, useProfileUnfollowMutation } from '@/lib/queries';
import { Button } from './ui';

const FollowingButton = styled(Button)`
  min-width: 104px;

  &:hover:not(:disabled) {
    color: var(--danger);
    border-color: var(--danger);
    background: var(--danger-soft);
  }
`;

/** Follow / Following (hover: Unfollow) for a profile `{ user: {_id}, followers: [] }`. */
export default function FollowButton({ profile, size = 'sm' }) {
  const me = useUser();
  const router = useRouter();
  const follow = useProfileFollowMutation();
  const unfollow = useProfileUnfollowMutation();
  const [hover, setHover] = useState(false);

  const targetId = profile.user?._id;
  if (!targetId || me?._id === targetId) return null;

  const isFollowing = !!me && profile.followers.includes(me._id);
  const busy = follow.isPending || unfollow.isPending;

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!me) return router.push('/signin');
    (isFollowing ? unfollow : follow).mutate(targetId);
  };

  if (isFollowing) {
    return (
      <FollowingButton
        $variant="secondary"
        $pill
        $size={size}
        disabled={busy}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Unfollow @${profile.user.username}`}
      >
        {hover ? 'Unfollow' : 'Following'}
      </FollowingButton>
    );
  }

  return (
    <Button $variant="primaryOutline" $pill $size={size} disabled={busy} onClick={onClick} aria-label={`Follow @${profile.user.username}`}>
      Follow
    </Button>
  );
}
