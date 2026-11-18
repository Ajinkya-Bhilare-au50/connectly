'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { RiCloseLine } from 'react-icons/ri';

const STORAGE_KEY = 'credit-banner-dismissed';

const Bar = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 48px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 13px;
  text-align: center;

  strong {
    font-weight: 600;
    white-space: nowrap;
  }
`;

const Close = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: #fff;
  font-size: 18px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 1px;
  }
`;

/** "Developed by Ajinkya Bhilare" strip at the top of every page. Closing it is remembered in this browser. */
export default function CreditBanner() {
  // Hidden until we've checked whether this visitor already closed it (avoids a flash).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // storage unavailable: it just closes for this visit
    }
  };

  return (
    <Bar role="region" aria-label="About this site">
      <span>
        Developed by <strong>Ajinkya Bhilare</strong>
      </span>
      <Close type="button" onClick={close} aria-label="Close banner" title="Close">
        <RiCloseLine />
      </Close>
    </Bar>
  );
}
