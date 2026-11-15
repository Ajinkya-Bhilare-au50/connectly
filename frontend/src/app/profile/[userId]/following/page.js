'use client';

import { useParams } from 'next/navigation';
import ProfilesGrid from '@/components/ProfilesGrid';

// Profiles this user follows = profiles whose `followers` list contains them.
export default function FollowingPage() {
  const { userId } = useParams();
  return <ProfilesGrid filters={{ followers: userId }} emptyTitle="Not following anyone yet" />;
}
