'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Child {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  gamification: { totalPoints: number; currentStreak: number } | null;
}

export default function AnalyticsIndexPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
      return;
    }
    if (token) {
      apiFetch('/api/parent/children', token)
        .then(data => {
          const kids = data.children || [];
          if (kids.length === 1) {
            router.replace(`/parent/analytics/${kids[0].id}`);
          } else {
            setChildren(kids);
            setDataLoading(false);
          }
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">Select a child to view their progress</p>
        </div>

        {children.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-12 text-center animate-slide-up">
            <p className="text-5xl mb-3 animate-float">📊</p>
            <p className="text-gray-500 dark:text-gray-400">No children linked yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child, i) => (
              <button
                key={child.id}
                onClick={() => router.push(`/parent/analytics/${child.id}`)}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 text-left card-hover animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  {child.image ? (
                    <img src={child.image} alt="" className="w-12 h-12 rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                      {(child.name || 'C')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{child.name || child.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{child.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">⭐ {child.gamification?.totalPoints || 0} pts</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">View Analytics &rarr;</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
