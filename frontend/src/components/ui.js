'use client';

import { createContext, useContext, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import styled, { css, keyframes } from 'styled-components';
import { RiArrowLeftLine, RiErrorWarningLine, RiEyeLine, RiEyeOffLine, RiUser3Fill } from 'react-icons/ri';
import { media } from '@/lib/theme';
import { mediaUrl } from '@/lib/uploads';

export const PLACEHOLDER_AVATAR = '/portrait-placeholder.png';

// ------------------------------------------------------------------ buttons

const buttonVariants = {
  primary: css`
    background: var(--primary);
    color: #fff;
    &:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    &:disabled {
      background: var(--primary-muted);
      opacity: 1;
    }
  `,
  secondary: css`
    background: var(--bg);
    color: var(--text);
    border-color: var(--border);
    &:hover:not(:disabled) {
      background: var(--bg-subtle);
    }
  `,
  outline: css`
    background: transparent;
    color: var(--text);
    border-color: var(--border-strong);
    &:hover:not(:disabled) {
      background: var(--bg-hover);
    }
  `,
  primaryOutline: css`
    background: transparent;
    color: var(--primary);
    border-color: var(--primary);
    &:hover:not(:disabled) {
      background: var(--primary-soft);
    }
  `,
  strong: css`
    background: var(--strong);
    color: var(--on-strong);
    &:hover:not(:disabled) {
      background: var(--strong-hover);
    }
  `,
  danger: css`
    background: var(--danger);
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }
  `,
  dangerOutline: css`
    background: transparent;
    color: var(--danger);
    border-color: var(--danger);
    &:hover:not(:disabled) {
      background: var(--danger-soft);
    }
  `,
  ghost: css`
    background: transparent;
    color: var(--primary);
    &:hover:not(:disabled) {
      background: var(--primary-soft);
    }
  `,
};

const buttonSizes = {
  sm: css`
    min-height: 32px;
    padding: 0 14px;
    font-size: 13px;
  `,
  md: css`
    min-height: 40px;
    padding: 0 16px;
    font-size: 14px;
  `,
  lg: css`
    min-height: 44px;
    padding: 0 20px;
    font-size: 14px;
  `,
};

/**
 * <Button $variant="primary|secondary|outline|primaryOutline|strong|danger|dangerOutline|ghost"
 *         $size="sm|md|lg" $block $pill>
 */
export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: ${({ $pill }) => ($pill ? '9999px' : 'var(--radius-md)')};
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s, filter 0.15s, transform 0.05s;
  ${({ $size = 'md' }) => buttonSizes[$size]}
  ${({ $variant = 'primary' }) => buttonVariants[$variant]}
  ${({ $block }) => $block && 'width: 100%;'}

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  svg {
    font-size: 1.25em;
    flex-shrink: 0;
  }
`;

const tones = {
  primary: ['var(--primary)', 'var(--primary-soft)'],
  like: ['var(--like)', 'var(--like-soft)'],
  repost: ['var(--repost)', 'var(--repost-soft)'],
  danger: ['var(--danger)', 'var(--danger-soft)'],
  neutral: ['var(--text)', 'var(--bg-hover)'],
};

/** Icon button with a coloured hover halo. Put the icon in <span className="icon">. `$active` keeps the colour. */
export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ $active, $tone = 'neutral' }) => ($active ? tones[$tone][0] : 'var(--text-muted)')};
  font-size: 13px;
  transition: color 0.15s;

  .icon {
    display: inline-flex;
    padding: 8px;
    border-radius: 9999px;
    font-size: 18px;
    transition: background-color 0.15s;
  }

  &:hover:not(:disabled) {
    color: ${({ $tone = 'neutral' }) => tones[$tone][0]};
    .icon {
      background: ${({ $tone = 'neutral' }) => tones[$tone][1]};
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

// ------------------------------------------------------------------ surfaces

/** White surface with a subtle border (standard card). */
export const Card = styled.section`
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  ${({ $padded }) => $padded && 'padding: 20px 24px;'}
  ${({ $clip }) => $clip && 'overflow: hidden;'}

  ${media.mobile} {
    border-radius: ${({ $flushMobile }) => ($flushMobile ? '0' : 'var(--radius-lg)')};
    ${({ $flushMobile }) => $flushMobile && 'border-left: none; border-right: none;'}
    ${({ $padded }) => $padded && 'padding: 16px;'}
  }
`;

export const CardTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
`;

// ------------------------------------------------------------------ text & form

export const PrimaryHeading = styled.h1`
  font-size: 24px;
  font-weight: 650;
`;

export const Muted = styled.span`
  color: var(--text-muted);
`;

export const InfoText = styled.p`
  text-align: center;
  padding: 16px;
  color: var(--text-muted);
`;

export const FeedbackMessage = styled.div.attrs({ role: 'alert' })`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $isSuccess }) => ($isSuccess ? 'var(--success)' : 'var(--danger)')};
  padding: 4px 2px;
  font-size: 12px;

  &:empty {
    display: none;
  }
`;

const inputStyles = css`
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 14px;
  background: var(--bg);
  border: 1px solid ${({ $isError }) => ($isError ? 'var(--danger)' : 'var(--border)')};
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;

  &::placeholder {
    color: var(--text-faint);
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: var(--border-strong);
  }

  &:focus {
    border-color: ${({ $isError }) => ($isError ? 'var(--danger)' : 'var(--primary)')};
    box-shadow: 0 0 0 3px ${({ $isError }) => ($isError ? 'var(--danger-soft)' : 'var(--primary-100)')};
  }

  &:disabled,
  &[readonly] {
    background: var(--bg-subtle);
    color: var(--text-muted);
  }
`;

export const Input = styled.input`
  ${inputStyles}
`;

export const Textarea = styled.textarea`
  ${inputStyles}
  resize: vertical;
  min-height: 96px;
  font-family: inherit;
  line-height: 1.5;
`;

export const Select = styled.select`
  ${inputStyles}
  cursor: pointer;
`;

const FieldWrap = styled.div`
  & + & {
    margin-top: 16px;
  }
`;

const FieldLabel = styled.label`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);

  .count {
    font-weight: 400;
    color: var(--text-muted);
  }
`;

const InputBox = styled.div`
  position: relative;

  > svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
    color: var(--text-faint);
    pointer-events: none;
  }

  input {
    ${({ $hasIcon }) => $hasIcon && 'padding-left: 42px;'}
    ${({ $hasToggle }) => $hasToggle && 'padding-right: 46px;'}
  }
`;

const RevealButton = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;

  &:hover {
    color: var(--text);
    background: var(--bg-hover);
  }
`;

/**
 * Labelled input: visible label, optional leading `icon`, character counter (`maxLength`),
 * inline `error`, and a show/hide toggle for `type="password"`.
 */
export function Field({ label, error, hint, maxLength, multiline, icon: Icon, value = '', type = 'text', id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const Control = multiline ? Textarea : Input;

  return (
    <FieldWrap>
      <FieldLabel htmlFor={inputId}>
        <span>{label}</span>
        {maxLength ? (
          <span className="count">
            {value.length} / {maxLength}
          </span>
        ) : null}
      </FieldLabel>
      <InputBox $hasIcon={!!Icon && !multiline} $hasToggle={isPassword}>
        {Icon && !multiline && <Icon aria-hidden />}
        <Control
          id={inputId}
          value={value}
          maxLength={maxLength}
          type={isPassword && reveal ? 'text' : type}
          $isError={!!error}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {isPassword && (
          <RevealButton
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            aria-pressed={reveal}
          >
            {reveal ? <RiEyeOffLine /> : <RiEyeLine />}
          </RevealButton>
        )}
      </InputBox>
      {error ? (
        <FeedbackMessage id={errorId}>
          <RiErrorWarningLine aria-hidden /> {error}
        </FeedbackMessage>
      ) : hint ? (
        <Muted style={{ fontSize: 12 }}>{hint}</Muted>
      ) : null}
    </FieldWrap>
  );
}

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;

  input {
    width: 16px;
    height: 16px;
    margin-top: 1px;
    accent-color: var(--primary);
    cursor: pointer;
  }
`;

export function Checkbox({ children, ...props }) {
  return (
    <CheckLabel>
      <input type="checkbox" {...props} />
      <span>{children}</span>
    </CheckLabel>
  );
}

// ------------------------------------------------------------------ avatar

const avatarBox = css`
  width: ${({ $size = 40 }) => $size}px;
  height: ${({ $size = 40 }) => $size}px;
  flex-shrink: 0;
  border-radius: 9999px;
`;

/*
 * Avatar colors for people without a photo. Every pair keeps white initials readable
 * (≥ 3:1 contrast on both ends of the gradient).
 */
const AVATAR_COLORS = [
  ['#1D4ED8', '#3B82F6'], // blue
  ['#6D28D9', '#8B5CF6'], // violet
  ['#BE185D', '#EC4899'], // pink
  ['#B91C1C', '#EF4444'], // red
  ['#C2410C', '#EA580C'], // orange
  ['#B45309', '#D97706'], // amber
  ['#15803D', '#16A34A'], // green
  ['#0F766E', '#0D9488'], // teal
  ['#0E7490', '#0891B2'], // cyan
  ['#4338CA', '#4F46E5'], // indigo
  ['#A21CAF', '#C026D3'], // fuchsia
  ['#334155', '#475569'], // slate
];

/** Same name → same color, everywhere (simple string hash). */
export function avatarColor(name = '') {
  let hash = 5381;
  for (const ch of name.trim().toLowerCase()) hash = ((hash << 5) + hash + ch.codePointAt(0)) >>> 0;
  const [from, to] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

/** "Andres Wunsch" → "AW", "Fernando O'Connell" → "FO", "Ajinkya" → "A". */
export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = Array.from(words[0])[0] ?? '';
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}

/** Initial sits underneath; the photo covers it once loaded (no empty circle while loading). */
const AvatarFrame = styled.span`
  /* "&&" raises specificity so generic span rules in parent components can't restyle avatars. */
  && {
    ${avatarBox}
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: ${({ $bg }) => $bg || 'var(--brand-gradient)'};
    color: #fff;
    font-weight: 600;
    font-size: ${({ $size = 40, $chars = 1 }) => Math.round($size * ($chars > 1 ? 0.36 : 0.42))}px;
    letter-spacing: ${({ $chars = 1 }) => ($chars > 1 ? '0.02em' : '0')};
    line-height: 1;
    user-select: none;
  }

  && > span {
    display: inline;
    font-size: inherit;
    color: inherit;
  }

  && img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarInitial = styled.span`
  && {
    ${avatarBox}
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${({ $bg }) => $bg || 'var(--brand-gradient)'};
    color: #fff;
    font-weight: 600;
    font-size: ${({ $size = 40, $chars = 1 }) => Math.round($size * ($chars > 1 ? 0.36 : 0.42))}px;
    letter-spacing: ${({ $chars = 1 }) => ($chars > 1 ? '0.02em' : '0')};
    line-height: 1;
    user-select: none;
  }
`;

/**
 * Round avatar. Without a photo (or if the link is broken) it shows the person's
 * first + last initials on a color chosen from their name. Pass `name`, or an `alt`
 * like "Jane Doe's avatar".
 */
export function Avatar({ src, alt = '', name, $size = 40, className, style, ...rest }) {
  const url = mediaUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  const rawLabel = name || alt.replace(/'s avatar$/, '').replace(/ preview$/i, '');
  const label = rawLabel && !/avatar/i.test(rawLabel) ? rawLabel : '';
  const letters = initials(label);
  const fallback = letters || <RiUser3Fill aria-hidden />;
  const colors = { $bg: label ? avatarColor(label) : undefined, $chars: letters.length || 1 };

  if (!url || failed) {
    return (
      <AvatarInitial role="img" aria-label={alt || label || 'Avatar'} className={className} style={style} $size={$size} {...colors}>
        {fallback}
      </AvatarInitial>
    );
  }

  return (
    <AvatarFrame className={className} style={style} $size={$size} {...colors}>
      <span aria-hidden>{fallback}</span>
      <img src={url} alt={alt} onError={() => setFailed(true)} {...rest} />
    </AvatarFrame>
  );
}

// ------------------------------------------------------------------ page header (title goes into the top bar)

/** The top bar exposes a DOM node; pages render their title into it with <PageHeader>. */
export const PageTitleSlotContext = createContext(null);

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  .text {
    min-width: 0;
  }

  h1 {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title-icon {
    font-size: 22px;
    color: var(--text);
    flex-shrink: 0;
  }

  .action {
    margin-left: auto;
    padding-left: 8px;
  }
`;

const StickyTabs = styled.div`
  position: sticky;
  top: var(--header-height);
  z-index: 5;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;

  ${media.mobile} {
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
`;

/**
 * Sets the page title shown in the top bar (and the browser tab), with an optional back
 * button and `action` (e.g. a Save button). `children` (e.g. tabs) stick under the top bar.
 */
export function PageHeader({ title, subtitle, back, action, icon: Icon, children }) {
  const router = useRouter();
  const slot = useContext(PageTitleSlotContext);

  useEffect(() => {
    if (typeof title === 'string') document.title = `${title} · Connectly`;
  }, [title]);

  const row = (
    <TitleRow>
      {back && (
        <IconButton aria-label="Back" onClick={() => router.back()} style={{ marginLeft: -8 }}>
          <span className="icon">
            <RiArrowLeftLine />
          </span>
        </IconButton>
      )}
      {Icon && !back && <Icon className="title-icon" aria-hidden />}
      <div className="text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="action">{action}</div>}
    </TitleRow>
  );

  return (
    <>
      {slot ? createPortal(row, slot) : <Card $padded>{row}</Card>}
      {children && <StickyTabs>{children}</StickyTabs>}
    </>
  );
}

// ------------------------------------------------------------------ tabs

export const TabBar = styled.nav`
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
`;

const TabInner = styled.span`
  position: relative;
  display: inline-block;
  padding: 14px 0;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--primary);
    opacity: 0;
  }
`;

const TabBase = styled.button`
  flex: 1;
  min-width: max-content;
  padding: 0 12px;
  text-align: center;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-muted);
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  &[aria-selected='true'],
  &[aria-current='page'] {
    font-weight: 600;
    color: var(--primary);

    ${TabInner}::after {
      opacity: 1;
    }
  }
`;

/** Tab that is a button (`selected`) or, with `as={Link}` + `href`, a link (`current`). */
export function Tab({ selected, current, children, ...props }) {
  return (
    <TabBase
      role={props.as ? undefined : 'tab'}
      aria-selected={props.as ? undefined : !!selected}
      aria-current={current ? 'page' : undefined}
      {...props}
    >
      <TabInner>{children}</TabInner>
    </TabBase>
  );
}

// ------------------------------------------------------------------ states

const EmptyWrap = styled(Card)`
  padding: 40px 32px;
  text-align: center;

  .icon {
    font-size: 40px;
    color: var(--primary);
    margin-bottom: 8px;
  }

  h2 {
    font-size: 18px;
    font-weight: 600;
  }

  p {
    margin: 6px auto 0;
    max-width: 380px;
    color: var(--text-muted);
  }

  .actions {
    margin-top: 16px;
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  ${media.mobile} {
    padding: 32px 20px;
  }
`;

/** Empty state with an explanation and (optionally) one clear next action. */
export function EmptyState({ title, children, icon: Icon, action }) {
  return (
    <EmptyWrap>
      {Icon && <Icon className="icon" aria-hidden />}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action && <div className="actions">{action}</div>}
    </EmptyWrap>
  );
}

/** Error state with a retry button. */
export function ErrorState({ message, onRetry }) {
  return (
    <EmptyWrap role="alert">
      <RiErrorWarningLine className="icon" style={{ color: 'var(--danger)' }} aria-hidden />
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {onRetry && (
        <div className="actions">
          <Button $variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </EmptyWrap>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.div.attrs({ role: 'status', 'aria-label': 'Loading' })`
  width: ${({ $size = 24 }) => $size}px;
  height: ${({ $size = 24 }) => $size}px;
  margin: ${({ $inline }) => ($inline ? '0' : '20px auto')};
  border-radius: 50%;
  border: 3px solid var(--primary-100);
  border-top-color: var(--primary);
  animation: ${spin} 0.75s linear infinite;
  flex-shrink: 0;
`;

const shimmer = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

export const SkeletonBlock = styled.div`
  background: var(--skeleton);
  border-radius: ${({ $round }) => ($round ? '9999px' : '6px')};
  width: ${({ $w = '100%' }) => $w};
  height: ${({ $h = 12 }) => (typeof $h === 'number' ? `${$h}px` : $h)};
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

const SkeletonCard = styled(Card)`
  display: flex;
  gap: 12px;
  padding: 16px 20px;

  > div:last-child {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 4px;
  }
`;

/** Placeholder cards shown while a list loads (prevents layout jumps). */
export function SkeletonList({ rows = 4, avatar = 40 }) {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonCard key={i}>
          <SkeletonBlock $round $w={`${avatar}px`} $h={avatar} />
          <div>
            <SkeletonBlock $w="40%" />
            <SkeletonBlock $w="90%" />
            <SkeletonBlock $w="70%" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export const CenteredRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 16px;
`;

/** Small pill badge, e.g. unread counts. */
export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 9999px;
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
`;
