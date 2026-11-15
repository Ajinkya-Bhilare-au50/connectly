'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import pickBy from 'lodash/pickBy';
import isEmpty from 'lodash/isEmpty';
import { RiCameraLine, RiCloseLine } from 'react-icons/ri';
import client, { errorMessage } from '@/lib/api';
import { ACCEPT_ATTR, checkImageFile, mediaUrl, uploadImage } from '@/lib/uploads';
import { useForm } from '@/hooks';
import { useUser } from '@/context/UserContext';
import { useAlert } from '@/context/AlertContext';
import { useProfile } from '@/lib/queries';
import RequireAuth from '@/components/RequireAuth';
import DisplayError from '@/components/DisplayError';
import { Avatar, Button, Card, FeedbackMessage, Field, PageHeader, SkeletonList } from '@/components/ui';

const Cover = styled.div`
  position: relative;
  aspect-ratio: 3 / 1;
  background: var(--brand-gradient);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.3);
`;

const RoundButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 9999px;
  font-size: 22px;
  color: #fff;
  background: rgba(15, 20, 25, 0.75);
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(39, 44, 48, 0.75);
  }
`;

const AvatarWrap = styled.div`
  position: relative;
  z-index: 1;
  width: 112px;
  height: 112px;
  margin: -56px 0 0 16px;
  border-radius: 9999px;
  border: 4px solid var(--bg);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
  }
`;

const Hint = styled.p`
  padding: 8px 16px 0;
  font-size: 13px;
  color: var(--text-muted);
`;

const Form = styled.form`
  padding: 16px;
`;

const TEXT_FIELDS = [
  { name: 'name', label: 'Name', maxLength: 50 },
  { name: 'bio', label: 'Bio', maxLength: 255, multiline: true },
  { name: 'location', label: 'Location', maxLength: 255 },
  { name: 'website', label: 'Website', maxLength: 255, placeholder: 'https://example.com' },
];

/** A chosen-but-not-yet-uploaded image: { file, preview } | null (unchanged) | 'remove'. */
function useImageChoice() {
  const [choice, setChoice] = useState(null);
  useEffect(() => () => choice?.preview && URL.revokeObjectURL(choice.preview), [choice]);
  return [choice, setChoice];
}

function ImagePicker({ inputRef, onPick }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT_ATTR}
      hidden
      onChange={(e) => {
        onPick(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );
}

function EditProfile() {
  const user = useUser();
  const router = useRouter();
  const { setAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, data: profile, error } = useProfile(user._id);

  const [avatarChoice, setAvatarChoice] = useImageChoice();
  const [coverChoice, setCoverChoice] = useImageChoice();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const avatarInput = useRef(null);
  const coverInput = useRef(null);

  const initialValues = useMemo(
    () => ({
      name: profile?.user?.name ?? '',
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      website: profile?.website ?? '',
    }),
    [profile]
  );
  const { values, handleChange } = useForm(initialValues);

  const changedText = pickBy(values, (v, key) => v !== initialValues[key]);
  const hasChanges = !isEmpty(changedText) || !!avatarChoice || !!coverChoice;

  const pick = (setChoice) => (file) => {
    if (!file) return;
    try {
      checkImageFile(file);
      setChoice({ file, preview: URL.createObjectURL(file) });
      setSaveError('');
    } catch (err) {
      setSaveError(err.message);
    }
  };

  async function save(e) {
    e?.preventDefault();
    if (!hasChanges || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const userUpdate = pickBy(changedText, (_, key) => key === 'name');
      const profileUpdate = pickBy(changedText, (_, key) => key !== 'name');

      // Upload new images first (avatars are small, covers wider).
      if (avatarChoice?.file) userUpdate.avatar = await uploadImage(avatarChoice.file, 400);
      if (coverChoice?.file) profileUpdate.backgroundImage = await uploadImage(coverChoice.file, 1500);
      if (coverChoice === 'remove') profileUpdate.backgroundImage = '';

      if (!isEmpty(userUpdate)) await client.patch(`/users/${user._id}`, userUpdate);
      if (!isEmpty(profileUpdate)) await client.patch(`/profiles/${user._id}`, profileUpdate);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users', user._id] }),
        queryClient.invalidateQueries({ queryKey: ['profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['tweets'] }),
      ]);
      setAlert({ type: 'success', msg: 'Profile saved.' });
      router.push(`/profile/${user._id}`);
    } catch (err) {
      setSaveError(errorMessage(err));
      setSaving(false);
    }
  }

  const saveButton = (
    <Button $variant="primary" $size="md" onClick={save} disabled={!hasChanges || saving}>
      {saving ? 'Saving...' : 'Save'}
    </Button>
  );

  if (error) {
    return (
      <>
        <PageHeader back title="Edit profile" />
        <DisplayError error={error} />
      </>
    );
  }

  if (isPending) {
    return (
      <>
        <PageHeader back title="Edit profile" />
        <SkeletonList rows={4} />
      </>
    );
  }

  const coverSrc =
    coverChoice === 'remove' ? null : coverChoice?.preview || mediaUrl(profile.backgroundImage) || null;
  const avatarSrc = avatarChoice?.preview || profile.user.avatar;

  return (
    <>
      <PageHeader back title="Edit profile" action={saveButton} />

      <Card $clip $flushMobile>
      <Cover>
        {coverSrc && (
          <img
            key={coverSrc}
            src={coverSrc}
            alt="Cover preview"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <Overlay>
          <RoundButton type="button" aria-label="Change cover photo" title="Change cover photo" onClick={() => coverInput.current?.click()}>
            <RiCameraLine />
          </RoundButton>
          {coverSrc && (
            <RoundButton type="button" aria-label="Remove cover photo" title="Remove cover photo" onClick={() => setCoverChoice('remove')}>
              <RiCloseLine />
            </RoundButton>
          )}
        </Overlay>
        <ImagePicker inputRef={coverInput} onPick={pick(setCoverChoice)} />
      </Cover>

      <AvatarWrap>
        <Avatar key={avatarSrc} src={avatarSrc} alt="Avatar preview" name={values.name || profile.user.name} $size={104} />
        <Overlay>
          <RoundButton type="button" aria-label="Change avatar" title="Change avatar" onClick={() => avatarInput.current?.click()}>
            <RiCameraLine />
          </RoundButton>
        </Overlay>
        <ImagePicker inputRef={avatarInput} onPick={pick(setAvatarChoice)} />
      </AvatarWrap>
      <Hint>JPEG, PNG, GIF or WebP. Images are resized automatically.</Hint>

      <Form onSubmit={save}>
        {saveError && <FeedbackMessage>{saveError}</FeedbackMessage>}
        {TEXT_FIELDS.map(({ name, ...field }) => (
          <Field key={name} name={name} value={values[name]} onChange={handleChange} {...field} />
        ))}
        <button type="submit" hidden />
      </Form>
      </Card>
    </>
  );
}

export default function EditProfilePage() {
  return (
    <RequireAuth>
      <EditProfile />
    </RequireAuth>
  );
}
