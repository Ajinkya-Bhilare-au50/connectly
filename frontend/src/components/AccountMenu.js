'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import {
  RiArrowLeftRightLine,
  RiCheckLine,
  RiLogoutBoxRLine,
  RiMoreFill,
  RiQuestionLine,
  RiSettings3Line,
  RiUser3Line,
  RiUserAddLine,
} from 'react-icons/ri';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { getSavedAccounts, switchAccount } from '@/lib/api';
import { media } from '@/lib/theme';
import { Avatar } from './ui';

/** Close a popover on outside click or Escape, returning focus to its trigger. */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, wrapRef, triggerRef, toggle: () => setOpen((o) => !o), close: () => setOpen(false) };
}

export const MenuPanel = styled.div`
  position: absolute;
  z-index: 60;
  min-width: 248px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
  box-shadow: var(--shadow-menu);
  ${({ $placement }) =>
    $placement === 'up'
      ? 'bottom: calc(100% + 8px); left: 0;'
      : $placement === 'down-left'
        ? 'top: calc(100% + 8px); left: 0;'
        : 'top: calc(100% + 8px); right: 0;'}

  hr {
    margin: 6px 4px;
    border: none;
    border-top: 1px solid var(--border);
  }
`;

export const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  font-size: 14px;
  text-align: left;
  color: ${({ $danger }) => ($danger ? 'var(--danger)' : 'var(--text)')};
  font-weight: ${({ $danger }) => ($danger ? 600 : 500)};
  cursor: pointer;

  svg {
    font-size: 18px;
    flex-shrink: 0;
  }

  &:hover,
  &:focus-visible {
    background: ${({ $danger }) => ($danger ? 'var(--danger-soft)' : 'var(--bg-hover)')};
    outline: none;
  }
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 10px;

  div {
    min-width: 0;
    line-height: 1.3;
  }

  strong,
  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: 12px;
    color: var(--text-muted);
  }
`;

const Wrap = styled.div`
  position: relative;
`;

const AvatarTrigger = styled.button`
  display: flex;
  border: none;
  background: none;
  border-radius: 9999px;
  cursor: pointer;
  padding: 2px;

  &:hover {
    box-shadow: 0 0 0 3px var(--primary-100);
  }
`;

const ChipTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: var(--radius-lg);
  background: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--bg-hover);
  }

  .who {
    flex: 1;
    min-width: 0;
    line-height: 1.3;
  }

  .who strong,
  .who span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .who span {
    font-size: 12px;
    color: var(--text-muted);
  }

  ${media.belowDesktop} {
    justify-content: center;

    .who,
    .more {
      display: none;
    }
  }
`;

/**
 * Account menu (Profile, Settings, Switch account, Help & Support, Sign Out).
 * `variant="avatar"` (top bar) or `"chip"` (bottom of the sidebar).
 */
export default function AccountMenu({ variant = 'avatar' }) {
  const user = useUser();
  const { logout } = useAuth();
  const { open, toggle, close, wrapRef, triggerRef } = usePopover();
  const [switching, setSwitching] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (open) setAccounts(getSavedAccounts());
    else setSwitching(false);
  }, [open]);

  if (!user) return null;

  const others = accounts.filter((a) => a._id !== user._id);
  const triggerProps = {
    ref: triggerRef,
    onClick: toggle,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-label': 'Account menu',
    'data-cy': 'auth-nav-dropdown-button',
  };

  return (
    <Wrap ref={wrapRef}>
      {variant === 'chip' ? (
        <ChipTrigger {...triggerProps}>
          <Avatar src={user.avatar} name={user.name} $size={40} />
          <div className="who">
            <strong>{user.name}</strong>
            <span>@{user.username}</span>
          </div>
          <RiMoreFill className="more" aria-hidden />
        </ChipTrigger>
      ) : (
        <AvatarTrigger {...triggerProps}>
          <Avatar src={user.avatar} name={user.name} $size={38} />
        </AvatarTrigger>
      )}

      {open && (
        <MenuPanel role="menu" $placement={variant === 'chip' ? 'up' : 'down'}>
          <Who>
            <Avatar src={user.avatar} name={user.name} $size={40} />
            <div>
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
            </div>
          </Who>
          <hr />
          {switching ? (
            <>
              <MenuItem role="menuitem" as="div" aria-disabled="true" style={{ cursor: 'default' }}>
                <Avatar src={user.avatar} name={user.name} $size={24} />
                <span style={{ flex: 1 }}>@{user.username}</span>
                <RiCheckLine aria-label="Current account" style={{ color: 'var(--primary)' }} />
              </MenuItem>
              {others.map((a) => (
                <MenuItem key={a._id} role="menuitem" onClick={() => switchAccount(a._id)}>
                  <Avatar src={a.avatar} name={a.name} $size={24} />
                  <span>@{a.username}</span>
                </MenuItem>
              ))}
              <MenuItem role="menuitem" as={Link} href="/signin?add=1" onClick={close}>
                <RiUserAddLine aria-hidden /> Add another account
              </MenuItem>
              <hr />
              <MenuItem role="menuitem" onClick={() => setSwitching(false)}>
                Back
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem role="menuitem" as={Link} href={`/profile/${user._id}`} onClick={close}>
                <RiUser3Line aria-hidden /> Profile
              </MenuItem>
              <MenuItem role="menuitem" as={Link} href="/settings" onClick={close}>
                <RiSettings3Line aria-hidden /> Settings
              </MenuItem>
              <MenuItem role="menuitem" onClick={() => setSwitching(true)}>
                <RiArrowLeftRightLine aria-hidden /> Switch account
              </MenuItem>
              <hr />
              <MenuItem role="menuitem" as={Link} href="/help" onClick={close}>
                <RiQuestionLine aria-hidden /> Help &amp; Support
              </MenuItem>
              <hr />
              <MenuItem
                role="menuitem"
                $danger
                data-cy="auth-nav-logout-button"
                onClick={() => {
                  close();
                  logout();
                }}
              >
                <RiLogoutBoxRLine aria-hidden /> Sign Out
              </MenuItem>
            </>
          )}
        </MenuPanel>
      )}
    </Wrap>
  );
}
