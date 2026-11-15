'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useMutation } from '@tanstack/react-query';
import { RiArrowRightSLine, RiComputerLine, RiMoonLine, RiSettings3Line, RiSunLine } from 'react-icons/ri';
import client, { errorMessage } from '@/lib/api';
import { useColorMode } from '@/lib/colorMode';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { useAlert } from '@/context/AlertContext';
import RequireAuth from '@/components/RequireAuth';
import { ConfirmDialog } from '@/components/Modal';
import { Avatar, Button, Card, FeedbackMessage, PageHeader } from '@/components/ui';

const Section = styled.section`
  & + & {
    border-top: 1px solid var(--border);
  }

  h2 {
    padding: 16px 16px 4px;
    font-size: 18px;
    font-weight: 600;
  }

  > p {
    padding: 0 16px 12px;
    color: var(--text-muted);
  }
`;

const Row = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  transition: background-color 0.2s;

  &:hover {
    background: var(--bg-hover);
  }

  div {
    flex: 1;
    line-height: 1.3;
  }

  span {
    display: block;
    color: var(--text-muted);
  }

  svg {
    font-size: 22px;
    color: var(--text-muted);
  }
`;

const Modes = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 4px 16px 16px;
`;

const ModeOption = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 12px;
  border: 2px solid ${({ $selected }) => ($selected ? 'var(--primary)' : 'var(--border)')};
  background: ${({ $selected }) => ($selected ? 'var(--primary-soft)' : 'transparent')};
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;

  svg {
    font-size: 24px;
  }

  &:hover {
    border-color: var(--primary);
  }
`;

const Danger = styled.div`
  padding: 4px 16px 20px;
`;

function Settings() {
  const user = useUser();
  const { logout } = useAuth();
  const router = useRouter();
  const { setAlert } = useAlert();
  const [mode, setMode] = useColorMode();
  const [confirming, setConfirming] = useState(false);

  const deleteAccount = useMutation({
    mutationFn: () => client.delete(`/users/${user._id}`),
    onSuccess: () => {
      router.replace('/');
      logout();
      setAlert({ type: 'success', msg: 'Your account was deleted.' });
    },
  });

  const modes = [
    ['light', 'Light', RiSunLine],
    ['dark', 'Dark', RiMoonLine],
    ['system', 'System', RiComputerLine],
  ];

  return (
    <>
      <PageHeader title="Settings" icon={RiSettings3Line} />

      <Card $clip $flushMobile>
      <Section>
        <h2>Your account</h2>
        <Row href="/edit-profile">
          <Avatar src={user.avatar} name={user.name} $size={40} />
          <div>
            <strong>{user.name}</strong>
            <span>
              @{user.username} · {user.email}
            </span>
          </div>
          <RiArrowRightSLine />
        </Row>
        <Row href="/edit-profile">
          <div>
            Edit profile
            <span>Name, bio, location, website, avatar and cover image</span>
          </div>
          <RiArrowRightSLine />
        </Row>
      </Section>

      <Section>
        <h2>Display</h2>
        <p>Choose how the app looks on this device.</p>
        <Modes role="radiogroup" aria-label="Color mode">
          {modes.map(([value, label, Icon]) => (
            <ModeOption
              key={value}
              role="radio"
              aria-checked={mode === value}
              $selected={mode === value}
              onClick={() => setMode(value)}
            >
              <Icon aria-hidden />
              {label}
            </ModeOption>
          ))}
        </Modes>
      </Section>

      <Section>
        <h2>Delete account</h2>
        <p>Permanently delete your account, profile and all your posts.</p>
        <Danger>
          {deleteAccount.isError && <FeedbackMessage>{errorMessage(deleteAccount.error)}</FeedbackMessage>}
          <Button $variant="dangerOutline" onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        </Danger>
      </Section>
      </Card>

      {confirming && (
        <ConfirmDialog
          title="Delete your account?"
          message="This is permanent. Your profile and all your posts will be removed."
          confirmLabel="Delete account"
          busy={deleteAccount.isPending}
          onConfirm={() => deleteAccount.mutate()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}
