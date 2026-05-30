'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UsageData {
  totals: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    generations: number;
    reviews: number;
  };
  daily: Array<{
    date: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
  byUser: Array<{
    name: string;
    email: string;
    totalTokens: number;
    calls: number;
  }>;
  requestCount: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export default function AdminAiUsagePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token) {
      setDataLoading(true);
      setError('');
      apiFetch(`/api/ai/usage?period=${period}`, token)
        .then(data => {
          setUsage(data);
          setDataLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Failed to load usage data');
          setDataLoading(false);
        });
    }
  }, [user, token, loading, router, period]);

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  if (error) {
    return (
      <>
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <p className="text-red-600 dark:text-red-400 font-bold">{error}</p>
          </div>
        </main>
      </>
    );
  }

  const maxDaily = usage ? Math.max(...usage.daily.map(d => d.totalTokens), 1) : 1;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">AI Token Usage</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Platform-wide Gemini API consumption</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {(['week', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {p === 'week' ? '7 Days' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Tokens</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
              {formatTokens(usage?.totals.totalTokens || 0)}
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Input</p>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {formatTokens(usage?.totals.promptTokens || 0)}
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Output</p>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {formatTokens(usage?.totals.completionTokens || 0)}
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Generations</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {usage?.totals.generations || 0}
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reviews</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {usage?.totals.reviews || 0}
            </p>
          </div>
        </div>

        {/* Token Breakdown */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Token Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-400">Prompt (Input)</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatTokens(usage?.totals.promptTokens || 0)}</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: usage?.totals.totalTokens ? `${(usage.totals.promptTokens / usage.totals.totalTokens) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-400">Completion (Output)</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatTokens(usage?.totals.completionTokens || 0)}</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: usage?.totals.totalTokens ? `${(usage.totals.completionTokens / usage.totals.totalTokens) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Usage Chart */}
        {usage && usage.daily.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Daily Usage</h2>
            <div className="flex items-end gap-1 h-40">
              {usage.daily.map(day => (
                <div key={day.date} className="flex-1 h-full flex flex-col items-center justify-end gap-1 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {day.date}: {formatTokens(day.totalTokens)}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-md transition-all duration-300 hover:from-indigo-600 hover:to-purple-600 min-h-[2px]"
                    style={{ height: `${Math.max((day.totalTokens / maxDaily) * 160, 2)}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>{usage.daily[0]?.date}</span>
              <span>{usage.daily[usage.daily.length - 1]?.date}</span>
            </div>
          </div>
        )}

        {/* Per-User Breakdown */}
        {usage && usage.byUser.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Usage by Parent</h2>
            <div className="space-y-3">
              {usage.byUser.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{formatTokens(u.totalTokens)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.calls} calls</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {usage && usage.daily.length === 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-500 dark:text-gray-400">No AI usage recorded for this period yet.</p>
          </div>
        )}
      </main>
    </>
  );
}
