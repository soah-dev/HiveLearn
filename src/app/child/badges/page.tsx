'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
}

interface EarnedBadge {
  id: string;
  badgeId: string;
  earnedAt: string;
  badge: Badge;
}

export default function BadgesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
    if (token) {
      apiFetch('/api/gamification', token)
        .then(data => {
          setAllBadges(data.allBadges || []);
          setEarnedBadges(data.earnedBadges || []);
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const earnedIds = new Set(earnedBadges.map(b => b.badgeId));
  const progress = allBadges.length > 0 ? (earnedBadges.length / allBadges.length) * 100 : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Badge Collection</h1>
          <p className="text-gray-500 dark:text-gray-400">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{earnedBadges.length}</span> of {allBadges.length} badges earned
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-10 max-w-md mx-auto">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs font-semibold text-gray-400 mt-2">{Math.round(progress)}% complete</p>
        </div>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Earned</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {earnedBadges.map((eb, i) => (
                <div
                  key={eb.id}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl border-2 border-indigo-300 dark:border-indigo-600 p-5 text-center card-hover animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <p className="text-5xl mb-2 animate-float">{eb.badge.icon}</p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{eb.badge.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{eb.badge.description}</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold mt-2">{new Date(eb.earnedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Locked</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allBadges.filter(b => !earnedIds.has(b.id)).map(badge => (
              <div key={badge.id} className="bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-center group hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                <p className="text-5xl mb-2 grayscale opacity-40 group-hover:opacity-60 transition-opacity">{badge.icon}</p>
                <p className="font-bold text-gray-400 dark:text-gray-500 text-sm">{badge.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{badge.description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 font-semibold">🔒 Locked</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
