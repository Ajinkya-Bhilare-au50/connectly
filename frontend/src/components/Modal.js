'use client';

import { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { RiCloseLine } from 'react-icons/ri';
import { media } from '@/lib/theme';
import { Button, IconButton } from './ui';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 5vh 16px;
  overflow-y: auto;
  background: var(--bg-overlay);
  animation: ${fadeIn} 0.15s ease-out;

  ${media.mobile} {
    padding: 0;
  }
`;

const Dialog = styled.div`
  position: relative;
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth}px;
  background: var(--bg);
  border-radius: 16px;
  box-shadow: var(--shadow-dialog);
  outline: none;
  animation: ${popIn} 0.18s ease-out;

  ${media.mobile} {
    min-height: 100%;
    border-radius: 0;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 53px;
  padding: 0 8px;

  h2 {
    font-size: 20px;
    font-weight: 800;
  }
`;

const Body = styled.div`
  padding: ${({ $flush }) => ($flush ? '0' : '0 16px 16px')};
`;

/** Accessible modal: closes on backdrop click, Escape or the close button. */
export default function Modal({ onDismiss, label, title, maxWidth = 600, flush = false, children }) {
  const dialogRef = useRef(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && dismissRef.current();
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <Overlay onMouseDown={(e) => e.target === e.currentTarget && dismissRef.current()}>
      <Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        $maxWidth={maxWidth}
      >
        <Top>
          <IconButton type="button" aria-label="Close" onClick={() => dismissRef.current()}>
            <span className="icon">
              <RiCloseLine />
            </span>
          </IconButton>
          {title && <h2>{title}</h2>}
        </Top>
        <Body $flush={flush}>{children}</Body>
      </Dialog>
    </Overlay>
  );
}

const ConfirmBox = styled.div`
  padding: 0 16px 8px;

  h2 {
    font-size: 20px;
    font-weight: 800;
  }

  p {
    margin: 8px 0 24px;
    color: var(--text-muted);
  }

  button + button {
    margin-top: 12px;
  }
`;

/** Small confirm dialog for destructive actions. */
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal label={title} maxWidth={320} onDismiss={onCancel}>
      <ConfirmBox>
        <h2>{title}</h2>
        <p>{message}</p>
        <Button $variant="danger" $size="lg" $block onClick={onConfirm} disabled={busy}>
          {busy ? 'Working...' : confirmLabel}
        </Button>
        <Button $variant="outline" $size="lg" $block onClick={onCancel}>
          Cancel
        </Button>
      </ConfirmBox>
    </Modal>
  );
}
