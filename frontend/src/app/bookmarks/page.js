'use client';

import { RiBookmarkLine } from 'react-icons/ri';
import { useBookmarks } from '@/lib/queries';
import RequireAuth from '@/components/RequireAuth';
import TweetsBoard from '@/components/TweetsBoard';
import { PageHeader } from '@/components/ui';

function Bookmarks() {
  return (
    <>
      <PageHeader title="Bookmarks" subtitle="Only you can see your bookmarks" icon={RiBookmarkLine} />
      <TweetsBoard
        query={useBookmarks()}
        emptyTitle="No bookmarks yet"
        emptyText="Save posts with the bookmark button to find them again here."
        emptyIcon={RiBookmarkLine}
      />
    </>
  );
}

export default function BookmarksPage() {
  return (
    <RequireAuth>
      <Bookmarks />
    </RequireAuth>
  );
}
