'use client';

import styled, { keyframes } from 'styled-components';
import { useAlert } from '@/context/AlertContext';

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
`;

const Stack = styled.div`
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: calc(100vw - 32px);

  @media (max-width: 499px) {
    bottom: 76px;
  }
`;

const Toast = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  color: #fff;
  background: ${({ $type }) => ($type === 'error' ? 'var(--danger)' : 'var(--primary)')};
  box-shadow: var(--shadow);
  animation: ${slideUp} 0.2s ease-out;
`;

/** Toast notifications (bottom centre). Click a toast to dismiss it. */
export default function Alerts() {
  const { alerts, removeAlert } = useAlert();
  if (!alerts.length) return null;

  return (
    <Stack role="status" aria-live="polite">
      {alerts.map((alert) => (
        <Toast key={alert.id} $type={alert.type} onClick={() => removeAlert(alert.id)} title="Dismiss">
          {alert.msg}
        </Toast>
      ))}
    </Stack>
  );
}
