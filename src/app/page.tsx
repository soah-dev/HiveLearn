'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-950 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300/10 dark:bg-pink-600/5 rounded-full blur-3xl" />

      <div className="max-w-md w-full text-center relative z-10">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-6xl font-extrabold gradient-text mb-3 tracking-tight">HiveExcel</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">Learning made fun for families</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-gray-700/50 animate-slide-up">
          {/* Role cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 rounded-2xl p-4 card-hover">
              <p className="text-3xl mb-1 animate-float">👨‍👩‍👧‍👦</p>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Parents</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Create & track</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-2xl p-4 card-hover">
              <p className="text-3xl mb-1 animate-float-slow">🎓</p>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Students</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Learn & earn</p>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
            {mode === 'signup' && (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-slide-up">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              {submitting ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); }} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white/80 dark:bg-gray-800/80 text-gray-400">or</span>
            </div>
          </div>

          <button
            onClick={async () => {
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
            }}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-6 py-3 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-2xl animate-float">📚</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">10 Subjects</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-2xl animate-float-slow">🤖</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">AI Powered</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-2xl animate-float">🏆</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Gamified</p>
            </div>
          </div>

          <Link
            href="/how-it-works"
            className="mt-4 inline-block text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-all"
          >
            How does it work?
          </Link>
        </div>
      </div>
    </div>
  );
}
