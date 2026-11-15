'use client';

import { useParams } from 'next/navigation';
import TweetDetail from '@/components/TweetDetail';
import { PageHeader } from '@/components/ui';

// Full-page post view (direct visit / refresh). Clicking a post in the app opens it as a modal.
export default function PostPage() {
  const { tweetId } = useParams();
  return (
    <>
      <PageHeader back title="Post" />
      <TweetDetail tweetId={tweetId} />
    </>
  );
}
