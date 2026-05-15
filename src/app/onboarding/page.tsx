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
        body: JSON.stringify({ role }),
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-950 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl animate-float-slow" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8 animate-slide-up">
          <p className="text-5xl mb-3 animate-float">👋</p>
          <h1 className="text-4xl font-extrabold gradient-text mb-2">Welcome to HiveExcel!</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Let&apos;s set up your account</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-gray-700/50 animate-slide-up">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 text-center">I am a...</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setRole('parent')}
              className={`p-6 rounded-2xl border-2 transition-all card-hover ${
                role === 'parent'
                  ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 shadow-lg shadow-indigo-500/20'
                  : 'border-gray-200/60 dark:border-gray-600/60 hover:border-indigo-300'
              }`}
            >
              <p className="text-5xl mb-2 animate-float">👨‍👩‍👧</p>
              <p className="font-bold text-gray-900 dark:text-white">Parent</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create & review</p>
            </button>

            <button
              onClick={() => setRole('child')}
              className={`p-6 rounded-2xl border-2 transition-all card-hover ${
                role === 'child'
                  ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 shadow-lg shadow-purple-500/20'
                  : 'border-gray-200/60 dark:border-gray-600/60 hover:border-purple-300'
              }`}
            >
              <p className="text-5xl mb-2 animate-float-slow">🎓</p>
              <p className="font-bold text-gray-900 dark:text-white">Student</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Learn & earn</p>
            </button>
          </div>

          {role === 'child' && (
            <div className="mb-6 p-4 bg-blue-50/80 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl animate-slide-up">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Ask your parent to send you an invite from their dashboard. Check your email for the invite link!
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-slide-up">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!role || submitting}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            {submitting ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
