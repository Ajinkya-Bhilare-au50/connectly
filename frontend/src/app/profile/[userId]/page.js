'use client';

import { useParams } from 'next/navigation';
import { useTweets } from '@/lib/queries';
import TweetsBoard from '@/components/TweetsBoard';

export default function ProfilePostsPage() {
  const { userId } = useParams();
  return <TweetsBoard query={useTweets({ author: userId })} emptyTitle="No posts yet" />;
}
