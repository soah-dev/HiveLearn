'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import AssignmentCard from '@/components/AssignmentCard';
import Link from 'next/link';

interface Child {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  gamification: { totalPoints: number; currentStreak: number } | null;
}

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
  child: { id: string; name: string | null };
}

export default function ParentDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
      return;
    }
    if (token) {
      Promise.all([
        apiFetch('/api/parent/children', token),
        apiFetch('/api/assignments', token),
      ]).then(([childrenData, assignmentsData]) => {
        setChildren(childrenData.children || []);
        setAssignments(assignmentsData.assignments || []);
        setDataLoading(false);
      }).catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const data = await apiFetch('/api/parent/invite', token, { method: 'POST' });
      setInviteCode(data.inviteCode);
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const pendingReview = assignments.filter(a => a.status === 'submitted').length;
  const totalCompleted = assignments.filter(a => a.status === 'reviewed').length;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Parent Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage assignments and track progress</p>
          </div>
          <Link
            href="/parent/create"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            + Create Assignment
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Children" value={children.length} icon="👨‍👩‍👧‍👦" />
          <StatCard title="Total Assignments" value={assignments.length} icon="📝" />
          <StatCard title="Pending Review" value={pendingReview} icon="⏳" />
          <StatCard title="Completed" value={totalCompleted} icon="✅" />
        </div>

        {/* Children */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Children</h2>
            <button
              onClick={generateInvite}
              disabled={generating}
              className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
            >
              {generating ? 'Generating...' : '+ Generate Invite Code'}
            </button>
          </div>

          {inviteCode && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                Share this invite code with your child: <span className="font-mono font-bold text-lg">{inviteCode}</span>
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">They&apos;ll enter it during their onboarding.</p>
            </div>
          )}

          {children.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No children linked yet. Generate an invite code and share it with your child.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map(child => (
                <Link key={child.id} href={`/parent/analytics/${child.id}`}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      {child.image ? (
                        <img src={child.image} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
                          {(child.name || 'C')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{child.name || child.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {child.gamification?.totalPoints || 0} pts | {child.gamification?.currentStreak || 0} day streak
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assignments */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Assignments</h2>
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No assignments yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.slice(0, 9).map(a => (
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
                  childName={a.child?.name || undefined}
                  role="parent"
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
