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

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Badge Collection</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {earnedBadges.length} of {allBadges.length} badges earned
        </p>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${allBadges.length > 0 ? (earnedBadges.length / allBadges.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Earned</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {earnedBadges.map(eb => (
                <div key={eb.id} className="bg-white dark:bg-gray-800 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 p-5 text-center shadow-sm">
                  <p className="text-4xl mb-2">{eb.badge.icon}</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{eb.badge.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{eb.badge.description}</p>
                  <p className="text-xs text-indigo-500 mt-2">{new Date(eb.earnedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Locked</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allBadges.filter(b => !earnedIds.has(b.id)).map(badge => (
              <div key={badge.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center opacity-60">
                <p className="text-4xl mb-2 grayscale">{badge.icon}</p>
                <p className="font-semibold text-gray-600 dark:text-gray-400 text-sm">{badge.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{badge.description}</p>
                <p className="text-xs text-gray-400 mt-2">🔒 Locked</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
