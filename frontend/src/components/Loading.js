'use client';

import styled from 'styled-components';
import { RiQuillPenFill } from 'react-icons/ri';
import { Spinner } from './ui';

const Screen = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  color: var(--primary);
  font-size: 56px;
`;

/** Full-screen loader (app start) or an inline spinner (`inline`). */
export default function Loading({ inline = false }) {
  if (inline) return <Spinner />;
  return (
    <Screen role="status" aria-label="Loading">
      <RiQuillPenFill />
    </Screen>
  );
}
