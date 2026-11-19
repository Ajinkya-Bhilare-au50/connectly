'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styled, { css } from 'styled-components';
import {
  RiAddLine,
  RiBookmarkFill,
  RiBookmarkLine,
  RiCompass3Fill,
  RiCompass3Line,
  RiFileList3Fill,
  RiFileList3Line,
  RiHome5Fill,
  RiHome5Line,
  RiMessage3Fill,
  RiMessage3Line,
  RiMoreLine,
  RiMoonLine,
  RiNotification3Fill,
  RiNotification3Line,
  RiQuestionLine,
  RiSettings3Line,
  RiShieldUserFill,
  RiShieldUserLine,
  RiSunLine,
  RiTeamFill,
  RiUser3Fill,
  RiUser3Line,
} from 'react-icons/ri';
import { useUser } from '@/context/UserContext';
import { useUnreadMessageCount, useUnreadNotificationCount } from '@/lib/queries';
import { useEffectiveColorMode } from '@/lib/colorMode';
import { media } from '@/lib/theme';
import AccountMenu, { MenuItem, MenuPanel, usePopover } from './AccountMenu';
import { Badge, Button } from './ui';

export function Brand({ compact = false }) {
  return (
    <BrandLink href="/" aria-label="Connectly home">
      <RiTeamFill aria-hidden />
      {!compact && <span>Connectly</span>}
    </BrandLink>
  );
}

const BrandLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);

  svg {
    font-size: 30px;
    color: var(--primary);
  }
`;

function useNavItems() {
  const user = useUser();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();

  const items = [
    { href: '/', label: 'Home', icon: RiHome5Line, activeIcon: RiHome5Fill, exact: true },
    { href: '/explore', label: 'Explore', icon: RiCompass3Line, activeIcon: RiCompass3Fill },
  ];
  if (user) {
    items.push(
      {
        href: '/notifications',
        label: 'Notifications',
        icon: RiNotification3Line,
        activeIcon: RiNotification3Fill,
        dot: unreadNotifications > 0,
        srCount: unreadNotifications,
      },
      {
        href: '/messages',
        label: 'Messages',
        icon: RiMessage3Line,
        activeIcon: RiMessage3Fill,
        badge: unreadMessages,
      },
      { href: '/bookmarks', label: 'Bookmarks', icon: RiBookmarkLine, activeIcon: RiBookmarkFill },
      { href: '/lists', label: 'Lists', icon: RiFileList3Line, activeIcon: RiFileList3Fill },
      { href: `/profile/${user._id}`, label: 'Profile', icon: RiUser3Line, activeIcon: RiUser3Fill }
    );
  }
  if (user?.role === 'admin') {
    items.push({ href: '/admin', label: 'Admin', icon: RiShieldUserLine, activeIcon: RiShieldUserFill });
  }
  return items;
}

function isActive(pathname, { href, exact }) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// ------------------------------------------------------------------ desktop / tablet sidebar

const SidebarWrap = styled.header`
  position: sticky;
  top: 0;
  height: 100vh;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  padding: 0 16px 16px;
  background: var(--bg);
  border-right: 1px solid var(--border);

  .brand-row {
    display: flex;
    align-items: center;
    height: var(--header-height);
    padding: 0 8px;
    flex-shrink: 0;
  }

  ${media.belowDesktop} {
    width: 76px;
    padding: 0 10px 12px;
    align-items: center;

    .brand-row {
      padding: 0;
    }
    .brand-row span {
      display: none;
    }
  }

  ${media.mobile} {
    display: none;
  }
`;

const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  overflow-y: auto;
  scrollbar-width: none;
`;

const navItemStyles = css`
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  > svg {
    font-size: 21px;
    flex-shrink: 0;
  }

  &:hover {
    background: var(--bg-hover);
  }

  .label {
    flex: 1;
  }

  ${media.belowDesktop} {
    justify-content: center;
    width: 48px;
    padding: 12px;

    .label,
    .badge {
      display: none;
    }
  }
`;

const NavItem = styled(Link)`
  ${navItemStyles}

  ${({ $active }) =>
    $active &&
    css`
      background: var(--primary-soft);
      color: var(--primary);
      font-weight: 600;

      &:hover {
        background: var(--primary-soft);
      }
    `}
`;

const NavButton = styled.button`
  ${navItemStyles}
`;

/** Unread dot; the count is also given as text so it doesn't rely on color alone. */
const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: var(--primary);
  flex-shrink: 0;

  ${media.belowDesktop} {
    position: absolute;
    top: 9px;
    right: 9px;
  }
`;

const CreateButton = styled(Button)`
  margin-top: 16px;
  width: 100%;

  ${media.belowDesktop} {
    width: 48px;
    padding: 0;

    .label {
      display: none;
    }
  }
`;

const Bottom = styled.div`
  margin-top: auto;
  padding-top: 12px;
  width: 100%;
`;

const AuthButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;

  ${media.belowDesktop} {
    display: none;
  }
`;

function MoreMenu() {
  const { open, toggle, close, wrapRef, triggerRef } = usePopover();
  const [mode, toggleMode] = useEffectiveColorMode();

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <NavButton ref={triggerRef} onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
        <RiMoreLine aria-hidden />
        <span className="label">More</span>
      </NavButton>
      {open && (
        <MenuPanel role="menu" $placement="down-left">
          <MenuItem role="menuitem" as={Link} href="/settings" onClick={close}>
            <RiSettings3Line aria-hidden /> Settings and privacy
          </MenuItem>
          <MenuItem role="menuitem" as={Link} href="/help" onClick={close}>
            <RiQuestionLine aria-hidden /> Help &amp; Support
          </MenuItem>
          <MenuItem role="menuitem" onClick={toggleMode}>
            {mode === 'dark' ? <RiSunLine aria-hidden /> : <RiMoonLine aria-hidden />}
            {mode === 'dark' ? 'Light mode' : 'Dark mode'}
          </MenuItem>
        </MenuPanel>
      )}
    </div>
  );
}

export function Sidebar() {
  const user = useUser();
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <SidebarWrap>
      <div className="brand-row">
        <Brand />
      </div>
      <NavList aria-label="Main">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = active ? item.activeIcon : item.icon;
          return (
            <NavItem key={item.href} href={item.href} $active={active} aria-current={active ? 'page' : undefined} title={item.label}>
              <Icon aria-hidden />
              <span className="label">{item.label}</span>
              {item.dot && (
                <>
                  <Dot aria-hidden />
                  <span className="sr-only">({item.srCount} unread)</span>
                </>
              )}
              {item.badge > 0 && (
                <>
                  <Badge className="badge" aria-hidden>
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                  <span className="sr-only">({item.badge} unread)</span>
                </>
              )}
            </NavItem>
          );
        })}
        {user && <MoreMenu />}

        {user ? (
          // Opens as a modal over the current page (intercepted route).
          <CreateButton as={Link} href="/compose/tweet" $variant="primary" $size="lg" $pill aria-label="Create Post">
            <RiAddLine aria-hidden />
            <span className="label">Create Post</span>
          </CreateButton>
        ) : (
          <AuthButtons>
            <Button as={Link} href="/signup" $variant="primary" $size="lg" data-cy="nav-signup-link">
              Create account
            </Button>
            <Button as={Link} href="/signin" $variant="secondary" $size="lg" data-cy="nav-signin-link">
              Sign In
            </Button>
          </AuthButtons>
        )}
      </NavList>

      {user && (
        <Bottom>
          <AccountMenu variant="chip" />
        </Bottom>
      )}
    </SidebarWrap>
  );
}

// ------------------------------------------------------------------ mobile bottom bar

const BottomBar = styled.nav`
  display: none;

  ${media.mobile} {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 60px;
    padding-bottom: env(safe-area-inset-bottom);
    border-top: 1px solid var(--border);
    background: var(--bg-blur);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  a {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    font-size: 24px;
    color: var(--text-muted);

    &[aria-current='page'] {
      color: var(--primary);
    }
  }

  .create {
    flex: 0 0 auto;
    width: 48px;
    height: 40px;
    min-height: 40px;
    border-radius: var(--radius-md);
    background: var(--primary);
    color: #fff;
  }

  .count {
    position: absolute;
    top: 6px;
    left: calc(50% + 6px);
  }
`;

export function MobileNav() {
  const user = useUser();
  const pathname = usePathname();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  if (!user) return null;

  const tabs = [
    { href: '/', label: 'Home', icon: RiHome5Line, activeIcon: RiHome5Fill, exact: true },
    { href: '/explore', label: 'Explore', icon: RiCompass3Line, activeIcon: RiCompass3Fill },
    { create: true },
    { href: '/messages', label: 'Messages', icon: RiMessage3Line, activeIcon: RiMessage3Fill, badge: unreadMessages },
    { href: `/profile/${user._id}`, label: 'Profile', icon: RiUser3Line, activeIcon: RiUser3Fill },
  ];

  return (
    <BottomBar aria-label="Main">
      {tabs.map((tab) => {
        if (tab.create) {
          return (
            <Link key="create" href="/compose/tweet" className="create" aria-label="Create Post">
              <RiAddLine />
            </Link>
          );
        }
        const active = isActive(pathname, tab);
        const Icon = active ? tab.activeIcon : tab.icon;
        return (
          <Link key={tab.href} href={tab.href} aria-label={tab.label} aria-current={active ? 'page' : undefined}>
            <Icon />
            {tab.badge > 0 && (
              <Badge className="count" aria-label={`${tab.badge} unread`}>
                {tab.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </BottomBar>
  );
}
