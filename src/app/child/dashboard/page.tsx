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

interface OfflineWork {
  id: string;
  subject: string;
  bookReference: string | null;
  numQuestions: number;
  score: number;
  difficulty: string;
  status: string;
  parentComment: string | null;
  pointsAwarded: number | null;
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
  const [offlineWork, setOfflineWork] = useState<OfflineWork[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Offline work form state
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [owSubject, setOwSubject] = useState('math');
  const [owBook, setOwBook] = useState('');
  const [owQuestions, setOwQuestions] = useState(10);
  const [owScore, setOwScore] = useState(0);
  const [owDifficulty, setOwDifficulty] = useState('medium');
  const [owSubmitting, setOwSubmitting] = useState(false);
  const [owError, setOwError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
    if (token) {
      Promise.all([
        apiFetch('/api/assignments', token),
        apiFetch('/api/gamification', token),
        apiFetch('/api/offline-work', token),
      ]).then(([assignmentsData, gamData, offlineData]) => {
        setAssignments(assignmentsData.assignments || []);
        setGamification(gamData.gamification);
        setRecentBadges((gamData.earnedBadges || []).slice(0, 3));
        setOfflineWork(offlineData.entries || []);
        setDataLoading(false);
      }).catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const subjects = [
    { value: 'math', label: 'Math' }, { value: 'reading', label: 'Reading' },
    { value: 'science', label: 'Science' }, { value: 'history', label: 'History' },
    { value: 'english', label: 'English' }, { value: 'geography', label: 'Geography' },
    { value: 'art', label: 'Art' }, { value: 'music', label: 'Music' },
    { value: 'computer_science', label: 'Computer Science' }, { value: 'foreign_languages', label: 'Foreign Languages' },
  ];

  const submitOfflineWork = async () => {
    if (!token) return;
    setOwSubmitting(true);
    setOwError('');
    try {
      await apiFetch('/api/offline-work', token, {
        method: 'POST',
        body: JSON.stringify({
          subject: owSubject,
          bookReference: owBook.trim() || null,
          numQuestions: owQuestions,
          score: owScore,
          difficulty: owDifficulty,
        }),
      });
      const data = await apiFetch('/api/offline-work', token);
      setOfflineWork(data.entries || []);
      setShowOfflineForm(false);
      setOwBook('');
      setOwQuestions(10);
      setOwScore(0);
    } catch (err) {
      setOwError(err instanceof Error ? err.message : 'Failed to submit');
    }
    setOwSubmitting(false);
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const pending = assignments.filter(a => a.status === 'pending' || a.status === 'in_progress');
  const completed = assignments.filter(a => a.status === 'reviewed');
  const scoredAssignments = completed.filter(a => a.score !== null);
  const accuracyRate = scoredAssignments.length > 0
    ? Math.round(scoredAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / scoredAssignments.length)
    : 0;

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
          <StatCard title="Accuracy Rate" value={`${accuracyRate}%`} icon="🎯" />
          <StatCard title="Pending" value={pending.length} icon="📋" />
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
          <div className="mb-8">
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

        {/* Offline Work */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Offline Work</h2>
            <button
              onClick={() => setShowOfflineForm(!showOfflineForm)}
              className="text-sm bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-4 py-2 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
            >
              + Log Offline Work
            </button>
          </div>

          {showOfflineForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Log Offline Work</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                  <select
                    value={owSubject}
                    onChange={e => setOwSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                  <select
                    value={owDifficulty}
                    onChange={e => setOwDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={owQuestions}
                    onChange={e => setOwQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={owScore}
                    onChange={e => setOwScore(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Book / Resource Reference (optional)</label>
                <input
                  type="text"
                  value={owBook}
                  onChange={e => setOwBook(e.target.value)}
                  placeholder="e.g. Math Workbook Ch. 5, Khan Academy Algebra"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              {owError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {owError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={submitOfflineWork}
                  disabled={owSubmitting || owQuestions < 1}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {owSubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
                <button
                  onClick={() => setShowOfflineForm(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {offlineWork.length === 0 && !showOfflineForm ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No offline work logged yet. Studied on your own? Log it here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offlineWork.slice(0, 6).map(ow => (
                <div key={ow.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-teal-600 dark:text-teal-400 capitalize">{ow.subject.replace('_', ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ow.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : ow.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {ow.status === 'approved' ? 'Approved' : ow.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                  {ow.bookReference && <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{ow.bookReference}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-2">{ow.difficulty} · {ow.numQuestions} questions · {ow.score}%</p>
                  {ow.status === 'approved' && ow.pointsAwarded && (
                    <p className="text-xs text-teal-600 dark:text-teal-400">+{ow.pointsAwarded} pts</p>
                  )}
                  {ow.parentComment && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{ow.parentComment}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(ow.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
