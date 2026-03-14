'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import AssignmentCard from '@/components/AssignmentCard';

interface Assignment {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  status: string;
  score: number | null;
  numQuestions: number;
  timeLimitMin: number | null;
  createdAt: string;
}

interface GamificationData {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  badge: { name: string; icon: string };
  earnedAt: string;
}

export default function ChildDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [recentBadges, setRecentBadges] = useState<Badge[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
    if (token) {
      Promise.all([
        apiFetch('/api/assignments', token),
        apiFetch('/api/gamification', token),
      ]).then(([assignmentsData, gamData]) => {
        setAssignments(assignmentsData.assignments || []);
        setGamification(gamData.gamification);
        setRecentBadges((gamData.earnedBadges || []).slice(0, 3));
        setDataLoading(false);
      }).catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const pending = assignments.filter(a => a.status === 'pending' || a.status === 'in_progress');
  const completed = assignments.filter(a => a.status === 'reviewed');

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hey, {user?.name || 'Student'}! 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ready to learn something new today?</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Points" value={gamification?.totalPoints || 0} icon="⭐" />
          <StatCard title="Current Streak" value={`${gamification?.currentStreak || 0} days`} icon="🔥" />
          <StatCard title="Longest Streak" value={`${gamification?.longestStreak || 0} days`} icon="🏅" />
          <StatCard title="Completed" value={completed.length} icon="✅" />
        </div>

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Badges</h2>
              <button onClick={() => router.push('/child/badges')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View all</button>
            </div>
            <div className="flex gap-3">
              {recentBadges.map(b => (
                <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center min-w-[120px]">
                  <p className="text-3xl mb-1">{b.badge.icon}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{b.badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Assignments */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Pending Assignments {pending.length > 0 && <span className="text-sm font-normal text-gray-500">({pending.length})</span>}
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-gray-500 dark:text-gray-400">All caught up! No pending assignments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map(a => (
                <AssignmentCard
                  key={a.id}
                  id={a.id}
                  subject={a.subject}
                  topic={a.topic}
                  difficulty={a.difficulty}
                  status={a.status}
                  score={a.score}
                  numQuestions={a.numQuestions}
                  timeLimitMin={a.timeLimitMin}
                  createdAt={a.createdAt}
                  role="child"
                />
              ))}
            </div>
          )}
        </div>

        {/* Completed Assignments */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Completed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completed.slice(0, 6).map(a => (
                <AssignmentCard
                  key={a.id}
                  id={a.id}
                  subject={a.subject}
                  topic={a.topic}
                  difficulty={a.difficulty}
                  status={a.status}
                  score={a.score}
                  numQuestions={a.numQuestions}
                  timeLimitMin={a.timeLimitMin}
                  createdAt={a.createdAt}
                  role="child"
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
