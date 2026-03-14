'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

interface LeaderboardEntry {
  id: string;
  name: string | null;
  image: string | null;
  totalPoints: number;
  weeklyPoints: number;
  currentStreak: number;
}

export default function LeaderboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [view, setView] = useState<'alltime' | 'weekly'>('alltime');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token) {
      apiFetch('/api/leaderboard', token)
        .then(data => { setLeaderboard(data.leaderboard || []); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const sorted = [...leaderboard].sort((a, b) =>
    view === 'weekly' ? b.weeklyPoints - a.weeklyPoints : b.totalPoints - a.totalPoints
  );

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Family Leaderboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">See how you stack up!</p>

        {/* Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-8">
          <button
            onClick={() => setView('alltime')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'alltime' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'weekly' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            This Week
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-gray-500 dark:text-gray-400">No leaderboard data yet. Complete assignments to earn points!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-shadow ${
                  entry.id === user?.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="text-2xl w-10 text-center">
                  {i < 3 ? medals[i] : <span className="text-gray-400 text-lg font-bold">{i + 1}</span>}
                </span>
                {entry.image ? (
                  <img src={entry.image} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
                    {(entry.name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {entry.name || 'Student'}
                    {entry.id === user?.id && <span className="text-xs text-indigo-500 ml-2">(You)</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">🔥 {entry.currentStreak} day streak</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {view === 'weekly' ? entry.weeklyPoints : entry.totalPoints}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
