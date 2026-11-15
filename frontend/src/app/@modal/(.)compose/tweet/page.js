'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal, { ConfirmDialog } from '@/components/Modal';
import RequireAuth from '@/components/RequireAuth';
import Composer from '@/components/Composer';

// Intercepts /compose/tweet from inside the app; asks before throwing away an unsaved draft.
export default function CreatePostModal() {
  const router = useRouter();
  const dirtyRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const onDirtyChange = useCallback((dirty) => {
    dirtyRef.current = dirty;
  }, []);

  const close = () => router.back();
  const requestClose = () => (dirtyRef.current ? setConfirming(true) : close());

  return (
    <RequireAuth>
      <Modal label="Create post" title="Create Post" onDismiss={requestClose}>
        <Composer bare autoFocus onCreated={close} onDirtyChange={onDirtyChange} />
      </Modal>
      {confirming && (
        <ConfirmDialog
          title="Discard post?"
          message="Your draft will be lost."
          confirmLabel="Discard"
          onConfirm={close}
          onCancel={() => setConfirming(false)}
        />
      )}
    </RequireAuth>
  );
}
