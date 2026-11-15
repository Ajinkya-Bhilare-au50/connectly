'use client';

import { useParams } from 'next/navigation';
import { RiUserUnfollowLine } from 'react-icons/ri';
import { useProfile } from '@/lib/queries';
import { errorMessage } from '@/lib/api';
import ProfileHeader from '@/components/ProfileHeader';
import { Card, EmptyState, ErrorState, PageHeader, SkeletonBlock } from '@/components/ui';

// Shared header for /profile/:userId and its tabs.
export default function ProfileLayout({ children }) {
  const { userId } = useParams();
  const { isPending, error, data: profile, refetch } = useProfile(userId);

  if (error) {
    return (
      <>
        <PageHeader back title="Profile" />
        {error.response?.status === 404 || error.response?.status === 400 ? (
          <EmptyState title="This account doesn't exist" icon={RiUserUnfollowLine}>
            Try searching for another person.
          </EmptyState>
        ) : (
          <ErrorState message={errorMessage(error)} onRetry={refetch} />
        )}
      </>
    );
  }

  if (isPending) {
    return (
      <>
        <PageHeader back title="Profile" />
        <Card $clip aria-busy="true" aria-label="Loading profile">
          <SkeletonBlock $h="200px" style={{ borderRadius: 0 }} />
          <div style={{ padding: 24, display: 'grid', gap: 10 }}>
            <SkeletonBlock $w="40%" $h={18} />
            <SkeletonBlock $w="25%" />
            <SkeletonBlock $w="70%" />
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <ProfileHeader profile={profile} />
      {children}
    </>
  );
}
