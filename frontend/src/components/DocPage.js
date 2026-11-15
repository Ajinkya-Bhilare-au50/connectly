'use client';

import styled from 'styled-components';
import { Card } from './ui';

/** Readable long-form text inside a card (help, terms, privacy). */
export const Doc = styled(Card)`
  padding: 24px 28px;
  line-height: 1.65;

  h2 {
    margin: 24px 0 8px;
    font-size: 18px;
    font-weight: 600;
  }

  h2:first-child {
    margin-top: 0;
  }

  p + p,
  ul + p {
    margin-top: 10px;
  }

  ul {
    list-style: disc;
    padding-left: 20px;
    margin: 8px 0;
  }

  li + li {
    margin-top: 4px;
  }

  a {
    color: var(--primary);
    text-decoration: underline;
  }

  .note {
    margin-bottom: 20px;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    background: var(--primary-soft);
    font-size: 13px;
  }

  details {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
  }

  details + details {
    margin-top: 8px;
  }

  summary {
    font-weight: 600;
    cursor: pointer;
  }

  details p {
    margin-top: 8px;
    color: var(--text-muted);
  }

  kbd {
    padding: 1px 6px;
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    background: var(--bg-subtle);
  }
`;
