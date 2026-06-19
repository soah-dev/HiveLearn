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
  totalPoints: number;
  weeklyPoints: number;
  currentStreak: number;
}

export default function ParentLeaderboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [view, setView] = useState<'alltime' | 'weekly'>('weekly');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token) {
      setDataLoading(true);
      apiFetch('/api/leaderboard?scope=family', token)
        .then(data => { setLeaderboard(data.leaderboard || []); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const sorted = [...leaderboard].sort((a, b) =>
    view === 'weekly' ? b.weeklyPoints - a.weeklyPoints : b.totalPoints - a.totalPoints
  );

  if (loading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const medals = ['🥇', '🥈', '🥉'];
  const podiumGradients = [
    'from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-300 dark:border-yellow-700',
    'from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-300 dark:border-gray-600',
    'from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-300 dark:border-orange-700',
  ];

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-slide-up">
          <p className="text-5xl mb-2 animate-float">🏆</p>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Family Leaderboard</h1>
          <p className="text-gray-500 dark:text-gray-400">See how your children rank against each other!</p>
        </div>

        {/* Time toggle */}
        <div className="flex bg-gray-100/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-1 mb-8 max-w-xs mx-auto">
          <button
            onClick={() => setView('alltime')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              view === 'alltime' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              view === 'weekly' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            This Week
          </button>
        </div>

        {dataLoading ? (
          <div className="py-12"><LoadingSpinner size="lg" /></div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 animate-slide-up">
            <p className="text-5xl mb-3 animate-float">🏅</p>
            <p className="text-gray-500 dark:text-gray-400">No leaderboard data yet. Your children will appear here once they earn points!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 card-hover animate-slide-up ${
                  i < 3
                    ? `bg-gradient-to-r ${podiumGradients[i]}`
                    : 'bg-white/80 dark:bg-gray-800/80 border-gray-200/60 dark:border-gray-700/60'
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-3xl w-10 text-center">
                  {i < 3 ? <span className="animate-float-slow inline-block">{medals[i]}</span> : <span className="text-gray-400 text-lg font-extrabold">{i + 1}</span>}
                </span>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                  {(entry.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">{entry.name || 'Student'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">🔥 {entry.currentStreak} day streak</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {view === 'weekly' ? entry.weeklyPoints : entry.totalPoints}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
