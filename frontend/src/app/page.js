'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiHome5Line, RiUserFollowLine } from 'react-icons/ri';
import { useUser } from '@/context/UserContext';
import { useFeedTweets, useTweets } from '@/lib/queries';
import Composer from '@/components/Composer';
import TweetsBoard from '@/components/TweetsBoard';
import { Button, PageHeader, Tab, TabBar } from '@/components/ui';

function ForYou() {
  return (
    <TweetsBoard
      query={useTweets()}
      emptyTitle="No posts yet"
      emptyText="When people post, it'll show up here. Be the first!"
    />
  );
}

function Following() {
  return (
    <TweetsBoard
      query={useFeedTweets()}
      emptyTitle="Your feed is getting started"
      emptyText="Follow people to see their posts here."
      emptyIcon={RiUserFollowLine}
      emptyAction={
        <Button as={Link} href="/explore?tab=people" $variant="primary">
          Find people to follow
        </Button>
      }
    />
  );
}

export default function HomePage() {
  const user = useUser();
  const [tab, setTab] = useState('all');

  return (
    <>
      <PageHeader title="Home" icon={RiHome5Line}>
        {user && (
          <TabBar role="tablist" aria-label="Feed">
            <Tab selected={tab === 'all'} onClick={() => setTab('all')}>
              For you
            </Tab>
            <Tab selected={tab === 'following'} onClick={() => setTab('following')}>
              Following
            </Tab>
          </TabBar>
        )}
      </PageHeader>
      {user && <Composer />}
      {user && tab === 'following' ? <Following /> : <ForYou />}
    </>
  );
}
