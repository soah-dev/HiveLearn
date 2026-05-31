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
  feedback: Array<{
    id: string;
    category: string;
    message: string;
    screenshotUrl: string | null;
    createdAt: string;
    userName: string;
    userEmail: string;
    userRole: string;
  }>;
}

interface SATChild {
  id: string;
  name: string | null;
  email: string;
  satEnabled: boolean;
  parentName: string | null;
  parentEmail: string | null;
}

export default function AdminDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AdminStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streakRecalculating, setStreakRecalculating] = useState(false);
  const [streakResult, setStreakResult] = useState<string | null>(null);
  const [satChildren, setSatChildren] = useState<SATChild[]>([]);
  const [satLoading, setSatLoading] = useState(true);
  const [satToggling, setSatToggling] = useState<string | null>(null);

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
      apiFetch('/api/admin/sat-access', token)
        .then(d => { setSatChildren(d.children || []); setSatLoading(false); })
        .catch(() => setSatLoading(false));
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (error) return <><Navbar /><div className="p-8 text-center text-red-500">{error}</div></>;
  if (!data) return <><Navbar /><div className="p-8 text-center text-gray-500">No data available</div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform-wide metrics and activity</p>
          </div>
          <a
            href="/admin/ai-usage"
            className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-5 py-3 rounded-xl font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
          >
            AI Usage
          </a>
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

        {/* Admin Tools */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Admin Tools</h2>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={async () => {
                if (!token) return;
                setStreakRecalculating(true);
                setStreakResult(null);
                try {
                  const res = await fetch('/api/admin/recalculate-streaks', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  const count = data.results?.length || 0;
                  const updated = data.results?.filter((r: { currentStreak: number }) => r.currentStreak > 0).length || 0;
                  setStreakResult(`Recalculated ${count} children. ${updated} have active streaks.`);
                } catch {
                  setStreakResult('Failed to recalculate streaks.');
                }
                setStreakRecalculating(false);
              }}
              disabled={streakRecalculating}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {streakRecalculating ? 'Recalculating...' : 'Recalculate All Streaks'}
            </button>
            {streakResult && (
              <span className="text-sm text-gray-700 dark:text-gray-300">{streakResult}</span>
            )}
          </div>
        </div>

        {/* SAT Access Management */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">SAT Access Management</h2>
          {satLoading ? (
            <LoadingSpinner size="sm" />
          ) : satChildren.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No children registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Child</th>
                    <th className="py-2 pr-4">Parent</th>
                    <th className="py-2 pr-4 text-center">SAT Access</th>
                  </tr>
                </thead>
                <tbody>
                  {satChildren.map(child => (
                    <tr key={child.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900 dark:text-white">{child.name || 'Unnamed'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{child.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-gray-700 dark:text-gray-300">{child.parentName || '-'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{child.parentEmail || ''}</p>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <button
                          onClick={async () => {
                            if (!token) return;
                            setSatToggling(child.id);
                            try {
                              await fetch('/api/admin/sat-access', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ childId: child.id, enabled: !child.satEnabled }),
                              });
                              setSatChildren(prev => prev.map(c => c.id === child.id ? { ...c, satEnabled: !c.satEnabled } : c));
                            } catch { /* ignore */ }
                            setSatToggling(null);
                          }}
                          disabled={satToggling === child.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            child.satEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                          } ${satToggling === child.id ? 'opacity-50' : ''}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                            child.satEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Feedback</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{data.feedback.length} total</span>
          </div>
          {data.feedback.length > 0 ? (
            <div className="space-y-4">
              {data.feedback.map(f => (
                <div key={f.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{f.userName}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{f.userEmail}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                        f.userRole === 'parent'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200'
                          : f.userRole === 'child'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>{f.userRole}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      f.category === 'bug' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                      f.category === 'feature' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>{f.category}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{f.message}</p>
                  {f.screenshotUrl && (
                    <details className="mt-2">
                      <summary className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                        View screenshot
                      </summary>
                      <img src={f.screenshotUrl} alt="Feedback screenshot" className="mt-2 max-w-full rounded-lg border border-gray-200 dark:border-gray-700" />
                    </details>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(f.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No feedback submitted yet</p>
          )}
        </div>
      </main>
    </>
  );
}
