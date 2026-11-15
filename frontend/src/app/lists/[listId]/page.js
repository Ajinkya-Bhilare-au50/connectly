'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RiFileList3Line, RiLockLine, RiSearchLine, RiUserAddLine } from 'react-icons/ri';
import { errorMessage } from '@/lib/api';
import { useDeleteList, useList, useListMember, useListMembers, useListTweets, useProfiles, useUpdateList } from '@/lib/queries';
import { useUser } from '@/context/UserContext';
import TweetsBoard from '@/components/TweetsBoard';
import ListForm from '@/components/ListForm';
import Modal, { ConfirmDialog } from '@/components/Modal';
import { ProfileRow } from '@/components/ProfilesGrid';
import { Avatar, Button, Card, EmptyState, ErrorState, Input, PageHeader, SkeletonList, Tab, TabBar } from '@/components/ui';

const Hero = styled(Card)`
  padding: 24px;
  text-align: center;

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: var(--radius-xl);
    background: var(--brand-gradient);
    color: #fff;
    font-size: 30px;
  }

  h2 {
    margin-top: 10px;
    font-size: 22px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  p {
    margin-top: 4px;
    color: var(--text-muted);
  }

  .owner {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 13px;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  }
`;

function AddPeople({ list, onClose }) {
  const [q, setQ] = useState('');
  const { data } = useProfiles({ q: q.trim() || undefined, limit: 20 });
  const member = useListMember();
  const members = new Set((list.members ?? []).map(String));
  const people = (data?.pages[0]?.results ?? []).filter((p) => p.user);

  return (
    <Modal label="Add people" title="Add people to this list" maxWidth={520} onDismiss={onClose} flush>
      <div style={{ padding: '0 16px 12px', position: 'relative' }}>
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" style={{ paddingLeft: 40 }} />
        <RiSearchLine aria-hidden style={{ position: 'absolute', left: 30, top: 14, color: 'var(--text-faint)' }} />
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {people.map((p) => {
          const inList = members.has(p.user._id);
          return (
            <ProfileRow
              key={p._id}
              profile={p}
              showBio={false}
              action={
                <Button
                  $variant={inList ? 'secondary' : 'primary'}
                  $size="sm"
                  $pill
                  disabled={member.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    member.mutate({ listId: list._id, userId: p.user._id, add: !inList });
                  }}
                >
                  {inList ? 'Remove' : 'Add'}
                </Button>
              }
            />
          );
        })}
      </div>
    </Modal>
  );
}

function Members({ list, isOwner }) {
  const { data: members, isPending, error, refetch } = useListMembers(list._id);
  const member = useListMember();
  if (error) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (isPending) return <SkeletonList rows={3} />;
  if (!members.length) {
    return (
      <EmptyState title="No members yet" icon={RiUserAddLine}>
        {isOwner ? 'Add people to see their posts in this list.' : 'This list has no members.'}
      </EmptyState>
    );
  }
  return (
    <Card $clip $flushMobile>
      {members.map((u) => (
        <ProfileRow
          key={u._id}
          profile={{ _id: u._id, user: u, followers: [] }}
          showBio={false}
          action={
            isOwner ? (
              <Button
                $variant="dangerOutline"
                $size="sm"
                $pill
                disabled={member.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  member.mutate({ listId: list._id, userId: u._id, add: false });
                }}
              >
                Remove
              </Button>
            ) : (
              <span />
            )
          }
        />
      ))}
    </Card>
  );
}

export default function ListPage() {
  const { listId } = useParams();
  const router = useRouter();
  const me = useUser();
  const { data: list, isPending, error, refetch } = useList(listId);
  const tweets = useListTweets(listId);
  const update = useUpdateList();
  const remove = useDeleteList();
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (error) {
    return (
      <>
        <PageHeader back title="List" />
        {error.response?.status === 404 ? (
          <EmptyState title="This list doesn't exist" icon={RiFileList3Line}>
            It may have been deleted, or it's private.
          </EmptyState>
        ) : (
          <ErrorState message={errorMessage(error)} onRetry={refetch} />
        )}
      </>
    );
  }
  if (isPending) {
    return (
      <>
        <PageHeader back title="List" />
        <SkeletonList rows={2} />
      </>
    );
  }

  const isOwner = me?._id === (list.owner?._id ?? list.owner);

  return (
    <>
      <PageHeader back title={list.name} subtitle={`${list.memberCount} ${list.memberCount === 1 ? 'member' : 'members'}`}>
        <TabBar role="tablist" aria-label="List">
          <Tab selected={tab === 'posts'} onClick={() => setTab('posts')}>
            Posts
          </Tab>
          <Tab selected={tab === 'members'} onClick={() => setTab('members')}>
            Members
          </Tab>
        </TabBar>
      </PageHeader>

      <Hero>
        <span className="icon" aria-hidden>
          <RiFileList3Line />
        </span>
        <div>
          <h2>
            {list.name}
            {list.private && <RiLockLine aria-label="Private list" />}
          </h2>
        </div>
        {list.description && <p>{list.description}</p>}
        {list.owner?.name && (
          <span className="owner">
            <Avatar src={list.owner.avatar} name={list.owner.name} $size={20} /> {list.owner.name} · @{list.owner.username}
          </span>
        )}
        {isOwner && (
          <div className="actions">
            <Button $variant="primary" $size="md" onClick={() => setAdding(true)}>
              <RiUserAddLine aria-hidden /> Add people
            </Button>
            <Button $variant="secondary" $size="md" onClick={() => setEditing(true)}>
              Edit list
            </Button>
            <Button $variant="dangerOutline" $size="md" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </div>
        )}
      </Hero>

      {tab === 'posts' ? (
        <TweetsBoard
          query={tweets}
          emptyTitle="No posts yet"
          emptyText={list.memberCount ? 'Posts from people in this list will show up here.' : 'Add people to this list to see their posts.'}
          emptyIcon={RiFileList3Line}
        />
      ) : (
        <Members list={list} isOwner={isOwner} />
      )}

      {adding && <AddPeople list={list} onClose={() => setAdding(false)} />}
      {editing && (
        <ListForm
          title="Edit list"
          initial={list}
          busy={update.isPending}
          error={update.error}
          onClose={() => setEditing(false)}
          onSubmit={(data) => update.mutate({ id: list._id, ...data }, { onSuccess: () => setEditing(false) })}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete list?"
          message="This can't be undone. The people in it won't be notified."
          busy={remove.isPending}
          onCancel={() => setDeleting(false)}
          onConfirm={() => remove.mutate(list._id, { onSuccess: () => router.replace('/lists') })}
        />
      )}
    </>
  );
}
