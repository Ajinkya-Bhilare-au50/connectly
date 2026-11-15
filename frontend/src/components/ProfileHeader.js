'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RiCalendarLine, RiLinksLine, RiMailLine, RiMapPin2Line } from 'react-icons/ri';
import { format } from 'date-fns';
import { useUser } from '@/context/UserContext';
import { media } from '@/lib/theme';
import { mediaUrl } from '@/lib/uploads';
import { useProfile, useProfiles, useStartConversation } from '@/lib/queries';
import FollowButton from './FollowButton';
import { Avatar, Button, Card, PageHeader, Tab, TabBar } from './ui';

const Wrap = styled(Card)`
  overflow: hidden;

  ${media.mobile} {
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
`;

const Cover = styled.div`
  position: relative;
  aspect-ratio: 3 / 1;
  background: var(--brand-gradient);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 24px 0;

  .actions {
    display: flex;
    gap: 8px;
  }

  ${media.mobile} {
    padding: 12px 16px 0;
  }
`;

const BigAvatar = styled(Avatar)`
  &&& {
  position: relative;
  z-index: 1;
  margin-top: max(-15%, -76px);
  width: 22%;
  min-width: 64px;
  max-width: 128px;
  height: auto;
  aspect-ratio: 1;
  border: 4px solid var(--bg);
  font-size: 48px; /* initial shown when there's no photo */

  ${media.mobile} {
    width: 84px;
    font-size: 32px;
  }
  }
`;

const Info = styled.div`
  padding: 12px 24px 0;

  h2 {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.25;
  }

  .handle {
    color: var(--text-muted);
  }

  .bio {
    margin-top: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  ${media.mobile} {
    padding: 12px 16px 0;
  }
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-muted);

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  a {
    color: var(--primary);

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Counts = styled.div`
  display: flex;
  gap: 20px;
  margin: 12px 0 16px;
  font-size: 13px;
  color: var(--text-muted);

  strong {
    color: var(--text);
    font-size: 14px;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const FollowedByRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -4px 0 16px;
  font-size: 12px;
  color: var(--text-muted);

  .faces {
    display: flex;
  }

  .faces > * + * {
    margin-left: -8px;
  }

  .faces > * {
    border: 2px solid var(--bg);
    box-sizing: content-box;
  }

  a:hover {
    text-decoration: underline;
  }
`;

function MessageButton({ userId }) {
  const router = useRouter();
  const me = useUser();
  const start = useStartConversation();
  if (!me) return null;
  return (
    <Button
      $variant="secondary"
      $pill
      $size="md"
      aria-label="Send a message"
      title="Message"
      disabled={start.isPending}
      onClick={() => start.mutate(userId, { onSuccess: (conv) => router.push(`/messages/${conv._id}`) })}
      style={{ width: 40, padding: 0 }}
    >
      <RiMailLine />
    </Button>
  );
}

/** "Followed by A, B and 3 others you follow". */
function FollowedBy({ profile, me }) {
  const { data: myProfile } = useProfile(me._id);
  const { data } = useProfiles({ following: profile.user._id, limit: 50 });

  const myFollowing = new Set(myProfile?.following ?? []);
  const mutual = (data?.pages[0]?.results ?? []).filter((p) => p.user && myFollowing.has(p.user._id));
  if (mutual.length === 0) return null;

  const names = mutual.slice(0, 2).map((p) => p.user.name);
  const others = mutual.length - names.length;
  const text = others > 0 ? `${names.join(', ')} and ${others} other${others === 1 ? '' : 's'} you follow` : names.join(' and ');

  return (
    <FollowedByRow>
      <span className="faces">
        {mutual.slice(0, 3).map((p) => (
          <Avatar key={p._id} src={p.user.avatar} name={p.user.name} $size={20} />
        ))}
      </span>
      <Link href={`/profile/${profile.user._id}/followers`}>Followed by {text}</Link>
    </FollowedByRow>
  );
}

export default function ProfileHeader({ profile }) {
  const me = useUser();
  const pathname = usePathname();

  const { user: owner, bio, location, website, createdAt, backgroundImage } = profile;
  const base = `/profile/${owner._id}`;
  const isOwner = !!(me && me._id === owner._id);
  const websiteHref = website && (/^https?:\/\//i.test(website) ? website : `https://${website}`);
  const websiteLabel = website?.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const listPage = pathname.endsWith('/following') || pathname.endsWith('/followers');

  const tabs = listPage
    ? [
        [`${base}/followers`, 'Followers'],
        [`${base}/following`, 'Following'],
      ]
    : [
        [base, 'Posts'],
        [`${base}/with_replies`, 'Replies'],
        [`${base}/media`, 'Media'],
        [`${base}/likes`, 'Likes'],
      ];

  return (
    <>
      <PageHeader back title={owner.name} subtitle={`@${owner.username}`} />

      <Wrap>
        <Cover>
          {backgroundImage && (
            <img
              src={mediaUrl(backgroundImage)}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </Cover>

        <Top>
          <BigAvatar src={owner.avatar} alt={`${owner.name}'s avatar`} />
          <div className="actions">
            {isOwner ? (
              <Button as={Link} href="/edit-profile" $variant="secondary" $pill>
                Edit profile
              </Button>
            ) : (
              <>
                <MessageButton userId={owner._id} />
                <FollowButton profile={profile} size="md" />
              </>
            )}
          </div>
        </Top>

        <Info>
          <h2>{owner.name}</h2>
          <div className="handle">@{owner.username}</div>
          {bio && <p className="bio">{bio}</p>}

          <MetaRow>
            {location && (
              <span>
                <RiMapPin2Line aria-hidden /> {location}
              </span>
            )}
            {website && (
              <span>
                <RiLinksLine aria-hidden />
                <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                  {websiteLabel}
                </a>
              </span>
            )}
            <span>
              <RiCalendarLine aria-hidden /> Joined {format(new Date(createdAt), 'MMMM yyyy')}
            </span>
          </MetaRow>

          <Counts>
            <Link href={`${base}/following`}>
              <strong>{profile.following.length}</strong> Following
            </Link>
            <Link href={`${base}/followers`}>
              <strong>{profile.followers.length}</strong> {profile.followers.length === 1 ? 'Follower' : 'Followers'}
            </Link>
          </Counts>

          {me && !isOwner && <FollowedBy profile={profile} me={me} />}
        </Info>

        <TabBar style={{ borderTop: '1px solid var(--border)' }}>
          {tabs.map(([href, label]) => (
            <Tab key={href} as={Link} href={href} current={pathname === href}>
              {label}
            </Tab>
          ))}
        </TabBar>
      </Wrap>
    </>
  );
}
