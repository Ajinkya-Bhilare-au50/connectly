'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { RiMoonLine, RiNotification3Line, RiSearchLine, RiSunLine } from 'react-icons/ri';
import { useUser } from '@/context/UserContext';
import { useUnreadNotificationCount } from '@/lib/queries';
import { useEffectiveColorMode } from '@/lib/colorMode';
import { media } from '@/lib/theme';
import AccountMenu from './AccountMenu';
import { Brand } from './Navigation';
import { Badge, Button } from './ui';

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16px;
  height: var(--header-height);
  padding: 0 24px;
  background: var(--bg-blur);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);

  .mobile-brand {
    display: none;
  }

  ${media.belowDesktop} {
    padding: 0 16px;
  }

  ${media.mobile} {
    gap: 8px;
    padding: 0 12px;

    .mobile-brand {
      display: flex;
    }
  }
`;

const Slot = styled.div`
  flex: 1;
  min-width: 0;
`;

const Search = styled.form`
  width: 260px;

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 14px;
    border-radius: 9999px;
    border: 1px solid transparent;
    background: var(--bg-subtle);
    color: var(--text-muted);
    transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
  }

  label:focus-within {
    border-color: var(--primary);
    background: var(--bg);
    box-shadow: 0 0 0 3px var(--primary-100);
    color: var(--primary);
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: none;
    font-size: 13px;
    color: var(--text);

    &::placeholder {
      color: var(--text-faint);
    }
  }

  ${media.belowDesktop} {
    display: none;
  }
`;

const RoundIcon = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 9999px;
  background: none;
  color: var(--text);
  font-size: 21px;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background: var(--bg-hover);
  }

  .count {
    position: absolute;
    top: 2px;
    right: 0;
    min-width: 18px;
    height: 18px;
    font-size: 10px;
    padding: 0 4px;
    border: 2px solid var(--bg);
  }

  &.search-link {
    display: none;
  }

  ${media.belowDesktop} {
    &.search-link {
      display: inline-flex;
    }
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState('');

  // Mirror the Explore search so both boxes agree.
  useEffect(() => {
    if (pathname === '/explore') setQ(params.get('q') || (params.get('hashtag') ? `#${params.get('hashtag')}` : ''));
  }, [pathname, params]);

  return (
    <Search
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const value = q.trim();
        if (!value) return;
        router.push(
          value.startsWith('#') && value.length > 1
            ? `/explore?hashtag=${encodeURIComponent(value.slice(1))}`
            : `/explore?q=${encodeURIComponent(value)}`
        );
      }}
    >
      <label>
        <RiSearchLine aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Connectly..." aria-label="Search Connectly" />
      </label>
    </Search>
  );
}

/** Top bar: page title (filled by <PageHeader>), search, theme, notifications, account. */
export default function TopBar({ slotRef }) {
  const user = useUser();
  const [mode, toggleMode] = useEffectiveColorMode();
  const { data: unread = 0 } = useUnreadNotificationCount();

  return (
    <Bar>
      <div className="mobile-brand">
        <Brand compact />
      </div>
      <Slot ref={slotRef} />
      <Suspense fallback={null}>
        <SearchBox />
      </Suspense>
      <Actions>
        <RoundIcon as={Link} href="/explore" className="search-link" aria-label="Search">
          <RiSearchLine />
        </RoundIcon>
        <RoundIcon
          type="button"
          onClick={toggleMode}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {mode === 'dark' ? <RiSunLine /> : <RiMoonLine />}
        </RoundIcon>
        {user ? (
          <>
            <RoundIcon as={Link} href="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
              <RiNotification3Line />
              {unread > 0 && (
                <Badge className="count" aria-hidden>
                  {unread > 99 ? '99+' : unread}
                </Badge>
              )}
            </RoundIcon>
            <AccountMenu variant="avatar" />
          </>
        ) : (
          <>
            <Button as={Link} href="/signin" $variant="secondary" $size="md">
              Sign In
            </Button>
            <Button as={Link} href="/signup" $variant="primary" $size="md">
              Sign Up
            </Button>
          </>
        )}
      </Actions>
    </Bar>
  );
}
