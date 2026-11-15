'use client';

import { useState } from 'react';
import { errorMessage } from '@/lib/api';
import Modal from './Modal';
import { Button, Checkbox, FeedbackMessage, Field } from './ui';

/** Create / edit a list: name, description, private. */
export default function ListForm({ title, initial = {}, submitLabel = 'Save', onSubmit, onClose, busy, error }) {
  const [name, setName] = useState(initial.name ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [isPrivate, setPrivate] = useState(initial.private ?? false);
  const [touched, setTouched] = useState(false);
  const nameError = touched && !name.trim() ? 'Give your list a name.' : '';

  return (
    <Modal label={title} title={title} maxWidth={480} onDismiss={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!name.trim()) return;
          onSubmit({ name: name.trim(), description: description.trim(), private: isPrivate });
        }}
      >
        <Field label="Name" value={name} maxLength={25} onChange={(e) => setName(e.target.value)} error={nameError} autoFocus />
        <Field label="Description" value={description} maxLength={100} multiline onChange={(e) => setDescription(e.target.value)} />
        <div style={{ marginTop: 16 }}>
          <Checkbox checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)}>
            <strong>Make private</strong>
            <br />
            <span style={{ color: 'var(--text-muted)' }}>Only you can see a private list.</span>
          </Checkbox>
        </div>
        {error && <FeedbackMessage>{errorMessage(error)}</FeedbackMessage>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <Button type="button" $variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" $variant="primary" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
