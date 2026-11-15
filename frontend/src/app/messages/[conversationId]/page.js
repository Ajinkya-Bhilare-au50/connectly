'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { format, isSameDay } from 'date-fns';
import { RiArrowLeftLine, RiCloseLine, RiEmotionLine, RiImageAddLine, RiSendPlaneFill } from 'react-icons/ri';
import client, { errorMessage } from '@/lib/api';
import { ACCEPT_ATTR, checkImageFile, mediaUrl, uploadMedia } from '@/lib/uploads';
import { useConversation } from '@/lib/queries';
import { useUser } from '@/context/UserContext';
import { media } from '@/lib/theme';
import { usePopover } from '@/components/AccountMenu';
import { Avatar, Button, ErrorState, IconButton, Spinner } from '@/components/ui';

const POLL_MS = 4000;
const EMOJIS = ['😀', '😂', '😍', '🥳', '😎', '🤔', '😢', '😮', '👍', '👏', '🙏', '🔥', '🎉', '❤️', '💯', '✨', '🚀', '☕', '💻', '📸'];

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);

  .back {
    display: none;
  }

  a:hover strong {
    text-decoration: underline;
  }

  span {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
  }

  ${media.mobile} {
    .back {
      display: inline-flex;
    }
  }
`;

const Thread = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--page);
`;

const Day = styled.p`
  align-self: center;
  margin: 12px 0 6px;
  padding: 2px 10px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  font-size: 11px;
  color: var(--text-muted);
`;

const BubbleRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
`;

const Bubble = styled.div`
  max-width: min(75%, 520px);
  padding: ${({ $image }) => ($image ? '4px' : '9px 14px')};
  border-radius: 18px;
  border-bottom-right-radius: ${({ $mine }) => ($mine ? '6px' : '18px')};
  border-bottom-left-radius: ${({ $mine }) => ($mine ? '18px' : '6px')};
  background: ${({ $mine }) => ($mine ? 'var(--primary)' : 'var(--bg)')};
  color: ${({ $mine }) => ($mine ? '#fff' : 'var(--text)')};
  border: 1px solid ${({ $mine }) => ($mine ? 'transparent' : 'var(--border)')};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  opacity: ${({ $pending }) => ($pending ? 0.7 : 1)};

  img {
    max-width: 100%;
    max-height: 320px;
    border-radius: 14px;
  }

  p {
    padding: ${({ $image }) => ($image ? '6px 10px 4px' : '0')};
  }
`;

const Status = styled.span`
  margin: 2px 4px 4px;
  font-size: 11px;
  color: ${({ $failed }) => ($failed ? 'var(--danger)' : 'var(--text-muted)')};

  button {
    border: none;
    background: none;
    color: var(--primary);
    font-weight: 600;
    font-size: 11px;
    cursor: pointer;
    margin-left: 4px;
  }
`;

const Form = styled.form`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg);

  textarea {
    flex: 1;
    min-height: 40px;
    max-height: 140px;
    padding: 9px 14px;
    border: 1px solid var(--border);
    border-radius: 20px;
    outline: none;
    resize: none;
    background: var(--bg-subtle);
    line-height: 1.4;

    &:focus {
      border-color: var(--primary);
      background: var(--bg);
    }
  }
`;

const Attachment = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 12px;

  img {
    height: 96px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }

  button {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    border: none;
    border-radius: 9999px;
    background: rgba(15, 23, 42, 0.7);
    color: #fff;
    padding: 2px;
    cursor: pointer;
  }
`;

const EmojiPanel = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 8px;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(5, 36px);
  gap: 2px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
  box-shadow: var(--shadow-menu);

  button {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    font-size: 20px;
    cursor: pointer;

    &:hover {
      background: var(--bg-hover);
    }
  }
`;

let tempCounter = 0;

/** Messages for one conversation: initial load, older history, polling for new ones, optimistic sending. */
function useChat(conversationId) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const lastIdRef = useRef(null);

  const markRead = useCallback(() => {
    client
      .post(`/conversations/${conversationId}/read`)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {});
  }, [conversationId, queryClient]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await client.get(`/conversations/${conversationId}/messages`, { params: { limit: 30 } });
      setMessages(data.results);
      setHasMore(data.hasMore);
      lastIdRef.current = data.results.at(-1)?._id ?? null;
      setStatus('ready');
      markRead();
    } catch {
      setStatus('error');
    }
  }, [conversationId, markRead]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for new messages while the chat is open (and the tab is visible).
  useEffect(() => {
    if (status !== 'ready') return undefined;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const params = lastIdRef.current ? { after: lastIdRef.current } : {};
        const { data } = await client.get(`/conversations/${conversationId}/messages`, { params });
        if (!data.results.length) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m._id));
          return [...prev, ...data.results.filter((m) => !known.has(m._id))];
        });
        lastIdRef.current = data.results.at(-1)._id;
        markRead();
      } catch {
        // offline: try again on the next tick
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [conversationId, status, markRead]);

  const loadOlder = async () => {
    const first = messages.find((m) => !m.pending);
    if (!first) return;
    setLoadingOlder(true);
    try {
      const { data } = await client.get(`/conversations/${conversationId}/messages`, { params: { before: first._id, limit: 30 } });
      setMessages((prev) => [...data.results, ...prev]);
      setHasMore(data.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async ({ text, file, retryOf }) => {
    const tempId = retryOf?.tempId ?? `temp-${++tempCounter}`;
    const optimistic = {
      _id: tempId,
      tempId,
      pending: true,
      text,
      localImage: file ? URL.createObjectURL(file) : retryOf?.localImage,
      file: file ?? retryOf?.file,
      createdAt: new Date().toISOString(),
      mine: true,
    };
    setMessages((prev) => (retryOf ? prev.map((m) => (m.tempId === tempId ? optimistic : m)) : [...prev, optimistic]));

    try {
      const image = optimistic.file ? await uploadMedia(optimistic.file, { maxSize: 1600 }) : undefined;
      const { data } = await client.post(`/conversations/${conversationId}/messages`, { text, ...(image ? { image } : {}) });
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.tempId !== tempId);
        return withoutTemp.some((m) => m._id === data.message._id) ? withoutTemp : [...withoutTemp, data.message];
      });
      lastIdRef.current = data.message._id;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, pending: false, failed: errorMessage(err) } : m)));
    }
  };

  return { messages, status, hasMore, loadOlder, loadingOlder, send, reload: load };
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const me = useUser();
  const { data: conversation, error } = useConversation(conversationId);
  const { messages, status, hasMore, loadOlder, loadingOlder, send, reload } = useChat(conversationId);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const threadRef = useRef(null);
  const fileInput = useRef(null);
  const textRef = useRef(null);
  const emoji = usePopover();
  const lastCountRef = useRef(0);

  // Keep the newest message in view when messages arrive.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el && messages.length > lastCountRef.current) el.scrollTop = el.scrollHeight;
    lastCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => () => file && URL.revokeObjectURL(file.preview), [file]);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <ErrorState message={error.response?.status === 404 ? "This conversation doesn't exist." : errorMessage(error)} />
      </div>
    );
  }

  const other = conversation?.otherUser;
  const lastMineIndex = messages.map((m) => m.sender === me._id || m.mine).lastIndexOf(true);

  function submit(e) {
    e?.preventDefault();
    const value = text.trim();
    if (!value && !file) return;
    send({ text: value, file: file?.file });
    setText('');
    setFile(null);
    textRef.current?.focus();
  }

  return (
    <>
      <Header>
        <IconButton as={Link} href="/messages" className="back" aria-label="Back to chats">
          <span className="icon">
            <RiArrowLeftLine />
          </span>
        </IconButton>
        {other ? (
          <Link href={`/profile/${other._id}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar src={other.avatar} name={other.name} $size={40} />
            <div>
              <strong>{other.name}</strong>
              <span>@{other.username}</span>
            </div>
          </Link>
        ) : (
          <strong>{conversation ? 'Deleted account' : ' '}</strong>
        )}
      </Header>

      <Thread ref={threadRef} aria-live="polite" aria-label="Messages">
        {status === 'loading' && <Spinner />}
        {status === 'error' && (
          <ErrorState message="Couldn't load messages. Check your connection." onRetry={reload} />
        )}
        {hasMore && (
          <Button $variant="secondary" $size="sm" onClick={loadOlder} disabled={loadingOlder} style={{ alignSelf: 'center', marginBottom: 8 }}>
            {loadingOlder ? 'Loading…' : 'Load earlier messages'}
          </Button>
        )}
        {status === 'ready' && messages.length === 0 && (
          <p style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>
            Say hello to {other?.name?.split(' ')[0] || 'them'} 👋
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.mine || m.sender === me._id;
          const date = new Date(m.createdAt);
          const newDay = i === 0 || !isSameDay(date, new Date(messages[i - 1].createdAt));
          const imageSrc = m.localImage || (m.image ? mediaUrl(m.image) : null);
          return (
            <div key={m._id}>
              {newDay && <Day>{format(date, 'EEEE, MMM d')}</Day>}
              <BubbleRow $mine={mine}>
                <span className="sr-only">{mine ? 'You said' : `${other?.name ?? 'They'} said`}:</span>
                <Bubble $mine={mine} $image={!!imageSrc} $pending={m.pending} title={format(date, 'PPpp')}>
                  {imageSrc && <img src={imageSrc} alt="Attached image" />}
                  {m.text && <p>{m.text}</p>}
                </Bubble>
                {m.failed ? (
                  <Status $failed role="alert">
                    Failed to send · {m.failed}
                    <button type="button" onClick={() => send({ text: m.text, retryOf: m })}>
                      Retry
                    </button>
                  </Status>
                ) : m.pending ? (
                  <Status>Sending…</Status>
                ) : mine && i === lastMineIndex ? (
                  <Status>
                    {format(date, 'h:mm a')} · {conversation?.seenByOther ? 'Seen' : 'Sent'}
                  </Status>
                ) : null}
              </BubbleRow>
            </div>
          );
        })}
      </Thread>

      <Form onSubmit={submit} aria-label="Write a message">
        {file && (
          <Attachment>
            <img src={file.preview} alt="Image to send" />
            <button type="button" aria-label="Remove image" onClick={() => setFile(null)}>
              <RiCloseLine />
            </button>
          </Attachment>
        )}
        {emoji.open && (
          <EmojiPanel ref={emoji.wrapRef} role="menu" aria-label="Emoji">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                role="menuitem"
                aria-label={`Insert ${e}`}
                onClick={() => {
                  setText((t) => t + e);
                  emoji.close();
                  textRef.current?.focus();
                }}
              >
                {e}
              </button>
            ))}
          </EmojiPanel>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTR}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              checkImageFile(f);
              setFile({ file: f, preview: URL.createObjectURL(f) });
              setFileError('');
            } catch (err) {
              setFileError(err.message);
            }
          }}
        />
        <IconButton type="button" $tone="primary" $active aria-label="Attach image" title="Attach image" onClick={() => fileInput.current?.click()}>
          <span className="icon">
            <RiImageAddLine />
          </span>
        </IconButton>
        <IconButton
          type="button"
          ref={emoji.triggerRef}
          $tone="primary"
          $active
          aria-label="Insert emoji"
          aria-haspopup="menu"
          aria-expanded={emoji.open}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={emoji.toggle}
        >
          <span className="icon">
            <RiEmotionLine />
          </span>
        </IconButton>
        <textarea
          ref={textRef}
          rows={1}
          value={text}
          maxLength={1000}
          placeholder={fileError || 'Start a new message'}
          aria-label="Message"
          aria-invalid={!!fileError}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter adds a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <IconButton type="submit" $tone="primary" $active aria-label="Send" disabled={!text.trim() && !file}>
          <span className="icon">
            <RiSendPlaneFill />
          </span>
        </IconButton>
      </Form>
    </>
  );
}
