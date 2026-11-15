'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import { PageLoader } from '@/components/ui/Page';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import GoogleButton from '@/components/ui/GoogleButton';
import { Field, Input } from '@/components/ui/Field';

export default function Home() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (!user.role) {
        router.push('/onboarding');
      } else if (user.role === 'parent') {
        router.push('/parent/dashboard');
      } else {
        router.push('/child/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('auth/user-not-found')) {
        setError('No account found with this email. Please sign up first.');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password must be at least 6 characters.');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('auth/popup-closed-by-user')) {
        // User closed popup, no error needed
      } else if (msg.includes('auth/popup-blocked')) {
        setError('Popup was blocked. Please allow popups and try again.');
      } else {
        setError(msg || 'Google sign-in failed. Please try again.');
      }
    }
  };

  if (loading) return <PageLoader />;

  const switchMode = (next: 'login' | 'signup') => { setMode(next); setError(''); };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mt-2 text-ink-muted">
        {mode === 'login' ? 'Sign in to pick up where you left off.' : 'Homework, practice and progress for your family.'}
      </p>

      <div className="mt-8">
        <GoogleButton onClick={handleGoogle} />

        <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-ink-subtle">
          <span className="h-px flex-1 bg-line" />
          or with email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <Field label="Full name" htmlFor="auth-name">
              <Input id="auth-name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
            </Field>
          )}
          <Field label="Email" htmlFor="auth-email">
            <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="auth-password" hint={mode === 'signup' ? 'At least 6 characters.' : undefined}>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Field>

          {error && <Alert>{error}</Alert>}

          <Button type="submit" size="lg" block loading={submitting}>
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        {mode === 'login' ? (
          <>New to HiveExcel?{' '}
            <button onClick={() => switchMode('signup')} className="font-semibold text-honey-text hover:underline">Create an account</button>
          </>
        ) : (
          <>Already have an account?{' '}
            <button onClick={() => switchMode('login')} className="font-semibold text-honey-text hover:underline">Sign in</button>
          </>
        )}
      </p>
      <p className="mt-2 text-sm">
        <Link href="/how-it-works" className="font-semibold text-honey-text hover:underline">How does it work?</Link>
      </p>
    </AuthLayout>
  );
}
