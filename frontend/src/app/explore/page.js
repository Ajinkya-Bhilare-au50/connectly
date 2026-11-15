'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { RiCloseCircleFill, RiCompass3Line, RiHashtag, RiSearchLine } from 'react-icons/ri';
import { errorMessage } from '@/lib/api';
import { useTrending, useTrends, useTweets } from '@/lib/queries';
import TweetsBoard, { TweetCard } from '@/components/TweetsBoard';
import ProfilesGrid from '@/components/ProfilesGrid';
import { Card, EmptyState, ErrorState, PageHeader, SkeletonList, Tab, TabBar } from '@/components/ui';

const SearchRow = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
`;

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 8px 0 16px;
  border-radius: 9999px;
  border: 1px solid transparent;
  background: var(--bg-subtle);
  color: var(--text-muted);

  &:focus-within {
    border-color: var(--primary);
    background: var(--bg);
    color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-100);
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: none;
    color: var(--text);

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  button {
    display: flex;
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-faint);
    cursor: pointer;
    padding: 4px;

    &:hover {
      color: var(--text);
    }
  }
`;

const TagRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  transition: background-color 0.15s;

  & + & {
    border-top: 1px solid var(--border);
  }

  &:hover {
    background: var(--bg-hover);
  }

  .rank {
    width: 24px;
    color: var(--text-muted);
    font-size: 13px;
  }

  strong {
    display: block;
    font-weight: 600;
  }

  span {
    font-size: 12px;
    color: var(--text-muted);
  }
`;

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Trending() {
  const { data, isPending, error, refetch } = useTrending(20);
  if (error) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (isPending) return <SkeletonList rows={4} />;
  if (!data?.length) return <EmptyState title="Nothing is trending yet" icon={RiCompass3Line} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((tweet) => (
        <TweetCard key={tweet._id} tweet={tweet} queryKey={['tweets', 'trending', 20]} />
      ))}
    </div>
  );
}

function Hashtags({ q }) {
  const { data, isPending, error, refetch } = useTrends(30);
  if (error) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (isPending) return <SkeletonList rows={4} avatar={24} />;
  const filter = q.replace(/^#/, '').toLowerCase();
  const tags = (data ?? []).filter((t) => !filter || t.tag.includes(filter));
  if (!tags.length) {
    return (
      <EmptyState title={filter ? 'No results found' : 'No hashtags yet'} icon={RiHashtag}>
        {filter ? 'Try another name or hashtag.' : 'Add #hashtags to your posts to start a trend.'}
      </EmptyState>
    );
  }
  return (
    <Card $clip $flushMobile>
      {tags.map((t, i) => (
        <TagRow key={t.tag} href={`/explore?hashtag=${encodeURIComponent(t.tag)}`}>
          <span className="rank">{i + 1}</span>
          <div>
            <strong>#{t.tag}</strong>
            <span>
              {t.count} {t.count === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </TagRow>
      ))}
    </Card>
  );
}

function PostResults({ q, hashtag }) {
  const query = useTweets(hashtag ? { hashtag } : { q });
  return (
    <TweetsBoard
      query={query}
      emptyTitle="No results found"
      emptyText={hashtag ? `Nobody has posted with #${hashtag} yet.` : 'Try another name or hashtag.'}
      emptyIcon={RiSearchLine}
    />
  );
}

function Explore() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hashtag = params.get('hashtag')?.trim().replace(/^#/, '').toLowerCase() || '';
  const urlQ = params.get('q')?.trim() || '';
  const tab = ['people', 'hashtags'].includes(params.get('tab')) ? params.get('tab') : 'posts';
  const [input, setInput] = useState(hashtag ? `#${hashtag}` : urlQ);
  const debounced = useDebounced(input.trim());

  useEffect(() => setInput(hashtag ? `#${hashtag}` : urlQ), [hashtag, urlQ]);

  // Debounced search: keep the URL in sync while typing.
  useEffect(() => {
    const current = hashtag ? `#${hashtag}` : urlQ;
    if (debounced === current) return;
    go({ q: debounced, tab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  function go({ q, tab: nextTab }) {
    const sp = new URLSearchParams();
    if (q.startsWith('#') && q.length > 1 && nextTab === 'posts') sp.set('hashtag', q.slice(1).toLowerCase());
    else if (q) sp.set('q', q);
    if (nextTab !== 'posts') sp.set('tab', nextTab);
    router.replace(`${pathname}${sp.size ? `?${sp}` : ''}`, { scroll: false });
  }

  const q = hashtag ? `#${hashtag}` : urlQ;

  return (
    <>
      <PageHeader
        title={hashtag ? `#${hashtag}` : 'Explore'}
        icon={hashtag ? RiHashtag : RiCompass3Line}
        back={!!hashtag}
      >
        <SearchRow>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go({ q: input.trim(), tab });
            }}
          >
            <SearchBox>
              <RiSearchLine aria-hidden />
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search people, posts or #hashtags"
                aria-label="Search"
                autoFocus={!q}
              />
              {input && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setInput('');
                    go({ q: '', tab });
                  }}
                >
                  <RiCloseCircleFill />
                </button>
              )}
            </SearchBox>
          </form>
        </SearchRow>
        <TabBar role="tablist" aria-label="Results">
          <Tab selected={tab === 'posts'} onClick={() => go({ q, tab: 'posts' })}>
            {q ? 'Posts' : 'Trending'}
          </Tab>
          <Tab selected={tab === 'people'} onClick={() => go({ q: q.replace(/^#/, ''), tab: 'people' })}>
            People
          </Tab>
          <Tab selected={tab === 'hashtags'} onClick={() => go({ q, tab: 'hashtags' })}>
            Hashtags
          </Tab>
        </TabBar>
      </PageHeader>

      {tab === 'people' ? (
        <ProfilesGrid
          key={urlQ}
          filters={{ q: urlQ.replace(/^[@#]/, '') }}
          emptyTitle={urlQ ? 'No results found' : 'No one here yet'}
          emptyText={urlQ ? 'Try another name or username.' : undefined}
        />
      ) : tab === 'hashtags' ? (
        <Hashtags q={q} />
      ) : q ? (
        <PostResults key={q} q={urlQ} hashtag={hashtag} />
      ) : (
        <Trending />
      )}
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}
