'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RiAtLine, RiLockLine, RiMailLine, RiUserLine } from 'react-icons/ri';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/api';
import AuthLayout, { AuthError, AuthFooter, AuthSubtitle, AuthTitle } from '@/components/AuthLayout';
import { Button, Checkbox, FeedbackMessage, Field } from '@/components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[0-9a-zA-Z_.-]+$/;

/** Same rules as the server, checked as you go so errors appear next to each field. */
function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Enter your full name.';
  else if (v.name.trim().length > 50) e.name = 'Name must be 50 characters or fewer.';
  if (!v.email.trim()) e.email = 'Enter your email.';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (!v.username.trim()) e.username = 'Choose a username.';
  else if (v.username.length < 3 || v.username.length > 30) e.username = 'Username must be 3–30 characters.';
  else if (!USERNAME_RE.test(v.username)) e.username = 'Use only letters, numbers, ".", "-" and "_".';
  if (!v.password) e.password = 'Create a password.';
  else if (v.password.length < 8) e.password = 'Use at least 8 characters.';
  else if (!/\d/.test(v.password) || !/[a-zA-Z]/.test(v.password)) e.password = 'Include at least one letter and one number.';
  if (!v.password2) e.password2 = 'Confirm your password.';
  else if (v.password !== v.password2) e.password2 = "Passwords don't match.";
  if (!v.terms) e.terms = 'You need to accept the Terms of Service and Privacy Policy.';
  return e;
}

export default function SignUpPage() {
  const router = useRouter();
  const { isAuthenticated, register } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', username: '', password: '', password2: '', terms: false });
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  const errors = validate(values);
  const show = (field) => (touched[field] ? errors[field] : undefined);
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, username: true, password: true, password2: true, terms: true });
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
      });
    } catch (err) {
      setFormError(errorMessage(err));
      // Keep the safe values; clear the passwords.
      setValues((v) => ({ ...v, password: '', password2: '' }));
      setTouched((t) => ({ ...t, password: false, password2: false }));
      setSubmitting(false);
    }
  }

  const field = (name, props) => (
    <Field name={name} value={values[name]} onChange={set(name)} onBlur={blur(name)} error={show(name)} data-cy={`signup-${name}-input`} {...props} />
  );

  return (
    <AuthLayout variant="signup">
      <AuthTitle data-cy="signup-title">Create Your Account</AuthTitle>
      <AuthSubtitle>Join Connectly and be part of the community.</AuthSubtitle>

      {formError && <AuthError role="alert">{formError}</AuthError>}

      <form onSubmit={handleSubmit} noValidate data-cy="signup-form">
        {field('name', { label: 'Full Name', icon: RiUserLine, placeholder: 'Enter your full name', autoComplete: 'name', maxLength: 50 })}
        {field('email', { label: 'Email', type: 'email', icon: RiMailLine, placeholder: 'Enter your email', autoComplete: 'email' })}
        {field('username', { label: 'Username', icon: RiAtLine, placeholder: 'Choose a username (e.g. ajinkya)', autoComplete: 'username', maxLength: 30 })}
        {field('password', {
          label: 'Password',
          type: 'password',
          icon: RiLockLine,
          placeholder: 'Create a strong password',
          autoComplete: 'new-password',
          hint: 'At least 8 characters, with a letter and a number.',
        })}
        {field('password2', { label: 'Confirm Password', type: 'password', icon: RiLockLine, placeholder: 'Repeat your password', autoComplete: 'new-password' })}

        <div style={{ margin: '16px 0 4px' }}>
          <Checkbox checked={values.terms} onChange={set('terms')} onBlur={blur('terms')} aria-invalid={!!show('terms')}>
            I agree to the{' '}
            <Link href="/terms" target="_blank" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Privacy Policy
            </Link>
          </Checkbox>
          {show('terms') && <FeedbackMessage>{show('terms')}</FeedbackMessage>}
        </div>

        <Button type="submit" $variant="primary" $size="lg" $block disabled={submitting} style={{ marginTop: 16 }} data-cy="signup-submit">
          {submitting ? 'Creating account…' : 'Sign Up'}
        </Button>
      </form>

      <AuthFooter>
        Already have an account? <Link href="/signin">Sign In</Link>
      </AuthFooter>
    </AuthLayout>
  );
}
