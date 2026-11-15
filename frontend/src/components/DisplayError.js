'use client';

import styled from 'styled-components';
import { errorMessage } from '@/lib/api';

const Box = styled.div`
  margin: 24px 16px;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  color: var(--danger);
  background: var(--danger-soft);
`;

export default function DisplayError({ error }) {
  if (!error) return null;
  return <Box role="alert">{errorMessage(error)}</Box>;
}
