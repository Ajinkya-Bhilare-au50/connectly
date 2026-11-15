'use client';

import { useParams } from 'next/navigation';
import { useTweets } from '@/lib/queries';
import TweetsBoard from '@/components/TweetsBoard';

export default function ProfileRepliesPage() {
  const { userId } = useParams();
  return <TweetsBoard query={useTweets({ author: userId, includeReplies: true })} emptyTitle="No posts or replies yet" />;
}
