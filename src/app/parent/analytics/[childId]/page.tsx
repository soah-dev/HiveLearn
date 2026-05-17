'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import { startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ActivityItem {
  id: string;
  type: 'assignment' | 'practice' | 'offline';
  date: string;
  subject: string;
  topic: string;
  difficulty: string;
  score: number | null;
  pointsAwarded: number | null;
}

interface ActivityView {
  from: string;
  to: string;
  summary: {
    totalActivities: number;
    assignmentCount: number;
    practiceCount: number;
    offlineCount: number;
    avgScore: number;
    totalPoints: number;
  };
  chartData: Array<{ date: string; score: number | null; type: string }>;
  activities: ActivityItem[];
}

interface AnalyticsData {
  scoreTrends: Array<{ date: string; score: number; subject: string }>;
  bySubject: Array<{ subject: string; avgScore: number; count: number }>;
  byDifficulty: Array<{ difficulty: string; avgScore: number; count: number }>;
  totalCompleted: number;
  completionRate: number;
  avgScore: number;
  strongest: string | null;
  weakest: string | null;
  activityView: ActivityView;
}

type DatePreset = 'this_week' | 'last_7' | 'this_month' | 'custom';

export default function AnalyticsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('this_week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [feedPage, setFeedPage] = useState(1);
  const FEED_PAGE_SIZE = 10;

  const getDateRange = useCallback((preset: DatePreset): { from: string; to: string } | null => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    switch (preset) {
      case 'this_week':
        return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: today };
      case 'last_7':
        return { from: format(subDays(now, 6), 'yyyy-MM-dd'), to: today };
      case 'this_month':
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: today };
      case 'custom':
        if (customFrom && customTo) return { from: customFrom, to: customTo };
        return null;
      default:
        return null;
    }
  }, [customFrom, customTo]);

  // Auth guard
  useEffect(() => {
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch data (initial + when date range changes)
  useEffect(() => {
    if (!token || !params.childId || datePreset === 'custom') return;
    const range = getDateRange(datePreset);
    if (!range) return;

    const isInitial = data === null;
    if (isInitial) setDataLoading(true);
    else setActivityLoading(true);

    apiFetch(`/api/analytics/${params.childId}?from=${range.from}&to=${range.to}`, token)
      .then(d => { setData(d); setDataLoading(false); setActivityLoading(false); setFeedPage(1); })
      .catch(() => { setDataLoading(false); setActivityLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, token, params.childId]);

  const handleCustomApply = () => {
    if (!customFrom || !customTo || !token || !params.childId) return;
    setActivityLoading(true);
    apiFetch(`/api/analytics/${params.childId}?from=${customFrom}&to=${customTo}`, token)
      .then(d => { setData(d); setActivityLoading(false); setFeedPage(1); })
      .catch(() => setActivityLoading(false));
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (!data) return <><Navbar /><div className="p-8 text-center text-gray-500">No data available</div></>;

  const { activityView } = data;

  // Prepare scatter chart data grouped by type
  const assignmentChartData = activityView.chartData.filter(d => d.type === 'assignment');
  const practiceChartData = activityView.chartData.filter(d => d.type === 'practice');
  const offlineChartData = activityView.chartData.filter(d => d.type === 'offline');

  const typeBadge = (type: string) => {
    switch (type) {
      case 'assignment':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">Assignment</span>;
      case 'practice':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Practice</span>;
      case 'offline':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">Offline</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-slide-up">
          <button onClick={() => router.back()} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline mb-3 inline-block">&larr; Back</button>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Progress Analytics</h1>
        </div>

        {/* Lifetime Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Completed" value={data.totalCompleted} icon="📝" />
          <StatCard title="Completion Rate" value={`${data.completionRate}%`} icon="✅" />
          <StatCard title="Average Score" value={`${data.avgScore}%`} icon="📊" />
          <StatCard title="Strongest Subject" value={data.strongest ? data.strongest.replace('_', ' ') : 'N/A'} icon="💪" />
        </div>

        {/* Lifetime Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Trends */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Score Trends</h2>
            {data.scoreTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.scoreTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">No data yet</p>
            )}
          </div>

          {/* By Subject */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Scores by Subject</h2>
            {data.bySubject.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.bySubject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">No data yet</p>
            )}
          </div>

          {/* By Difficulty */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Scores by Difficulty</h2>
            {data.byDifficulty.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.byDifficulty}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">No data yet</p>
            )}
          </div>

          {/* Weakest Subject */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Areas to Improve</h2>
            <div className="flex flex-col items-center justify-center h-[260px]">
              {data.weakest ? (
                <>
                  <p className="text-5xl mb-4 animate-float">📈</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{data.weakest.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Could use more practice</p>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Complete more assignments to see insights</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity View */}
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">Activity View</h2>

          {/* Date Range Controls */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              {(['this_week', 'last_7', 'this_month', 'custom'] as DatePreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    datePreset === preset
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {preset === 'this_week' ? 'This Week' : preset === 'last_7' ? 'Last 7 Days' : preset === 'this_month' ? 'This Month' : 'Custom'}
                </button>
              ))}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleCustomApply}
                    disabled={!customFrom || !customTo}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Showing: {activityView.from} to {activityView.to}
            </p>
          </div>

          {activityLoading ? (
            <div className="py-8"><LoadingSpinner size="md" /></div>
          ) : (
            <>
              {/* Activity Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Activities" value={activityView.summary.totalActivities} icon="📋" />
                <StatCard title="Avg Score" value={`${activityView.summary.avgScore}%`} icon="🎯" />
                <StatCard title="Points Earned" value={activityView.summary.totalPoints} icon="⭐" />
                <StatCard
                  title="Breakdown"
                  value={`${activityView.summary.assignmentCount}A / ${activityView.summary.practiceCount}P / ${activityView.summary.offlineCount}O`}
                  icon="📊"
                />
              </div>

              {/* Combined Score Chart */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-6 card-hover">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Scores by Activity Type</h3>
                {activityView.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <YAxis dataKey="score" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Legend />
                      {assignmentChartData.length > 0 && (
                        <Scatter name="Assignments" data={assignmentChartData} fill="#6366F1" />
                      )}
                      {practiceChartData.length > 0 && (
                        <Scatter name="Practice" data={practiceChartData} fill="#10B981" />
                      )}
                      {offlineChartData.length > 0 && (
                        <Scatter name="Offline" data={offlineChartData} fill="#F59E0B" />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">No scored activities in this range</p>
                )}
              </div>

              {/* Unified Activity Feed */}
              {(() => {
                const totalItems = activityView.activities.length;
                const totalPages = Math.ceil(totalItems / FEED_PAGE_SIZE);
                const paginatedActivities = activityView.activities.slice(
                  (feedPage - 1) * FEED_PAGE_SIZE,
                  feedPage * FEED_PAGE_SIZE
                );

                return (
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Activity Feed</h3>
                      {totalItems > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(feedPage - 1) * FEED_PAGE_SIZE + 1}–{Math.min(feedPage * FEED_PAGE_SIZE, totalItems)} of {totalItems}
                        </span>
                      )}
                    </div>
                    {totalItems > 0 ? (
                      <>
                        {/* Desktop header */}
                        <div className="hidden md:grid grid-cols-6 gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                          <span>Date</span>
                          <span>Subject</span>
                          <span>Type</span>
                          <span>Topic</span>
                          <span className="text-right">Score</span>
                          <span className="text-right">Points</span>
                        </div>
                        <div className="space-y-2">
                          {paginatedActivities.map(a => (
                            <div key={a.id} className="md:grid md:grid-cols-6 md:gap-4 md:items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              {/* Mobile stacked layout */}
                              <div className="md:hidden flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {typeBadge(a.type)}
                                  <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">{a.subject.replace('_', ' ')}</span>
                                </div>
                                <span className="text-sm font-extrabold text-gray-900 dark:text-white">{a.score !== null ? `${a.score}%` : '—'}</span>
                              </div>
                              <div className="md:hidden flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{a.date} {a.topic && `· ${a.topic}`}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{a.pointsAwarded ? `+${a.pointsAwarded} pts` : ''}</span>
                              </div>
                              {/* Desktop grid layout */}
                              <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300">{a.date}</span>
                              <span className="hidden md:block text-sm font-semibold text-gray-900 dark:text-white capitalize">{a.subject.replace('_', ' ')}</span>
                              <span className="hidden md:block">{typeBadge(a.type)}</span>
                              <span className="hidden md:block text-sm text-gray-600 dark:text-gray-400 truncate">{a.topic || '—'}</span>
                              <span className="hidden md:block text-sm font-bold text-right text-gray-900 dark:text-white">{a.score !== null ? `${a.score}%` : '—'}</span>
                              <span className="hidden md:block text-sm text-right text-gray-600 dark:text-gray-400">{a.pointsAwarded ? `+${a.pointsAwarded}` : '—'}</span>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => setFeedPage(p => Math.max(1, p - 1))}
                              disabled={feedPage === 1}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <button
                                key={page}
                                onClick={() => setFeedPage(page)}
                                className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                                  feedPage === page
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() => setFeedPage(p => Math.min(totalPages, p + 1))}
                              disabled={feedPage === totalPages}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">No activities in this date range</p>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </main>
    </>
  );
}
