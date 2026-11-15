'use client';

import { ReactNode, useEffect, useState } from 'react';
import { CircleHelp, LucideIcon, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import AuthLayout from '@/components/AuthLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import GoogleButton from '@/components/ui/GoogleButton';
import Hexagon from '@/components/ui/Hexagon';
import { Field, Input } from '@/components/ui/Field';

interface InviteInfo {
  childEmail: string;
  childName: string;
  parentName: string;
}

/** A dead-end state of the invite flow: what happened, and the one way forward. */
function Notice({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children: ReactNode; action: ReactNode }) {
  return (
    <AuthLayout>
      <Hexagon size={56} tone="muted" className="mb-5">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </Hexagon>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-ink-muted">{children}</p>
      <div className="mt-6">{action}</div>
    </AuthLayout>
  );
}

export default function InviteSignupPage() {
  const { user, token, signUpWithEmail, signInWithEmail, signInWithGoogle, refreshUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const inviteToken = params.token as string;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');

  // Verify token on load
  useEffect(() => {
    fetch(`/api/invite/verify?token=${inviteToken}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Invalid invite');
          return;
        }
        const data = await res.json();
        setInviteInfo(data);
      })
      .catch(() => setError('Failed to verify invite'))
      .finally(() => setVerifying(false));
  }, [inviteToken]);

  const acceptInvite = async () => {
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/api/auth/onboarding', token, {
        method: 'POST',
        body: JSON.stringify({ role: 'child', inviteToken }),
      });
      await refreshUser();
      router.push('/child/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setSubmitting(false);
    }
  };

  // Auto-accept for logged-in children whose email matches
  useEffect(() => {
    if (!authLoading && user && token && inviteInfo && user.role === 'child') {
      if (user.email?.toLowerCase() === inviteInfo.childEmail.toLowerCase()) {
        acceptInvite();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token, inviteInfo]);

  const handleSubmit = async () => {
    if (!inviteInfo) return;
    setError('');

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(inviteInfo.childEmail, password, inviteInfo.childName);
      } else {
        await signInWithEmail(inviteInfo.childEmail, password);
      }
      // After auth, the useEffect above will detect the logged-in user and call acceptInvite
    } catch (err) {
      setSubmitting(false);
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('An account with this email already exists. Try signing in instead.');
          setMode('login');
        } else if (err.message.includes('wrong-password') || err.message.includes('invalid-credential')) {
          setError('Incorrect password. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong');
      }
    }
  };

  if (verifying || authLoading) {
    return (
      <AuthLayout>
        <LoadingSpinner size="lg" />
      </AuthLayout>
    );
  }

  if (error && !inviteInfo) {
    return (
      <Notice icon={CircleHelp} title="This invite isn't valid" action={<Button onClick={() => router.push('/')}>Go to homepage</Button>}>
        {error}
      </Notice>
    );
  }

  // Logged-in user is a parent — can't accept child invite
  if (user && user.role === 'parent') {
    return (
      <Notice icon={UserRound} title="Wrong account" action={<Button onClick={() => router.push('/settings')}>Go to settings</Button>}>
        You&apos;re signed in as a parent. This invite is for <strong className="text-ink">{inviteInfo?.childName}</strong> ({inviteInfo?.childEmail}).
        Please sign out and sign in with the child&apos;s account to accept this invite.
      </Notice>
    );
  }

  // Logged-in child whose email doesn't match
  if (user && user.role === 'child' && inviteInfo && user.email?.toLowerCase() !== inviteInfo.childEmail.toLowerCase()) {
    return (
      <Notice icon={Mail} title="Different account" action={<Button onClick={() => router.push('/settings')}>Go to settings</Button>}>
        This invite is for <strong className="text-ink">{inviteInfo.childEmail}</strong>, but you&apos;re signed in as <strong className="text-ink">{user.email}</strong>.
        Please sign out and sign in with the correct account.
      </Notice>
    );
  }

  // Logged-in child with matching email — show accepting state
  if (user && submitting) {
    return (
      <AuthLayout>
        <LoadingSpinner size="md" />
        <p className="text-center text-ink-muted">Linking your account…</p>
      </AuthLayout>
    );
  }

  // Logged-in child with error
  if (user && user.role === 'child' && error) {
    return (
      <Notice icon={CircleHelp} title="Couldn't accept the invite" action={<Button onClick={() => router.push('/child/dashboard')}>Go to dashboard</Button>}>
        {error}
      </Notice>
    );
  }

  const switchMode = (next: 'signup' | 'login') => { setMode(next); setError(''); };

  // Not logged in — show signup/login form
  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Join HiveExcel</h1>
      <p className="mt-2 text-ink-muted">
        <strong className="text-ink">{inviteInfo?.parentName}</strong> has invited you.
        {mode === 'signup' ? ' Choose a password to finish setting up.' : ' Sign in to link your account.'}
      </p>

      <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="mt-8 space-y-4">
        <Field label="Name" htmlFor="invite-name">
          <Input id="invite-name" type="text" value={inviteInfo?.childName || ''} disabled />
        </Field>
        <Field label="Email" htmlFor="invite-email">
          <Input id="invite-email" type="email" value={inviteInfo?.childEmail || ''} disabled />
        </Field>
        <Field label="Password" htmlFor="invite-password">
          <Input
            id="invite-password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
          />
        </Field>
        {mode === 'signup' && (
          <Field label="Confirm password" htmlFor="invite-confirm">
            <Input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
            />
          </Field>
        )}

        {error && <Alert>{error}</Alert>}

        <Button type="submit" size="lg" block disabled={!password} loading={submitting}>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-ink-subtle">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton
        disabled={submitting}
        onClick={async () => {
          setError('');
          try {
            await signInWithGoogle();
          } catch (err) {
            if (err instanceof Error && !err.message.includes('popup-closed-by-user')) {
              setError(err.message || 'Google sign-in failed. Please try again.');
            }
          }
        }}
      />

      <p className="mt-6 text-sm text-ink-muted">
        {mode === 'signup' ? (
          <>Already have an account?{' '}
            <button onClick={() => switchMode('login')} className="font-semibold text-honey-text hover:underline">Sign in</button>
          </>
        ) : (
          <>Need an account?{' '}
            <button onClick={() => switchMode('signup')} className="font-semibold text-honey-text hover:underline">Sign up</button>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
