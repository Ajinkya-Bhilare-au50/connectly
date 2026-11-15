'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiArrowLeftLine, RiMailLine } from 'react-icons/ri';
import { errorMessage, requestPasswordReset } from '@/lib/api';
import AuthLayout, { AuthError, AuthFooter, AuthNotice, AuthSubtitle, AuthTitle } from '@/components/AuthLayout';
import { Button, Field } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // server response

  async function submit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email address you signed up with.');
      return;
    }
    setError('');
    setSending(true);
    try {
      setSent(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout variant="recover">
      <AuthTitle>Forgot your password?</AuthTitle>
      <AuthSubtitle>Enter your account email and we&apos;ll send you a link to reset it.</AuthSubtitle>

      {sent ? (
        <>
          <AuthNotice role="status">
            {sent.message} The link expires in 30 minutes and can be used once.
          </AuthNotice>
          {sent.devResetUrl && (
            <AuthNotice>
              <strong>Development mode:</strong> no email service is configured, so here is the link:{' '}
              <Link href={sent.devResetUrl.replace(/^https?:\/\/[^/]+/, '')}>Reset password</Link>
            </AuthNotice>
          )}
          <Button $variant="secondary" $size="lg" $block onClick={submit} disabled={sending}>
            {sending ? 'Sending…' : 'Resend link'}
          </Button>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && <AuthError role="alert">{error}</AuthError>}
          <Field
            label="Email"
            type="email"
            icon={RiMailLine}
            placeholder="Enter your email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" $variant="primary" $size="lg" $block disabled={sending} style={{ marginTop: 24 }}>
            {sending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <AuthFooter>
        <Link href="/signin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RiArrowLeftLine aria-hidden /> Back to Sign In
        </Link>
      </AuthFooter>
    </AuthLayout>
  );
}
