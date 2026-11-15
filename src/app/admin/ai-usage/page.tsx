'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import StatCard, { StatGrid } from '@/components/StatCard';
import Page, { PageLoader } from '@/components/ui/Page';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { Segmented } from '@/components/ui/Choice';
import ChartCard from '@/components/charts/ChartCard';
import { axisProps, barCursor, ChartTooltip, gridProps, series } from '@/components/charts/chartTheme';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

const periods = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
] as const;

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
  const [loadedPeriod, setLoadedPeriod] = useState<string | null>(null);
  const dataLoading = loadedPeriod !== period;
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      apiFetch(`/api/ai/usage?period=${period}`, token)
        .then(data => {
          setUsage(data);
          setError('');
          setLoadedPeriod(period);
        })
        .catch(err => {
          setError(err.message || 'Failed to load usage data');
          setLoadedPeriod(period);
        });
    }
  }, [user, token, loading, router, period]);

  if (loading || dataLoading) return <PageLoader />;

  if (error) {
    return (
      <Page width="medium">
        <PageHeader back={{ href: '/admin/dashboard', label: 'Back to admin' }} title="AI token usage" />
        <Alert>{error}</Alert>
      </Page>
    );
  }

  const totals = usage?.totals;
  const totalTokens = totals?.totalTokens || 0;
  // Input vs output is one whole split in two, so it is drawn as a single stacked bar
  const split = [
    { label: 'Prompt (input)', value: totals?.promptTokens || 0, color: series[1] },
    { label: 'Completion (output)', value: totals?.completionTokens || 0, color: series[2] },
  ];

  return (
    <Page width="medium">
      <PageHeader
        back={{ href: '/admin/dashboard', label: 'Back to admin' }}
        title="AI token usage"
        subtitle="Platform-wide Gemini API consumption"
        actions={<Segmented label="Period" value={period} onChange={setPeriod} options={periods} />}
      />

      {/* Summary */}
      <StatGrid cols="grid-cols-2 sm:grid-cols-5" className="mb-6">
        <StatCard className="col-span-2 sm:col-span-1" title="Total tokens" value={formatTokens(totalTokens)} />
        <StatCard title="Input" value={formatTokens(totals?.promptTokens || 0)} />
        <StatCard title="Output" value={formatTokens(totals?.completionTokens || 0)} />
        <StatCard title="Generations" value={totals?.generations || 0} />
        <StatCard title="Reviews" value={totals?.reviews || 0} />
      </StatGrid>

      {/* Token Breakdown */}
      <Card className="mb-6">
        <h2 className="font-display text-base font-semibold text-ink">Token breakdown</h2>
        <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={split.map(p => `${p.label}: ${formatTokens(p.value)}`).join(', ')}>
          {totalTokens > 0 && split.map(part => (
            <div key={part.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(part.value / totalTokens) * 100}%`, background: part.color }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {split.map(part => (
            <li key={part.label} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: part.color }} aria-hidden="true" />
              <span className="text-ink-muted">{part.label}</span>
              <span className="font-semibold tabular-nums text-ink">{formatTokens(part.value)}</span>
              {totalTokens > 0 && <span className="tabular-nums text-ink-subtle">{Math.round((part.value / totalTokens) * 100)}%</span>}
            </li>
          ))}
        </ul>
      </Card>

      {/* Daily Usage Chart */}
      {usage && usage.daily.length > 0 && (
        <ChartCard
          className="mb-6"
          title="Daily usage"
          subtitle="Total tokens per day."
          table={{
            columns: ['Date', 'Input', 'Output', 'Total'],
            rows: usage.daily.map(d => [d.date, formatTokens(d.promptTokens), formatTokens(d.completionTokens), formatTokens(d.totalTokens)]),
          }}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={usage.daily} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" minTickGap={24} {...axisProps} />
              <YAxis tickFormatter={formatTokens} {...axisProps} axisLine={false} />
              <Tooltip content={<ChartTooltip formatValue={v => formatTokens(Number(v))} />} cursor={barCursor} />
              <Bar dataKey="totalTokens" name="tokens" fill={series[1]} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Per-User Breakdown */}
      {usage && usage.byUser.length > 0 && (
        <Card>
          <h2 className="mb-2 font-display text-base font-semibold text-ink">Usage by parent</h2>
          <ul className="divide-y divide-line">
            {usage.byUser.map((u, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  <p className="truncate text-xs text-ink-muted">{u.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink">{formatTokens(u.totalTokens)}</p>
                  <p className="text-xs text-ink-muted">{u.calls} calls</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {usage && usage.daily.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong py-10 text-center text-sm text-ink-muted">
          No AI usage recorded for this period yet.
        </p>
      )}
    </Page>
  );
}
