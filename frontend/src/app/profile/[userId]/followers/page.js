'use client';

import { useParams } from 'next/navigation';
import ProfilesGrid from '@/components/ProfilesGrid';

// Profiles following this user = profiles whose `following` list contains them.
export default function FollowersPage() {
  const { userId } = useParams();
  return <ProfilesGrid filters={{ following: userId }} emptyTitle="No followers yet" />;
}
