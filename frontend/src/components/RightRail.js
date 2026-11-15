'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { useUser } from '@/context/UserContext';
import { useProfiles, useTrends } from '@/lib/queries';
import { media } from '@/lib/theme';
import { ProfileRow } from './ProfilesGrid';
import { Button, Card, SkeletonBlock } from './ui';

const Rail = styled.aside`
  position: sticky;
  top: calc(var(--header-height) + 16px);
  align-self: flex-start;
  width: var(--right-panel-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;

  ${media.belowWide} {
    display: none;
  }
`;

const Module = styled(Card)`
  overflow: hidden;

  h2 {
    padding: 16px 20px 8px;
    font-size: 18px;
    font-weight: 600;
  }
`;

const More = styled(Link)`
  display: block;
  padding: 12px 20px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);

  &:hover {
    text-decoration: underline;
  }
`;

const Trend = styled(Link)`
  display: block;
  padding: 10px 20px;
  transition: background-color 0.15s;

  &:hover {
    background: var(--bg-hover);
  }

  .context {
    font-size: 12px;
    color: var(--text-muted);
  }

  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .count {
    font-size: 12px;
    color: var(--text-muted);
  }
`;

const Join = styled.div`
  padding: 0 20px 20px;

  p {
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  a + a {
    margin-top: 10px;
  }
`;

const Footer = styled.footer`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--text-muted);

  a:hover {
    text-decoration: underline;
  }
`;

const Quiet = styled.p`
  padding: 4px 20px 16px;
  color: var(--text-muted);
  font-size: 13px;
`;

function WhoToFollow() {
  const me = useUser();
  const { data, isPending } = useProfiles({ limit: 15 });

  const suggestions = (data?.pages[0]?.results ?? [])
    .filter((p) => p.user && p.user._id !== me?._id && !(me && p.followers.includes(me._id)))
    .slice(0, 3);

  return (
    <Module>
      <h2>Who to follow</h2>
      {isPending ? (
        <div style={{ padding: '8px 20px', display: 'grid', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} $h={36} />
          ))}
        </div>
      ) : suggestions.length ? (
        suggestions.map((profile) => <ProfileRow key={profile._id} profile={profile} showBio={false} compact />)
      ) : (
        <Quiet>You&apos;re following everyone we&apos;d suggest. Nice!</Quiet>
      )}
      <More href="/explore?tab=people">Show more</More>
    </Module>
  );
}

function TrendsForYou() {
  const { data: trends, isPending } = useTrends(5);

  return (
    <Module>
      <h2>Trends for you</h2>
      {isPending ? (
        <div style={{ padding: '8px 20px', display: 'grid', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} $h={36} />
          ))}
        </div>
      ) : trends?.length ? (
        trends.map((t, i) => (
          <Trend key={t.tag} href={`/explore?hashtag=${encodeURIComponent(t.tag)}`}>
            <span className="context">{i + 1} · Trending</span>
            <strong>#{t.tag}</strong>
            <span className="count">
              {t.count} {t.count === 1 ? 'post' : 'posts'}
            </span>
          </Trend>
        ))
      ) : (
        <Quiet>No trends yet. Add #hashtags to your posts to start one.</Quiet>
      )}
      <More href="/explore?tab=hashtags">Show more</More>
    </Module>
  );
}

export default function RightRail() {
  const me = useUser();

  return (
    <Rail aria-label="Suggestions and trends">
      {!me && (
        <Module>
          <h2>New to Connectly?</h2>
          <Join>
            <p>Sign up to post, follow people and join the conversation.</p>
            <Button as={Link} href="/signup" $variant="primary" $size="lg" $block>
              Create account
            </Button>
            <Button as={Link} href="/signin" $variant="secondary" $size="lg" $block>
              Sign In
            </Button>
          </Join>
        </Module>
      )}
      <WhoToFollow />
      <TrendsForYou />
      <Footer>
        <Link href="/help">Help &amp; Support</Link>
        <Link href="/terms">Terms of Service</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <span>© {new Date().getFullYear()} Connectly</span>
      </Footer>
    </Rail>
  );
}
