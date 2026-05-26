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

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const pending = assignments.filter(a => a.status === 'pending' || a.status === 'in_progress');
  const completed = assignments.filter(a => a.status === 'reviewed');
  const scoredAssignments = completed.filter(a => a.score !== null);
  const completedPractice = practiceSessions.filter(p => p.status === 'completed' && p.score !== null);
  const totalScoredCount = scoredAssignments.length + completedPractice.length;
  const totalScoreSum = scoredAssignments.reduce((sum, a) => sum + (a.score || 0), 0)
    + completedPractice.reduce((sum, p) => sum + (p.score || 0), 0);
  const accuracyRate = totalScoredCount > 0 ? Math.round(totalScoreSum / totalScoredCount) : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Hey, {user?.name || 'Student'}! 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ready to learn something new today?</p>
          {gamification && gamification.currentStreak > 0 && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full">
              <span className="text-xl animate-float">🔥</span>
              <span className="font-bold text-orange-700 dark:text-orange-300">{gamification.currentStreak} day streak!</span>
            </div>
          )}
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
          <div className="mb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Badges</h2>
              <button onClick={() => router.push('/child/badges')} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline">View all</button>
            </div>
            <div className="flex gap-3">
              {recentBadges.map((b, i) => (
                <div
                  key={b.id}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 p-4 text-center card-hover animate-slide-up min-w-[120px]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <p className="text-3xl mb-1 animate-float">{b.badge.icon}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{b.badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SAT Practice Quick Link */}
        {user?.satEnabled && (
          <div className="mb-8 animate-slide-up">
            <button
              onClick={() => router.push('/child/sat')}
              className="w-full text-left bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 p-5 card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📝</span>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">SAT Practice</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Full Digital SAT simulation with adaptive scoring</p>
                  </div>
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">Start Practice →</span>
              </div>
            </button>
          </div>
        )}

        {/* Pending Assignments */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 animate-slide-up">
            Pending Assignments {pending.length > 0 && <span className="text-sm font-normal text-gray-500">({pending.length})</span>}
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center">
              <p className="text-5xl mb-3 animate-float">🎉</p>
              <p className="text-gray-500 dark:text-gray-400 font-medium">All caught up! No pending assignments.</p>
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Completed</h2>
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Offline Work</h2>
            <button
              onClick={() => setShowOfflineForm(!showOfflineForm)}
              className="text-sm bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md shadow-teal-500/20"
            >
              + Log Offline Work
            </button>
          </div>

          {showOfflineForm && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-4 animate-slide-up">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Log Offline Work</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                  <select
                    value={owSubject}
                    onChange={e => setOwSubject(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  >
                    {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                  <select
                    value={owDifficulty}
                    onChange={e => setOwDifficulty(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={owQuestions}
                    onChange={e => setOwQuestions(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={owScore}
                    onChange={e => setOwScore(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Book / Resource Reference (optional)</label>
                <input
                  type="text"
                  value={owBook}
                  onChange={e => setOwBook(e.target.value)}
                  placeholder="e.g. Math Workbook Ch. 5, Khan Academy Algebra"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Activity (optional)</label>
                <input
                  type="date"
                  value={owActivityDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setOwActivityDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Leave blank to use today&apos;s date</p>
              </div>
              {owError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                  {owError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={submitOfflineWork}
                  disabled={owSubmitting || owQuestions < 1}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all shadow-md"
                >
                  {owSubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
                <button
                  onClick={() => setShowOfflineForm(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-4 py-2.5 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {offlineWork.length === 0 && !showOfflineForm ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center">
              <p className="text-4xl mb-3 animate-float">📝</p>
              <p className="text-gray-500 dark:text-gray-400">No offline work logged yet. Studied on your own? Log it here!</p>
            </div>
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
        </div>
      </main>
    </>
  );
}
