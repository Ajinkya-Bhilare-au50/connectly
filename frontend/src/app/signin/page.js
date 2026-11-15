'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { RiLockLine, RiUserLine } from 'react-icons/ri';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/api';
import AuthLayout, { AuthError, AuthFooter, AuthSubtitle, AuthTitle } from '@/components/AuthLayout';
import { Button, Checkbox, Field } from '@/components/ui';

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 16px 0 24px;

  a {
    font-size: 13px;
    font-weight: 600;
    color: var(--primary);

    &:hover {
      text-decoration: underline;
    }
  }
`;

/** Only allow redirecting back to a path inside this app. */
function safeRedirect(from) {
  return from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, login } = useAuth();
  const addingAccount = params.get('add') === '1';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !addingAccount && !submitting) router.replace(safeRedirect(params.get('from')));
  }, [isAuthenticated, addingAccount, submitting, router, params]);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!username.trim()) next.username = 'Enter your email or username.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      // Accounts added via "Switch account" are always remembered so you can switch back.
      await login({ username: username.trim(), password, remember: remember || addingAccount });
      router.replace(addingAccount ? '/' : safeRedirect(params.get('from')));
    } catch (err) {
      // Never reveal which part was wrong.
      setErrors({ form: err.response?.status === 400 ? 'Incorrect email/username or password.' : errorMessage(err) });
      setPassword('');
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout variant="signin">
      <AuthTitle data-cy="signin-title">{addingAccount ? 'Add an account' : 'Welcome Back 👋'}</AuthTitle>
      <AuthSubtitle>
        {addingAccount ? 'Sign in to another account to switch between them.' : 'Sign in to continue to Connectly.'}
      </AuthSubtitle>

      {errors.form && <AuthError role="alert">{errors.form}</AuthError>}

      <form onSubmit={handleSubmit} noValidate data-cy="signin-form">
        <Field
          label="Email or username"
          name="username"
          icon={RiUserLine}
          placeholder="Enter your email or username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          data-cy="signin-username-input"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          icon={RiLockLine}
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          data-cy="signin-password-input"
        />
        <Row>
          <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
            Remember me
          </Checkbox>
          <Link href="/forgot-password">Forgot password?</Link>
        </Row>
        <Button type="submit" $variant="primary" $size="lg" $block disabled={submitting} data-cy="signin-submit">
          {submitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <AuthFooter>
        Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
      </AuthFooter>
    </AuthLayout>
  );
}

export default function SignInPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
