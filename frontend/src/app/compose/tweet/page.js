'use client';

import { useRouter } from 'next/navigation';
import { RiAddLine } from 'react-icons/ri';
import RequireAuth from '@/components/RequireAuth';
import Composer from '@/components/Composer';
import { PageHeader } from '@/components/ui';

// Full-page composer (direct visit / refresh). In-app links open it as a modal.
export default function CreatePostPage() {
  const router = useRouter();
  return (
    <RequireAuth>
      <PageHeader back title="Create Post" icon={RiAddLine} />
      <Composer autoFocus onCreated={() => router.push('/')} />
    </RequireAuth>
  );
}
