'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RiLockLine } from 'react-icons/ri';
import { errorMessage, resetPassword } from '@/lib/api';
import AuthLayout, { AuthError, AuthFooter, AuthNotice, AuthSubtitle, AuthTitle } from '@/components/AuthLayout';
import { Button, Field } from '@/components/ui';

function ResetPassword() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState('');

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) next.password = 'Include at least one letter and one number.';
    if (password !== password2) next.password2 = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = await resetPassword(token, password);
      setDone(res.message);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <>
        <AuthTitle>Reset password</AuthTitle>
        <AuthError role="alert" style={{ marginTop: 16 }}>
          This reset link is incomplete. Please request a new one.
        </AuthError>
        <Button as={Link} href="/forgot-password" $variant="primary" $size="lg" $block>
          Request a new link
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthTitle>Choose a new password</AuthTitle>
      <AuthSubtitle>Make it at least 8 characters, with a letter and a number.</AuthSubtitle>

      {done ? (
        <>
          <AuthNotice role="status">{done}</AuthNotice>
          <Button as={Link} href="/signin" $variant="primary" $size="lg" $block>
            Go to Sign In
          </Button>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          {errors.form && (
            <AuthError role="alert">
              {errors.form} <Link href="/forgot-password" style={{ textDecoration: 'underline' }}>Request a new link</Link>
            </AuthError>
          )}
          <Field
            label="New password"
            type="password"
            icon={RiLockLine}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Field
            label="Confirm new password"
            type="password"
            icon={RiLockLine}
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            error={errors.password2}
          />
          <Button type="submit" $variant="primary" $size="lg" $block disabled={saving} style={{ marginTop: 24 }}>
            {saving ? 'Saving…' : 'Reset password'}
          </Button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout variant="recover">
      <Suspense>
        <ResetPassword />
      </Suspense>
      <AuthFooter>
        <Link href="/signin">Back to Sign In</Link>
      </AuthFooter>
    </AuthLayout>
  );
}
