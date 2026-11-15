'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import styled from 'styled-components';
import { RiMessage3Line } from 'react-icons/ri';
import { errorMessage } from '@/lib/api';
import { shortTime } from '@/lib/format';
import { useConversations } from '@/lib/queries';
import { useUser } from '@/context/UserContext';
import { media } from '@/lib/theme';
import RequireAuth from '@/components/RequireAuth';
import NewMessageButton from '@/components/NewMessageButton';
import { Avatar, Card, ErrorState, PageHeader, SkeletonBlock } from '@/components/ui';

const Layout = styled(Card)`
  display: grid;
  grid-template-columns: 340px 1fr;
  height: calc(100vh - var(--header-height) - 48px);
  min-height: 480px;
  overflow: hidden;

  ${media.belowDesktop} {
    grid-template-columns: 280px 1fr;
  }

  ${media.mobile} {
    display: block;
    height: calc(100vh - var(--header-height) - 72px);
    border-radius: 0;
    border-left: none;
    border-right: none;

    /* Mobile: list OR chat, never both */
    > .list {
      display: ${({ $chatOpen }) => ($chatOpen ? 'none' : 'flex')};
      height: 100%;
    }
    > .chat {
      display: ${({ $chatOpen }) => ($chatOpen ? 'flex' : 'none')};
      height: 100%;
    }
  }
`;

const ListPane = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--border);

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);

    h2 {
      font-size: 18px;
      font-weight: 600;
    }
  }

  .items {
    flex: 1;
    overflow-y: auto;
  }

  ${media.mobile} {
    border-right: none;
  }
`;

const ChatPane = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
`;

const ConvItem = styled(Link)`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  transition: background-color 0.15s;
  background: ${({ $active }) => ($active ? 'var(--primary-soft)' : 'transparent')};
  border-left: 3px solid ${({ $active }) => ($active ? 'var(--primary)' : 'transparent')};

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--primary-soft)' : 'var(--bg-hover)')};
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .top {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .handle,
  time {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  time {
    margin-left: auto;
  }

  .preview {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: ${({ $unread }) => ($unread ? 'var(--text)' : 'var(--text-muted)')};
    font-weight: ${({ $unread }) => ($unread ? 600 : 400)};

    span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    margin-left: auto;
    border-radius: 9999px;
    background: var(--primary);
  }
`;

const Placeholder = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  text-align: center;
  color: var(--text-muted);

  svg {
    font-size: 44px;
    color: var(--primary);
  }

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
  }
`;

function ConversationList({ activeId }) {
  const me = useUser();
  const { data: conversations, isPending, error, refetch } = useConversations();

  return (
    <ListPane className="list">
      <div className="head">
        <h2>Chats</h2>
        <NewMessageButton />
      </div>
      <div className="items" role="list" aria-label="Conversations">
        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={refetch} />
        ) : isPending ? (
          <div style={{ padding: 16, display: 'grid', gap: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} $h={44} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <Placeholder>
            <p>No conversations yet.</p>
            <NewMessageButton variant="button">Start a conversation</NewMessageButton>
          </Placeholder>
        ) : (
          conversations.map((c) => {
            const other = c.otherUser;
            const last = c.lastMessage;
            const mine = last?.sender === me?._id;
            const preview = last ? `${mine ? 'You: ' : ''}${last.text || (last.hasImage ? 'Sent a photo' : '')}` : 'No messages yet';
            return (
              <ConvItem key={c._id} href={`/messages/${c._id}`} role="listitem" $active={c._id === activeId} $unread={c.unread}>
                <Avatar src={other?.avatar} name={other?.name || 'Deleted account'} $size={44} />
                <div className="info">
                  <div className="top">
                    <span className="name">{other?.name || 'Deleted account'}</span>
                    {other && <span className="handle">@{other.username}</span>}
                    {last && <time dateTime={last.createdAt}>{shortTime(last.createdAt)}</time>}
                  </div>
                  <div className="preview">
                    <span>{preview}</span>
                    {c.unread && (
                      <>
                        <span className="dot" aria-hidden />
                        <span className="sr-only">(unread)</span>
                      </>
                    )}
                  </div>
                </div>
              </ConvItem>
            );
          })
        )}
      </div>
    </ListPane>
  );
}

function MessagesShell({ children }) {
  const { conversationId } = useParams();
  return (
    <>
      <PageHeader title="Messages" icon={RiMessage3Line} />
      <Layout $chatOpen={!!conversationId}>
        <ConversationList activeId={conversationId} />
        <ChatPane className="chat">{children}</ChatPane>
      </Layout>
    </>
  );
}

export default function MessagesLayout({ children }) {
  return (
    <RequireAuth>
      <MessagesShell>{children}</MessagesShell>
    </RequireAuth>
  );
}

