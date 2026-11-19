'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBin6Line,
  RiSearchLine,
  RiShieldStarLine,
  RiShieldUserLine,
  RiUserLine,
} from 'react-icons/ri';
import { useUser } from '@/context/UserContext';
import { useAdminStats, useAdminUserMutation, useAdminUsers } from '@/lib/queries';
import { format } from 'date-fns';
import { errorMessage } from '@/lib/api';
import { media } from '@/lib/theme';
import RequireAuth from '@/components/RequireAuth';
import { ConfirmDialog } from '@/components/Modal';
import { Avatar, Button, Card, EmptyState, ErrorState, Input, PageHeader, SkeletonList } from '@/components/ui';

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  ${media.mobile} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 12px;
  }
`;

const Stat = styled(Card)`
  padding: 14px 16px;

  ${media.mobile} {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  .label {
    color: var(--text-muted);
    font-size: 13px;
  }

  .value {
    margin-top: 4px;
    font-size: 24px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
`;

const Search = styled.label`
  position: relative;
  flex: 1 1 240px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 18px;
    pointer-events: none;
  }

  input {
    padding-left: 38px;
  }
`;

const Segmented = styled.div`
  display: inline-flex;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--bg-subtle);

  button {
    padding: 7px 14px;
    border: none;
    border-radius: calc(var(--radius-md) - 2px);
    background: transparent;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }

  button[aria-pressed='true'] {
    background: var(--bg-elevated, var(--bg));
    color: var(--text);
    box-shadow: var(--shadow-card);
  }
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;

  & + & {
    border-top: 1px solid var(--border);
  }

  .who {
    flex: 1;
    min-width: 0;
  }

  .name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text);
  }

  .name a {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: inherit;
  }

  .name a:hover {
    text-decoration: underline;
  }

  .meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
    font-size: 13px;
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  ${media.mobile} {
    flex-wrap: wrap;

    .actions {
      width: 100%;
      padding-left: 52px;
    }
  }
`;

const RoleTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 9999px;
  background: ${({ $you }) => ($you ? 'var(--bg-subtle)' : 'var(--primary-soft)')};
  color: ${({ $you }) => ($you ? 'var(--text-muted)' : 'var(--primary)')};
  font-size: 11px;
  font-weight: 700;
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 14px;

  div {
    display: flex;
    gap: 8px;
  }
`;

/** Waits until the user stops typing before searching. */
function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function UserRow({ user, me, onAction }) {
  const isMe = user._id === me._id;
  const isAdmin = user.role === 'admin';
  return (
    <Row>
      <Avatar src={user.avatar} name={user.name} $size={40} />
      <div className="who">
        <div className="name">
          <Link href={`/profile/${user._id}`}>{user.name}</Link>
          {isAdmin && (
            <RoleTag>
              <RiShieldStarLine aria-hidden /> Admin
            </RoleTag>
          )}
          {isMe && <RoleTag $you>You</RoleTag>}
        </div>
        <div className="meta">
          @{user.username} · {user.email} · joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
        </div>
      </div>
      <div className="actions">
        <Button
          $variant="outline"
          $size="sm"
          onClick={() => onAction(isAdmin ? 'removeAdmin' : 'makeAdmin', user)}
          disabled={isMe && isAdmin}
          title={isMe && isAdmin ? 'Another admin has to remove your admin role' : undefined}
        >
          {isAdmin ? 'Remove admin' : 'Make admin'}
        </Button>
        {!isMe && (
          <Button $variant="dangerOutline" $size="sm" onClick={() => onAction('delete', user)} aria-label={`Delete ${user.name}`}>
            <RiDeleteBin6Line aria-hidden /> Delete
          </Button>
        )}
      </div>
    </Row>
  );
}

const CONFIRM = {
  delete: (u) => ({
    title: `Delete ${u.name}?`,
    message: `This permanently removes @${u.username}'s account, posts, messages and photos.`,
    confirmLabel: 'Delete account',
  }),
  makeAdmin: (u) => ({
    title: `Make ${u.name} an admin?`,
    message: 'Admins can manage every account and edit or delete any post.',
    confirmLabel: 'Make admin',
    confirmVariant: 'primary',
  }),
  removeAdmin: (u) => ({
    title: `Remove ${u.name}'s admin role?`,
    message: 'They will become a normal user.',
    confirmLabel: 'Remove admin',
    confirmVariant: 'primary',
  }),
};

function Admin() {
  const me = useUser();
  const isAdmin = me.role === 'admin';
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null); // { action, user } awaiting confirmation
  const q = useDebounced(search);

  useEffect(() => setPage(1), [q, role]);

  const stats = useAdminStats(isAdmin);
  const users = useAdminUsers({ q, role, page }, isAdmin);
  const mutation = useAdminUserMutation();

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Admin" icon={RiShieldUserLine} />
        <Card>
          <EmptyState title="Admins only" icon={RiShieldUserLine}>
            This page is for site administrators. Your account doesn&apos;t have admin rights.
          </EmptyState>
        </Card>
      </>
    );
  }

  const data = users.data;
  const confirm = pending && CONFIRM[pending.action](pending.user);

  return (
    <>
      <PageHeader title="Admin" subtitle="Manage accounts and roles" icon={RiShieldUserLine} />

      <Stats>
        {[
          ['Users', stats.data?.users],
          ['Admins', stats.data?.admins],
          ['Posts', stats.data?.posts],
          ['Replies', stats.data?.replies],
        ].map(([label, value]) => (
          <Stat key={label}>
            <div className="label">{label}</div>
            <div className="value">{value == null ? '–' : value.toLocaleString('en')}</div>
          </Stat>
        ))}
      </Stats>

      <Card>
        <Toolbar>
          <Search>
            <RiSearchLine aria-hidden />
            <Input
              type="search"
              placeholder="Search name, username or email"
              aria-label="Search users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Search>
          <Segmented role="group" aria-label="Filter by role">
            <button type="button" aria-pressed={role === ''} onClick={() => setRole('')}>
              All
            </button>
            <button type="button" aria-pressed={role === 'admin'} onClick={() => setRole('admin')}>
              Admins
            </button>
          </Segmented>
        </Toolbar>

        {users.isError ? (
          <ErrorState message={errorMessage(users.error)} onRetry={() => users.refetch()} />
        ) : !data ? (
          <SkeletonList rows={6} />
        ) : data.results.length === 0 ? (
          <EmptyState title="No users found" icon={RiUserLine}>
            Try a different name, username or email.
          </EmptyState>
        ) : (
          <>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, opacity: users.isPlaceholderData ? 0.6 : 1 }}>
              {data.results.map((user) => (
                <UserRow key={user._id} user={user} me={me} onAction={(action, u) => setPending({ action, user: u })} />
              ))}
            </ul>
            <Pager>
              <span>
                {data.totalResults.toLocaleString('en')} {data.totalResults === 1 ? 'user' : 'users'} · page {data.page} of{' '}
                {Math.max(1, data.totalPages)}
              </span>
              <div>
                <Button $variant="outline" $size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page">
                  <RiArrowLeftSLine aria-hidden />
                </Button>
                <Button
                  $variant="outline"
                  $size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages}
                  aria-label="Next page"
                >
                  <RiArrowRightSLine aria-hidden />
                </Button>
              </div>
            </Pager>
          </>
        )}
      </Card>

      {confirm && (
        <ConfirmDialog
          {...confirm}
          busy={mutation.isPending}
          onConfirm={() => mutation.mutate(pending, { onSettled: () => setPending(null) })}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <Admin />
    </RequireAuth>
  );
}
