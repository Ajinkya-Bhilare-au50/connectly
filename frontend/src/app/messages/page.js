'use client';

import styled from 'styled-components';
import { RiMessage3Line } from 'react-icons/ri';
import NewMessageButton from '@/components/NewMessageButton';

const Empty = styled.div`
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

  .action {
    margin-top: 8px;
  }
`;

export default function MessagesIndex() {
  return (
    <Empty>
      <RiMessage3Line aria-hidden />
      <h2>Select a message</h2>
      <p>Choose a conversation from the list, or start a new one.</p>
      <div className="action">
        <NewMessageButton variant="button">New message</NewMessageButton>
      </div>
    </Empty>
  );
}
