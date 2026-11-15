'use client';

import { useParams } from 'next/navigation';
import { RiHeart3Line } from 'react-icons/ri';
import { useTweets } from '@/lib/queries';
import TweetsBoard from '@/components/TweetsBoard';

export default function ProfileLikesPage() {
  const { userId } = useParams();
  return (
    <TweetsBoard
      query={useTweets({ likes: userId })}
      emptyTitle="No likes yet"
      emptyText="Liked posts will show up here."
      emptyIcon={RiHeart3Line}
    />
  );
}
