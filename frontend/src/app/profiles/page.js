'use client';

import ProfilesGrid from '@/components/ProfilesGrid';
import { PageHeader } from '@/components/ui';

export default function ProfilesPage() {
  return (
    <>
      <PageHeader title="People" subtitle="Everyone on Twitter Clone" />
      <ProfilesGrid emptyTitle="No one here yet" />
    </>
  );
}
