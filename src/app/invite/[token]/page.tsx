'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface InviteInfo {
  childEmail: string;
  childName: string;
  parentName: string;
}

export default function InviteSignupPage() {
  const { user, token, signUpWithEmail, signInWithEmail, refreshUser, loading: authLoading } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-5xl mb-4">😕</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Logged-in user is a parent — can't accept child invite
  if (user && user.role === 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-5xl mb-4">👋</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Wrong Account</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You&apos;re signed in as a parent. This invite is for <strong>{inviteInfo?.childName}</strong> ({inviteInfo?.childEmail}).
            Please sign out and sign in with the child&apos;s account to accept this invite.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  // Logged-in child whose email doesn't match
  if (user && user.role === 'child' && inviteInfo && user.email?.toLowerCase() !== inviteInfo.childEmail.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-5xl mb-4">📧</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Different Account</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            This invite is for <strong>{inviteInfo.childEmail}</strong>, but you&apos;re signed in as <strong>{user.email}</strong>.
            Please sign out and sign in with the correct account.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  // Logged-in child with matching email — show accepting state
  if (user && submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Linking your account...</p>
        </div>
      </div>
    );
  }

  // Logged-in child with error
  if (user && user.role === 'child' && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-5xl mb-4">😕</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Could Not Accept Invite</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/child/dashboard')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Not logged in — show signup/login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Join HiveExcel!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            <strong>{inviteInfo?.parentName}</strong> has invited you
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={inviteInfo?.childName || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={inviteInfo?.childEmail || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {mode === 'signup' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !password}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Setting up...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>Need an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); }} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
