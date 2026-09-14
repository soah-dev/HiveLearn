'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import AssignmentCard from '@/components/AssignmentCard';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';

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
  activityDate: string | null;
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
  const [practiceSessions, setPracticeSessions] = useState<{ score: number | null; status: string }[]>([]);
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
  const [owActivityDate, setOwActivityDate] = useState('');
  const [owDateBounds, setOwDateBounds] = useState<{ min: string; max: string } | null>(null);
  const [owSubmitting, setOwSubmitting] = useState(false);
  const [owError, setOwError] = useState('');

  useEffect(() => {
    if (token) {
      Promise.all([
        apiFetch('/api/assignments', token),
        apiFetch('/api/gamification', token),
        apiFetch('/api/offline-work', token),
        apiFetch('/api/practice', token),
      ]).then(([assignmentsData, gamData, offlineData, practiceData]) => {
        setAssignments(assignmentsData.assignments || []);
        setGamification(gamData.gamification);
        setRecentBadges((gamData.earnedBadges || []).slice(0, 3));
        setOfflineWork(offlineData.entries || []);
        setPracticeSessions(practiceData.sessions || []);
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
          activityDate: owActivityDate || null,
        }),
      });
      const data = await apiFetch('/api/offline-work', token);
      setOfflineWork(data.entries || []);
      setShowOfflineForm(false);
      setOwBook('');
      setOwQuestions(10);
      setOwScore(0);
      setOwActivityDate('');
    } catch (err) {
      setOwError(err instanceof Error ? err.message : 'Failed to submit');
    }
    setOwSubmitting(false);
  };

  if (loading || dataLoading) return <div className="p-8"><LoadingSpinner size="lg" /></div>;

  // In-progress work first so "pick up where you left off" is always at the top
  const pending = assignments
    .filter(a => a.status === 'pending' || a.status === 'in_progress')
    .sort((a, b) => (a.status === 'in_progress' ? -1 : 0) - (b.status === 'in_progress' ? -1 : 0));
  const completed = assignments.filter(a => a.status === 'reviewed');
  const scoredAssignments = completed.filter(a => a.score !== null);
  const completedPractice = practiceSessions.filter(p => p.status === 'completed' && p.score !== null);
  const totalScoredCount = scoredAssignments.length + completedPractice.length;
  const totalScoreSum = scoredAssignments.reduce((sum, a) => sum + (a.score || 0), 0)
    + completedPractice.reduce((sum, p) => sum + (p.score || 0), 0);
  const accuracyRate = totalScoredCount > 0 ? Math.round(totalScoreSum / totalScoredCount) : 0;
  const inProgressCount = pending.filter(a => a.status === 'in_progress').length;

  const fieldClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all';

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title={<>Hey, {user?.name?.split(' ')[0] || 'Student'}! 👋</>}
          subtitle={pending.length > 0
            ? `You have ${pending.length} assignment${pending.length > 1 ? 's' : ''} waiting${inProgressCount > 0 ? `, ${inProgressCount} in progress` : ''}.`
            : 'Ready to learn something new today?'}
          actions={
            <Link
              href="/child/practice"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              Practice on your own
            </Link>
          }
        >
          {gamification && gamification.currentStreak > 0 && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full">
              <span className="text-xl animate-float" aria-hidden="true">🔥</span>
              <span className="font-bold text-orange-700 dark:text-orange-300">{gamification.currentStreak} day streak!</span>
            </div>
          )}
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard title="Total Points" value={gamification?.totalPoints || 0} icon="⭐" accent="purple" />
          <StatCard title="Accuracy Rate" value={`${accuracyRate}%`} icon="🎯" accent="green" />
          <StatCard title="Pending" value={pending.length} icon="📋" accent="amber" />
          <StatCard title="Completed" value={completed.length} icon="✅" accent="teal" />
        </div>

        {/* Pending Assignments: the main task, so it comes first */}
        <section className="mb-10" aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-xl font-bold text-gray-900 dark:text-white mb-4 animate-slide-up">
            Your Assignments {pending.length > 0 && <span className="text-sm font-normal text-gray-500">({pending.length})</span>}
          </h2>
          {pending.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="All caught up!"
              description="No pending assignments. Start a practice session to keep your streak alive and earn extra points."
              action={
                <Link href="/child/practice" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all">
                  Start practicing
                </Link>
              }
            />
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
        </section>

        {/* Badges + SAT side by side on wide screens */}
        {(recentBadges.length > 0 || user?.satEnabled) && (
          <div className={`grid gap-4 mb-10 ${recentBadges.length > 0 && user?.satEnabled ? 'lg:grid-cols-2' : ''}`}>
            {recentBadges.length > 0 && (
              <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5 animate-slide-up" aria-labelledby="badges-heading">
                <div className="flex items-center justify-between mb-4">
                  <h2 id="badges-heading" className="text-lg font-bold text-gray-900 dark:text-white">Recent Badges</h2>
                  <Link href="/child/badges" className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline">View all</Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {recentBadges.map((b, i) => (
                    <div
                      key={b.id}
                      className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 p-3 text-center card-hover animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                      title={b.badge.name}
                    >
                      <p className="text-3xl mb-1 animate-float" aria-hidden="true">{b.badge.icon}</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2">{b.badge.name}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {user?.satEnabled && (
              <Link
                href="/child/sat"
                className="flex items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 p-5 card-hover animate-slide-up"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl flex-shrink-0" aria-hidden="true">📝</span>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white">SAT Practice</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Full Digital SAT simulation with adaptive scoring</p>
                  </div>
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">Start &rarr;</span>
              </Link>
            )}
          </div>
        )}

        {/* Completed Assignments */}
        {completed.length > 0 && (
          <section className="mb-10" aria-labelledby="completed-heading">
            <h2 id="completed-heading" className="text-xl font-bold text-gray-900 dark:text-white mb-4">Completed</h2>
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
          </section>
        )}

        {/* Offline Work */}
        <section aria-labelledby="offline-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 id="offline-heading" className="text-xl font-bold text-gray-900 dark:text-white">Offline Work</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Studied from a book or another site? Log it for points.</p>
            </div>
            <button
              onClick={() => {
                if (!showOfflineForm) {
                  const now = Date.now();
                  setOwDateBounds({
                    min: new Date(now - 7 * 86400000).toISOString().split('T')[0],
                    max: new Date(now).toISOString().split('T')[0],
                  });
                }
                setShowOfflineForm(!showOfflineForm);
              }}
              aria-expanded={showOfflineForm}
              className="self-start sm:self-auto text-sm bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md shadow-teal-500/20"
            >
              {showOfflineForm ? 'Close' : '+ Log Offline Work'}
            </button>
          </div>

          {showOfflineForm && (
            <form
              onSubmit={e => { e.preventDefault(); submitOfflineWork(); }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-4 animate-slide-up"
            >
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Log Offline Work</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="ow-subject" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                  <select id="ow-subject" value={owSubject} onChange={e => setOwSubject(e.target.value)} className={fieldClass}>
                    {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ow-difficulty" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                  <select id="ow-difficulty" value={owDifficulty} onChange={e => setOwDifficulty(e.target.value)} className={fieldClass}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ow-questions" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
                  <input id="ow-questions" type="number" min={1} max={100} value={owQuestions} onChange={e => setOwQuestions(Number(e.target.value))} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="ow-score" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Score (%)</label>
                  <input id="ow-score" type="number" min={0} max={100} value={owScore} onChange={e => setOwScore(Number(e.target.value))} className={fieldClass} />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="ow-book" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Book / Resource Reference (optional)</label>
                <input
                  id="ow-book"
                  type="text"
                  value={owBook}
                  onChange={e => setOwBook(e.target.value)}
                  placeholder="e.g. Math Workbook Ch. 5, Khan Academy Algebra"
                  className={fieldClass}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="ow-date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Activity (optional)</label>
                <input
                  id="ow-date"
                  type="date"
                  value={owActivityDate}
                  min={owDateBounds?.min}
                  max={owDateBounds?.max}
                  onChange={e => setOwActivityDate(e.target.value)}
                  className={fieldClass}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Leave blank to use today&apos;s date. Must be within the last 7 days.</p>
              </div>
              {owError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                  {owError}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={owSubmitting || owQuestions < 1}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all shadow-md"
                >
                  {owSubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOfflineForm(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-4 py-2.5 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {offlineWork.length === 0 && !showOfflineForm ? (
            <EmptyState compact icon="📝" title="No offline work logged yet" description="Studied on your own? Log it here and your parent can approve it for points." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offlineWork.slice(0, 6).map((ow, i) => (
                <div
                  key={ow.id}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5 card-hover animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400 capitalize">{ow.subject.replace('_', ' ')}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
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
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400">+{ow.pointsAwarded} pts</p>
                  )}
                  {ow.parentComment && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{ow.parentComment}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(ow.activityDate || ow.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
