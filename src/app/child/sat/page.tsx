'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';

interface SATSessionSummary {
  id: string;
  status: string;
  rwScaledScore: number | null;
  mathScaledScore: number | null;
  compositeScore: number | null;
  pointsAwarded: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function SATHubPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SATSessionSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
    if (token && user?.satEnabled) {
      apiFetch('/api/sat/sessions', token)
        .then(data => { setSessions(data.sessions || []); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    } else if (token && !loading) {
      setDataLoading(false);
    }
  }, [user, token, loading, router]);

  const startNewTest = async () => {
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      const data = await apiFetch('/api/sat/sessions', token, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      router.push(`/child/sat/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setCreating(false);
    }
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  // Locked state
  if (!user?.satEnabled) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-12">
            <p className="text-5xl mb-4">🔒</p>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">SAT Practice Locked</h1>
            <p className="text-gray-500 dark:text-gray-400">
              SAT Practice is not yet enabled for your account. Ask your parent to contact support.
            </p>
          </div>
        </main>
      </>
    );
  }

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const inProgressSessions = sessions.filter(s => s.status !== 'completed');
  const bestScore = completedSessions.length > 0
    ? Math.max(...completedSessions.map(s => s.compositeScore || 0))
    : 0;
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.compositeScore || 0), 0) / completedSessions.length)
    : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">SAT Practice</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Full Digital SAT simulation with adaptive scoring</p>
          </div>
          <button
            onClick={startNewTest}
            disabled={creating}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
          >
            {creating ? 'Creating...' : 'Start New Practice Test'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Tests Completed" value={completedSessions.length} icon="📝" />
          <StatCard title="Best Score" value={bestScore || '-'} icon="🏆" />
          <StatCard title="Average Score" value={avgScore || '-'} icon="📊" />
          <StatCard title="In Progress" value={inProgressSessions.length} icon="⏳" />
        </div>

        {/* In Progress Sessions */}
        {inProgressSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">In Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/child/sat/${s.id}`)}
                  className="text-left bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-2 border-amber-300 dark:border-amber-600 p-5 card-hover"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {s.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Started {new Date(s.startedAt || s.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                    Continue Test →
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Past Tests {completedSessions.length > 0 && <span className="text-sm font-normal text-gray-500">({completedSessions.length})</span>}
          </h2>
          {completedSessions.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-12 text-center">
              <p className="text-5xl mb-3">📚</p>
              <p className="text-gray-500 dark:text-gray-400">No completed tests yet. Start your first practice test!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSessions.map((s, i) => {
                const scoreColor = (s.compositeScore || 0) >= 1200
                  ? 'text-green-600 dark:text-green-400'
                  : (s.compositeScore || 0) >= 800
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400';
                return (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/child/sat/${s.id}`)}
                    className="text-left bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5 card-hover animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-2xl font-extrabold ${scoreColor}`}>{s.compositeScore}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.completedAt!).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">R&W: <span className="font-bold">{s.rwScaledScore}</span></span>
                      <span className="text-gray-600 dark:text-gray-400">Math: <span className="font-bold">{s.mathScaledScore}</span></span>
                    </div>
                    {s.pointsAwarded && (
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2">+{s.pointsAwarded} pts</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
