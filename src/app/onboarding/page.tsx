'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function OnboardingPage() {
  const { user, token, refreshUser, loading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'parent' | 'child' | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (user?.role) {
    router.push(user.role === 'parent' ? '/parent/dashboard' : '/child/dashboard');
    return null;
  }

  const handleSubmit = async () => {
    if (!role) return;
    setSubmitting(true);
    setError('');

    try {
      await apiFetch('/api/auth/onboarding', token, {
        method: 'POST',
        body: JSON.stringify({ role, inviteCode: role === 'child' ? inviteCode : undefined }),
      });
      await refreshUser();
      router.push(role === 'parent' ? '/parent/dashboard' : '/child/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to HomeworkHub!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Let&apos;s set up your account</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">I am a...</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setRole('parent')}
              className={`p-6 rounded-xl border-2 transition-all ${
                role === 'parent'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'
              }`}
            >
              <p className="text-4xl mb-2">👨‍👩‍👧</p>
              <p className="font-semibold text-gray-900 dark:text-white">Parent</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create & review assignments</p>
            </button>

            <button
              onClick={() => setRole('child')}
              className={`p-6 rounded-xl border-2 transition-all ${
                role === 'child'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
              }`}
            >
              <p className="text-4xl mb-2">🎓</p>
              <p className="font-semibold text-gray-900 dark:text-white">Student</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Complete homework & earn rewards</p>
            </button>
          </div>

          {role === 'child' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your parent&apos;s invite code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ask your parent for the code from their dashboard</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!role || (role === 'child' && !inviteCode) || submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
