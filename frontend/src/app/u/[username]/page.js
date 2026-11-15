'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiUserUnfollowLine } from 'react-icons/ri';
import { useProfileByUsername } from '@/lib/queries';
import { EmptyState, PageHeader, SkeletonList } from '@/components/ui';

// @mention links point here: resolve the username, then show the profile.
export default function UsernameRedirect() {
  const { username } = useParams();
  const router = useRouter();
  const name = decodeURIComponent(username);
  const { data: profile, error } = useProfileByUsername(name);

  useEffect(() => {
    if (profile) router.replace(`/profile/${profile.user._id}`);
  }, [profile, router]);

  if (error) {
    return (
      <>
        <PageHeader back title="Profile" />
        <EmptyState title={`@${name} doesn't exist`} icon={RiUserUnfollowLine}>
          Try searching for another person.
        </EmptyState>
      </>
    );
  }
  return <SkeletonList rows={1} />;
}
