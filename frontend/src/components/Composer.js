'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  RiAddLine,
  RiBarChartBoxLine,
  RiCalendarEventLine,
  RiCloseLine,
  RiImage2Line,
  RiVideoLine,
} from 'react-icons/ri';
import { useUser } from '@/context/UserContext';
import { useAlert } from '@/context/AlertContext';
import { useCreateTweet } from '@/lib/queries';
import { errorMessage } from '@/lib/api';
import { ACCEPT_ATTR, VIDEO_ACCEPT_ATTR, checkImageFile, checkVideoFile, uploadMedia } from '@/lib/uploads';
import { media } from '@/lib/theme';
import { Avatar, Button, Card, FeedbackMessage, IconButton, Input, Select } from './ui';

const MAX = 280;
const POLL_DURATIONS = [
  [1, '1 hour'],
  [24, '1 day'],
  [72, '3 days'],
  [168, '7 days'],
];

const Wrap = styled(Card).attrs({ as: 'form' })`
  padding: 16px 20px;
  outline: ${({ $dragging }) => ($dragging ? '2px dashed var(--primary)' : 'none')};
  outline-offset: -6px;

  ${({ $bare }) =>
    $bare &&
    `
    border: none;
    box-shadow: none;
    padding: 4px 0 0;
  `}

  ${media.mobile} {
    ${({ $bare }) => !$bare && 'border-radius: 0; border-left: none; border-right: none; padding: 12px 16px;'}
  }
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Text = styled.textarea`
  display: block;
  width: 100%;
  min-height: ${({ $compact }) => ($compact ? '44px' : '56px')};
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  outline: none;
  resize: none;
  overflow: hidden;
  background: var(--bg-subtle);
  font-size: 15px;
  line-height: 1.45;
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;

  &::placeholder {
    color: var(--text-faint);
  }

  &:focus {
    background: var(--bg);
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-100);
  }
`;

const Attachment = styled.div`
  position: relative;
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;

  img,
  video {
    width: 100%;
    max-height: 380px;
    object-fit: contain;
    background: var(--bg-subtle);
  }
`;

const Remove = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 9999px;
  font-size: 18px;
  color: #fff;
  background: rgba(15, 23, 42, 0.7);
  cursor: pointer;

  &:hover {
    background: rgba(15, 23, 42, 0.85);
  }
`;

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  font-size: 12px;
  color: var(--text-muted);

  .bar {
    flex: 1;
    height: 6px;
    border-radius: 9999px;
    background: var(--primary-100);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.2s;
  }
`;

const Editor = styled.fieldset`
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);

  legend {
    padding: 0 6px;
    font-size: 13px;
    font-weight: 600;
  }

  .grid {
    display: grid;
    gap: 8px;
  }

  .option {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);

  .tools {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin-left: -8px;
  }

  .tool {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;

    svg {
      font-size: 18px;
      color: var(--primary);
    }

    &:hover:not(:disabled) {
      background: var(--primary-soft);
      color: var(--text);
    }

    &[aria-pressed='true'] {
      background: var(--primary-soft);
      color: var(--primary);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  ${media.mobile} {
    .tool span {
      display: none;
    }
  }
`;

const Counter = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ $over }) => ($over ? 'var(--danger)' : 'var(--text-muted)')};
`;

/** Circular progress showing how much of the 280 characters is used. */
function CharRing({ length }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(length / MAX, 1);
  const remaining = MAX - length;
  const color = remaining < 0 ? 'var(--danger)' : remaining <= 20 ? 'var(--warning)' : 'var(--primary)';
  return (
    <Counter $over={remaining < 0} aria-label={`${remaining} characters remaining`}>
      {remaining <= 20 && remaining}
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <circle cx="11" cy="11" r={r} fill="none" stroke="var(--border)" strokeWidth="2" />
        <circle
          cx="11"
          cy="11"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
          transform="rotate(-90 11 11)"
        />
      </svg>
    </Counter>
  );
}

/** Local date-time string for <input type="datetime-local"> (e.g. "2026-11-20T18:30"). */
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyPoll = () => ({ options: ['', ''], durationHours: 24 });
const emptyEvent = () => ({ title: '', startsAt: toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)), location: '' });

/** Problems with the current attachment, or '' if it's fine. */
function attachmentError(kind, poll, event) {
  if (kind === 'poll') {
    const opts = poll.options.map((o) => o.trim());
    if (opts.some((o) => !o)) return 'Fill in every poll option (or remove empty ones).';
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return 'Poll options must be different.';
  }
  if (kind === 'event') {
    if (!event.title.trim()) return 'Give your event a title.';
    if (!event.startsAt || new Date(event.startsAt) <= new Date()) return 'Pick a date and time in the future.';
  }
  return '';
}

/**
 * Write a post or a reply with an optional photo, video, poll or event.
 * - `replyTo`: tweet id when replying
 * - `bare`: no card chrome (inside a modal)
 * - `onDirtyChange(bool)`: tells the parent if there's an unsaved draft
 */
export default function Composer({
  replyTo,
  placeholder,
  submitLabel = 'Post',
  onCreated,
  onDirtyChange,
  autoFocus = false,
  bare = false,
  compact = false,
}) {
  const user = useUser();
  const { setAlert } = useAlert();
  const createTweet = useCreateTweet();
  const [text, setText] = useState('');
  const [kind, setKind] = useState(null); // 'image' | 'video' | 'poll' | 'event' | null
  const [file, setFile] = useState(null); // { file, preview }
  const [poll, setPoll] = useState(emptyPoll);
  const [event, setEvent] = useState(emptyEvent);
  const [progress, setProgress] = useState(null); // 0-100 while uploading
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef(null);
  const imageInput = useRef(null);
  const videoInput = useRef(null);
  const abortRef = useRef(null);

  // Grow the textarea with its content.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // Free the preview's object URL when it changes or the composer unmounts.
  useEffect(() => () => file && URL.revokeObjectURL(file.preview), [file]);

  const dirty = text.trim().length > 0 || kind !== null;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const uploading = progress !== null;
  const busy = uploading || createTweet.isPending;

  function reset() {
    setText('');
    setKind(null);
    setFile(null);
    setPoll(emptyPoll());
    setEvent(emptyEvent());
    setError('');
  }

  function pickFile(f, type) {
    if (!f) return;
    try {
      if (type === 'video') checkVideoFile(f);
      else checkImageFile(f);
      setFile({ file: f, preview: URL.createObjectURL(f) });
      setKind(type);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  function choose(next) {
    setError('');
    if (next === 'image') return imageInput.current?.click();
    if (next === 'video') return videoInput.current?.click();
    setFile(null);
    setKind((k) => (k === next ? null : next));
  }

  function removeAttachment() {
    setFile(null);
    setKind(null);
  }

  const problem = attachmentError(kind, poll, event);
  const hasContent = text.trim().length > 0 || kind !== null;
  const canPost = hasContent && text.length <= MAX && !busy;

  async function submit(e) {
    e?.preventDefault();
    if (!canPost) return;
    if (problem) return setError(problem);
    setError('');

    const payload = { text, ...(replyTo ? { replyTo } : {}) };
    if (kind === 'poll') payload.poll = { options: poll.options.map((o) => o.trim()), durationHours: poll.durationHours };
    if (kind === 'event') {
      payload.event = {
        title: event.title.trim(),
        startsAt: new Date(event.startsAt).toISOString(),
        location: event.location.trim(),
      };
    }

    if (file && (kind === 'image' || kind === 'video')) {
      const controller = new AbortController();
      abortRef.current = controller;
      setProgress(0);
      try {
        payload[kind] = await uploadMedia(file.file, { kind, onProgress: setProgress, signal: controller.signal });
      } catch (err) {
        setProgress(null);
        setError(
          controller.signal.aborted
            ? 'Upload cancelled.'
            : err.response
              ? errorMessage(err)
              : "Your upload didn't finish. Check your connection and try again."
        );
        return;
      }
      setProgress(null);
    }

    createTweet.mutate(payload, {
      onSuccess: () => {
        reset();
        setAlert({ type: 'success', msg: replyTo ? 'Your reply was posted.' : 'Your post is live.' });
        onCreated?.();
      },
      onError: (err) => setError(errorMessage(err)),
    });
  }

  function onKeyDown(e) {
    // Ctrl/Cmd + Enter posts.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
  }

  function onPaste(e) {
    const pasted = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (pasted) {
      e.preventDefault();
      pickFile(pasted, 'image');
    }
  }

  const dropHandlers = {
    onDragOver: (e) => {
      if ([...e.dataTransfer.types].includes('Files')) {
        e.preventDefault();
        setDragging(true);
      }
    },
    onDragLeave: (e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false),
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) pickFile(dropped, dropped.type.startsWith('video/') ? 'video' : 'image');
    },
  };

  if (!user) return null;

  const firstName = user.name.split(' ')[0];
  const tools = [
    ['image', 'Photo', RiImage2Line],
    ['video', 'Video', RiVideoLine],
    ['poll', 'Poll', RiBarChartBoxLine],
    ['event', 'Event', RiCalendarEventLine],
  ];

  return (
    <Wrap onSubmit={submit} $bare={bare} $dragging={dragging} {...dropHandlers} aria-label={replyTo ? 'Reply' : 'Create a post'}>
      <Row>
        <Avatar src={user.avatar} name={user.name} $size={44} />
        <Body>
          <Text
            ref={textRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={placeholder || `What's on your mind, ${firstName}?`}
            aria-label={replyTo ? 'Reply' : 'Tweet text'}
            autoFocus={autoFocus}
            disabled={busy}
            $compact={compact}
          />

          {file && (kind === 'image' || kind === 'video') && (
            <Attachment>
              {!uploading && (
                <Remove type="button" aria-label={`Remove ${kind === 'video' ? 'video' : 'photo'}`} onClick={removeAttachment}>
                  <RiCloseLine />
                </Remove>
              )}
              {kind === 'video' ? (
                <video src={file.preview} controls muted playsInline preload="metadata" aria-label="Selected video" />
              ) : (
                <img src={file.preview} alt="Selected image" />
              )}
              {uploading && (
                <Progress role="status" aria-live="polite">
                  <div
                    className="bar"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Upload progress"
                  >
                    <div className="fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span>Uploading… {progress}%</span>
                  <Button type="button" $variant="secondary" $size="sm" onClick={() => abortRef.current?.abort()}>
                    Cancel
                  </Button>
                </Progress>
              )}
            </Attachment>
          )}

          {kind === 'poll' && (
            <Editor>
              <legend>Poll</legend>
              <div className="grid">
                {poll.options.map((opt, i) => (
                  <div className="option" key={i}>
                    <Input
                      value={opt}
                      maxLength={25}
                      placeholder={`Option ${i + 1}${i >= 2 ? ' (optional)' : ''}`}
                      aria-label={`Poll option ${i + 1}`}
                      onChange={(e) =>
                        setPoll((p) => ({ ...p, options: p.options.map((o, j) => (j === i ? e.target.value : o)) }))
                      }
                    />
                    {poll.options.length > 2 && (
                      <IconButton
                        type="button"
                        $tone="danger"
                        aria-label={`Remove option ${i + 1}`}
                        onClick={() => setPoll((p) => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                      >
                        <span className="icon">
                          <RiCloseLine />
                        </span>
                      </IconButton>
                    )}
                  </div>
                ))}
              </div>
              <div className="footer">
                {poll.options.length < 4 ? (
                  <Button type="button" $variant="ghost" $size="sm" onClick={() => setPoll((p) => ({ ...p, options: [...p.options, ''] }))}>
                    <RiAddLine aria-hidden /> Add option
                  </Button>
                ) : (
                  <span />
                )}
                <label>
                  Poll length{' '}
                  <Select
                    value={poll.durationHours}
                    onChange={(e) => setPoll((p) => ({ ...p, durationHours: Number(e.target.value) }))}
                    style={{ display: 'inline-block', width: 'auto', minHeight: 36, padding: '4px 10px' }}
                  >
                    {POLL_DURATIONS.map(([h, label]) => (
                      <option key={h} value={h}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button type="button" $variant="dangerOutline" $size="sm" onClick={removeAttachment}>
                  Remove poll
                </Button>
              </div>
            </Editor>
          )}

          {kind === 'event' && (
            <Editor>
              <legend>Event</legend>
              <div className="grid">
                <label>
                  Title
                  <Input
                    value={event.title}
                    maxLength={80}
                    placeholder="e.g. Next.js meetup"
                    onChange={(e) => setEvent((ev) => ({ ...ev, title: e.target.value }))}
                  />
                </label>
                <label>
                  Date and time
                  <Input
                    type="datetime-local"
                    value={event.startsAt}
                    min={toLocalInput(new Date())}
                    onChange={(e) => setEvent((ev) => ({ ...ev, startsAt: e.target.value }))}
                  />
                </label>
                <label>
                  Location (optional)
                  <Input
                    value={event.location}
                    maxLength={80}
                    placeholder="City, venue or link"
                    onChange={(e) => setEvent((ev) => ({ ...ev, location: e.target.value }))}
                  />
                </label>
              </div>
              <div className="footer">
                <span />
                <Button type="button" $variant="dangerOutline" $size="sm" onClick={removeAttachment}>
                  Remove event
                </Button>
              </div>
            </Editor>
          )}

          {error && <FeedbackMessage>{error}</FeedbackMessage>}
        </Body>
      </Row>

      <Toolbar>
        <div className="tools">
          <input
            ref={imageInput}
            type="file"
            accept={ACCEPT_ATTR}
            hidden
            data-testid="composer-file"
            onChange={(e) => {
              pickFile(e.target.files?.[0], 'image');
              e.target.value = '';
            }}
          />
          <input
            ref={videoInput}
            type="file"
            accept={VIDEO_ACCEPT_ATTR}
            hidden
            data-testid="composer-video"
            onChange={(e) => {
              pickFile(e.target.files?.[0], 'video');
              e.target.value = '';
            }}
          />
          {tools.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className="tool"
              aria-label={`Add ${label.toLowerCase()}`}
              aria-pressed={kind === value}
              title={label}
              onClick={() => choose(value)}
              disabled={busy}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </div>
        {text.length > 0 && <CharRing length={text.length} />}
        <Button type="submit" $variant="primary" $pill disabled={!canPost} style={{ minWidth: 76 }}>
          {uploading ? 'Uploading…' : createTweet.isPending ? 'Posting…' : submitLabel}
        </Button>
      </Toolbar>
    </Wrap>
  );
}
