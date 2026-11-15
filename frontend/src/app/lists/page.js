'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RiAddLine, RiArrowRightSLine, RiFileList3Line, RiLockLine } from 'react-icons/ri';
import { errorMessage } from '@/lib/api';
import { useCreateList, useMyLists } from '@/lib/queries';
import RequireAuth from '@/components/RequireAuth';
import ListForm from '@/components/ListForm';
import { Button, Card, EmptyState, ErrorState, PageHeader, SkeletonList } from '@/components/ui';

const Row = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  transition: background-color 0.15s;

  & + & {
    border-top: 1px solid var(--border);
  }

  &:hover {
    background: var(--bg-hover);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: var(--radius-lg);
    background: var(--brand-gradient);
    color: #fff;
    font-size: 22px;
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  strong {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > svg {
    font-size: 20px;
    color: var(--text-muted);
  }
`;

function Lists() {
  const router = useRouter();
  const { data: lists, isPending, error, refetch } = useMyLists();
  const create = useCreateList();
  const [creating, setCreating] = useState(false);

  const newButton = (
    <Button $variant="primary" $size="sm" onClick={() => setCreating(true)}>
      <RiAddLine aria-hidden /> New list
    </Button>
  );

  return (
    <>
      <PageHeader title="Lists" icon={RiFileList3Line} action={newButton} />
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : isPending ? (
        <SkeletonList rows={3} avatar={48} />
      ) : lists.length === 0 ? (
        <EmptyState
          title="You haven't created any lists yet"
          icon={RiFileList3Line}
          action={
            <Button $variant="primary" onClick={() => setCreating(true)}>
              Create a list
            </Button>
          }
        >
          Lists let you follow posts from a hand-picked group of people, separate from your main feed.
        </EmptyState>
      ) : (
        <Card $clip $flushMobile>
          {lists.map((list) => (
            <Row key={list._id} href={`/lists/${list._id}`}>
              <span className="icon" aria-hidden>
                <RiFileList3Line />
              </span>
              <div className="info">
                <strong>
                  {list.name}
                  {list.private && <RiLockLine aria-label="Private list" />}
                </strong>
                <p>
                  {list.memberCount} {list.memberCount === 1 ? 'member' : 'members'}
                  {list.description ? ` · ${list.description}` : ''}
                </p>
              </div>
              <RiArrowRightSLine aria-hidden />
            </Row>
          ))}
        </Card>
      )}

      {creating && (
        <ListForm
          title="Create a new list"
          submitLabel="Create"
          busy={create.isPending}
          error={create.error}
          onClose={() => setCreating(false)}
          onSubmit={(data) =>
            create.mutate(data, {
              onSuccess: (list) => {
                setCreating(false);
                router.push(`/lists/${list._id}`);
              },
            })
          }
        />
      )}
    </>
  );
}

export default function ListsPage() {
  return (
    <RequireAuth>
      <Lists />
    </RequireAuth>
  );
}
