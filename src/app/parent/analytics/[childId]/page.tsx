'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  scoreTrends: Array<{ date: string; score: number; subject: string }>;
  bySubject: Array<{ subject: string; avgScore: number; count: number }>;
  byDifficulty: Array<{ difficulty: string; avgScore: number; count: number }>;
  totalAssignments: number;
  completionRate: number;
  avgScore: number;
  strongest: string | null;
  weakest: string | null;
  recentActivity: Array<{
    id: string;
    subject: string;
    topic: string;
    status: string;
    score: number | null;
    createdAt: string;
  }>;
  practice: {
    scoreTrends: Array<{ date: string; score: number; subject: string }>;
    bySubject: Array<{ subject: string; avgScore: number; count: number }>;
    totalSessions: number;
    avgScore: number;
    totalPoints: number;
  };
}

export default function AnalyticsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
      return;
    }
    if (token && params.childId) {
      apiFetch(`/api/analytics/${params.childId}`, token)
        .then(d => { setData(d); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router, params.childId]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (!data) return <><Navbar /><div className="p-8 text-center text-gray-500">No data available</div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-slide-up">
          <button onClick={() => router.back()} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline mb-3 inline-block">&larr; Back</button>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Progress Analytics</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Completed" value={data.totalAssignments} icon="📝" />
          <StatCard title="Completion Rate" value={`${data.completionRate}%`} icon="✅" />
          <StatCard title="Average Score" value={`${data.avgScore}%`} icon="📊" />
          <StatCard title="Strongest Subject" value={data.strongest ? data.strongest.replace('_', ' ') : 'N/A'} icon="💪" />
        </div>

        {/* Charts */}
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

        {/* Practice Analytics */}
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">Practice Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard title="Practice Sessions" value={data.practice.totalSessions} icon="🧠" />
            <StatCard title="Avg Practice Score" value={`${data.practice.avgScore}%`} icon="🎯" />
            <StatCard title="Practice Points" value={data.practice.totalPoints} icon="⭐" />
          </div>

          {data.practice.totalSessions > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Practice Score Trends</h3>
                {data.practice.scoreTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.practice.scoreTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">No data yet</p>
                )}
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Practice by Subject</h3>
                {data.practice.bySubject.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.practice.bySubject}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <Tooltip />
                      <Bar dataKey="avgScore" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">No data yet</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No practice sessions completed yet.</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          {data.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.map(a => (
                <div key={a.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white capitalize text-sm">{a.subject.replace('_', ' ')}: {a.topic}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      a.status === 'reviewed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                      a.status === 'submitted' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>{a.status.replace('_', ' ')}</span>
                    {a.score !== null && <p className="text-sm font-extrabold mt-1">{a.score}%</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No activity yet</p>
          )}
        </div>
      </main>
    </>
  );
}
