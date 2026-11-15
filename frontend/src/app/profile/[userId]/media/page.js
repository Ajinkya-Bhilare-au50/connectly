'use client';

import { useParams } from 'next/navigation';
import { RiImage2Line } from 'react-icons/ri';
import { useTweets } from '@/lib/queries';
import TweetsBoard from '@/components/TweetsBoard';

export default function ProfileMediaPage() {
  const { userId } = useParams();
  return (
    <TweetsBoard
      query={useTweets({ author: userId, includeReplies: true, hasMedia: true })}
      emptyTitle="No photos or videos yet"
      emptyText="Posts with photos and videos will show up here."
      emptyIcon={RiImage2Line}
    />
  );
}
