'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminStats {
  users: {
    total: number;
    parents: number;
    children: number;
    unfinishedOnboarding: number;
    activeLastWeek: number;
    signupTrend: Array<{ date: string; count: number }>;
  };
  families: {
    totalLinks: number;
    mostActive: Array<{
      parentName: string;
      parentEmail: string;
      childCount: number;
      assignmentCount: number;
    }>;
  };
  assignments: {
    total: number;
    completed: number;
    submitted: number;
    completionRate: number;
  };
  practice: {
    total: number;
    completed: number;
  };
  offlineWork: {
    total: number;
    approved: number;
  };
  subjects: Array<{ subject: string; count: number }>;
}

export default function AdminDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AdminStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token) {
      apiFetch('/api/admin/stats', token)
        .then(d => { setData(d); setDataLoading(false); })
        .catch(err => {
          if (err?.message?.includes('403') || err?.message?.includes('Forbidden')) {
            router.push('/');
          } else {
            setError('Failed to load admin data');
            setDataLoading(false);
          }
        });
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (error) return <><Navbar /><div className="p-8 text-center text-red-500">{error}</div></>;
  if (!data) return <><Navbar /><div className="p-8 text-center text-gray-500">No data available</div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform-wide metrics and activity</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard title="Total Users" value={data.users.total} icon="👥" />
          <StatCard title="Parents" value={data.users.parents} icon="👨‍👩‍👧" />
          <StatCard title="Children" value={data.users.children} icon="🧒" />
          <StatCard title="Active (7d)" value={data.users.activeLastWeek} icon="🟢" />
          <StatCard title="Families" value={data.families.totalLinks} icon="🏠" />
          <StatCard title="Incomplete Onboarding" value={data.users.unfinishedOnboarding} icon="⏳" />
        </div>

        {/* Signup Trend */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Signups (Last 30 Days)</h2>
          {data.users.signupTrend.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.users.signupTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1' }} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">No signups in the last 30 days</p>
          )}
        </div>

        {/* Activity Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard title="Assignments Created" value={data.assignments.total} icon="📝" />
          <StatCard title="Assignments Completed" value={data.assignments.completed} icon="✅" />
          <StatCard title="Completion Rate" value={`${data.assignments.completionRate}%`} icon="📈" />
          <StatCard title="Practice Sessions" value={data.practice.total} icon="🧠" />
          <StatCard title="Practice Completed" value={data.practice.completed} icon="🎯" />
          <StatCard title="Awaiting Review" value={data.assignments.submitted} icon="⏰" />
          <StatCard title="Offline Work Logged" value={data.offlineWork.total} icon="📓" />
          <StatCard title="Offline Approved" value={data.offlineWork.approved} icon="👍" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Subject Popularity */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Subject Popularity</h2>
            {data.subjects.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.subjects}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} name="Activities" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">No data yet</p>
            )}
          </div>

          {/* Most Active Families */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Most Active Families</h2>
            {data.families.mostActive.length > 0 ? (
              <div className="space-y-3">
                {data.families.mostActive.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{f.parentName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{f.parentEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{f.assignmentCount} assignments</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{f.childCount} {f.childCount === 1 ? 'child' : 'children'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">No family activity yet</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
