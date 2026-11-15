'use client';

import { useParams, useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import TweetDetail from '@/components/TweetDetail';

// Intercepts /:userId/status/:tweetId when a post is clicked inside the app and shows it as a modal.
export default function PostModal() {
  const router = useRouter();
  const { tweetId } = useParams();

  return (
    <Modal label="Post" title="Post" maxWidth={640} onDismiss={() => router.back()}>
      <TweetDetail tweetId={tweetId} flat />
    </Modal>
  );
}
