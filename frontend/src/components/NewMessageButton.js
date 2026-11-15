'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RiEditBoxLine, RiSearchLine } from 'react-icons/ri';
import { errorMessage } from '@/lib/api';
import { useProfiles, useStartConversation } from '@/lib/queries';
import { useUser } from '@/context/UserContext';
import Modal from './Modal';
import { Avatar, Button, IconButton, Input, Spinner } from './ui';

const PeopleResults = styled.div`
  margin-top: 12px;
  max-height: 360px;
  overflow-y: auto;

  button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 8px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: var(--bg-hover);
    }

    span {
      display: block;
      font-size: 12px;
      color: var(--text-muted);
    }
  }
`;

/** Opens a people search to start (or reopen) a conversation. */
export default function NewMessageButton({ children, variant = 'icon' }) {
  const router = useRouter();
  const me = useUser();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data, isFetching } = useProfiles({ q: q.trim() || undefined, limit: 20 });
  const start = useStartConversation();
  const people = (data?.pages[0]?.results ?? []).filter((p) => p.user && p.user._id !== me?._id);

  return (
    <>
      {variant === 'icon' ? (
        <IconButton $tone="primary" aria-label="New message" title="New message" onClick={() => setOpen(true)}>
          <span className="icon">
            <RiEditBoxLine />
          </span>
        </IconButton>
      ) : (
        <Button $variant="primary" onClick={() => setOpen(true)}>
          {children}
        </Button>
      )}
      {open && (
        <Modal label="New message" title="New message" maxWidth={480} onDismiss={() => setOpen(false)}>
          <label style={{ position: 'relative', display: 'block' }}>
            <span className="sr-only">Search people</span>
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people by name or username" style={{ paddingLeft: 40 }} />
            <RiSearchLine aria-hidden style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-faint)' }} />
          </label>
          {start.isError && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{errorMessage(start.error)}</p>}
          <PeopleResults>
            {isFetching && !people.length ? (
              <Spinner />
            ) : people.length ? (
              people.map((p) => (
                <button
                  key={p._id}
                  disabled={start.isPending}
                  onClick={() =>
                    start.mutate(p.user._id, {
                      onSuccess: (conv) => {
                        setOpen(false);
                        router.push(`/messages/${conv._id}`);
                      },
                    })
                  }
                >
                  <Avatar src={p.user.avatar} name={p.user.name} $size={40} />
                  <div>
                    <strong>{p.user.name}</strong>
                    <span>@{p.user.username}</span>
                  </div>
                </button>
              ))
            ) : (
              <p style={{ padding: 12, color: 'var(--text-muted)' }}>No people found.</p>
            )}
          </PeopleResults>
        </Modal>
      )}
    </>
  );
}

