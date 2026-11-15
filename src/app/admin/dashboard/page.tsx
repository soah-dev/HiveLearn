'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity, Brain, CircleCheck, ClipboardCheck, ClipboardList, GraduationCap, Hourglass, House, NotebookPen, Sparkles,
  Target, ThumbsUp, TrendingUp, UserCheck, UsersRound,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { subjectLabel } from '@/lib/subjects';
import PageHeader from '@/components/PageHeader';
import StatCard, { StatGrid } from '@/components/StatCard';
import Page, { PageLoader, PageMessage } from '@/components/ui/Page';
import Card, { SectionHeader } from '@/components/ui/Card';
import Button, { buttonClass } from '@/components/ui/Button';
import Pill from '@/components/ui/Pill';
import Spinner from '@/components/ui/Spinner';
import Switch from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Field';
import ChartCard from '@/components/charts/ChartCard';
import {
  activeDotProps, axisProps, barCursor, ChartTooltip, gridProps, lineCursor, series,
} from '@/components/charts/chartTheme';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

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
    hasScreenshot: boolean;
    status: string;
    response: string | null;
    respondedAt: string | null;
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
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const [screenshots, setScreenshots] = useState<Record<string, string>>({});
  const loadScreenshot = async (id: string) => {
    if (screenshots[id] || !token) return;
    try {
      const data = await apiFetch(`/api/admin/feedback/${id}/screenshot`, token);
      if (data.screenshotUrl) setScreenshots(prev => ({ ...prev, [id]: data.screenshotUrl }));
    } catch {
      // leave the placeholder in place
    }
  };

  const handleReply = async (id: string) => {
    const response = (replyDrafts[id] || '').trim();
    if (!response) return;
    setReplyingId(id);
    try {
      const res = await apiFetch(`/api/admin/feedback/${id}/reply`, token, {
        method: 'POST',
        body: JSON.stringify({ response }),
      });
      setData(prev => prev ? {
        ...prev,
        feedback: prev.feedback.map(f => f.id === id ? { ...f, ...res.feedback } : f),
      } : prev);
      setReplyDrafts(prev => { const next = { ...prev }; delete next[id]; return next; });
    } catch {
      // leave draft in place so the admin can retry
    } finally {
      setReplyingId(null);
    }
  };

  useEffect(() => {
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

  if (loading || dataLoading) return <PageLoader />;
  if (error) return <PageMessage tone="bad">{error}</PageMessage>;
  if (!data) return <PageMessage>No data available</PageMessage>;

  const subjectData = data.subjects.map(d => ({ ...d, label: subjectLabel(d.subject) }));
  const hasSignups = data.users.signupTrend.some(d => d.count > 0);

  const recalculateStreaks = async () => {
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
  };

  const toggleSat = async (child: SATChild) => {
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
  };

  return (
    <Page>
      <PageHeader
        title="Admin"
        subtitle="Platform-wide metrics and activity"
        actions={
          <Link href="/admin/ai-usage" className={buttonClass({ variant: 'secondary' })}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            AI usage
          </Link>
        }
      />

      {/* Key Metrics */}
      <section className="mb-8" aria-labelledby="users-heading">
        <SectionHeader id="users-heading" title="People" />
        <StatGrid cols="grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total users" value={data.users.total} icon={UsersRound} />
          <StatCard title="Parents" value={data.users.parents} icon={UserCheck} />
          <StatCard title="Children" value={data.users.children} icon={GraduationCap} />
          <StatCard title="Active (7d)" value={data.users.activeLastWeek} icon={Activity} />
          <StatCard title="Families" value={data.families.totalLinks} icon={House} />
          <StatCard title="Incomplete onboarding" value={data.users.unfinishedOnboarding} icon={Hourglass} />
        </StatGrid>
      </section>

      {/* Signup Trend */}
      <ChartCard
        className="mb-8"
        title="Signups"
        subtitle="New accounts per day, last 30 days."
        empty={!hasSignups && 'No signups in the last 30 days'}
        table={{ columns: ['Date', 'Signups'], rows: data.users.signupTrend.map(d => [d.date, d.count]) }}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.users.signupTrend} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" minTickGap={24} {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={lineCursor} />
            <Line
              type="monotone"
              dataKey="count"
              name="Signups"
              stroke={series[1]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotProps(series[1])}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Activity Metrics */}
      <section className="mb-8" aria-labelledby="activity-heading">
        <SectionHeader id="activity-heading" title="Activity" />
        <StatGrid>
          <StatCard title="Assignments created" value={data.assignments.total} icon={ClipboardList} />
          <StatCard title="Assignments completed" value={data.assignments.completed} icon={CircleCheck} />
          <StatCard title="Completion rate" value={`${data.assignments.completionRate}%`} icon={TrendingUp} />
          <StatCard title="Awaiting review" value={data.assignments.submitted} icon={ClipboardCheck} />
          <StatCard title="Practice sessions" value={data.practice.total} icon={Brain} />
          <StatCard title="Practice completed" value={data.practice.completed} icon={Target} />
          <StatCard title="Offline work logged" value={data.offlineWork.total} icon={NotebookPen} />
          <StatCard title="Offline approved" value={data.offlineWork.approved} icon={ThumbsUp} />
        </StatGrid>
      </section>

      {/* Charts Row */}
      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Subject Popularity */}
        <ChartCard
          title="Subject popularity"
          subtitle="Activities per subject."
          empty={subjectData.length === 0 && 'No data yet'}
          table={{ columns: ['Subject', 'Activities'], rows: subjectData.map(d => [d.label, d.count]) }}
        >
          <ResponsiveContainer width="100%" height={Math.max(120, subjectData.length * 40 + 36)}>
            <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...axisProps} axisLine={false} />
              <YAxis type="category" dataKey="label" width={118} {...axisProps} />
              <Tooltip content={<ChartTooltip />} cursor={barCursor} />
              <Bar dataKey="count" name="Activities" fill={series[1]} radius={[0, 4, 4, 0]} maxBarSize={16}>
                <LabelList dataKey="count" position="right" fill="rgb(var(--ink))" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Most Active Families */}
        <Card>
          <h3 className="mb-2 font-display text-base font-semibold text-ink">Most active families</h3>
          {data.families.mostActive.length > 0 ? (
            <ul className="divide-y divide-line">
              {data.families.mostActive.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{f.parentName}</p>
                    <p className="truncate text-xs text-ink-muted">{f.parentEmail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink">{f.assignmentCount} assignments</p>
                    <p className="text-xs text-ink-muted">{f.childCount} {f.childCount === 1 ? 'child' : 'children'}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-ink-muted">No family activity yet</p>
          )}
        </Card>
      </div>

      {/* Admin Tools */}
      <Card className="mb-8">
        <h2 className="font-display text-base font-semibold text-ink">Admin tools</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={recalculateStreaks} loading={streakRecalculating}>
            {streakRecalculating ? 'Recalculating…' : 'Recalculate all streaks'}
          </Button>
          {streakResult && <span className="text-sm text-ink-muted">{streakResult}</span>}
        </div>
      </Card>

      {/* SAT Access Management */}
      <Card className="mb-8">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">SAT access</h2>
        {satLoading ? (
          <Spinner className="text-honey" />
        ) : satChildren.length === 0 ? (
          <p className="text-sm text-ink-muted">No children registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  <th className="py-2 pr-4">Child</th>
                  <th className="py-2 pr-4">Parent</th>
                  <th className="py-2 text-right">SAT access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {satChildren.map(child => (
                  <tr key={child.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-ink">{child.name || 'Unnamed'}</p>
                      <p className="text-xs text-ink-muted">{child.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-ink">{child.parentName || '-'}</p>
                      <p className="text-xs text-ink-muted">{child.parentEmail || ''}</p>
                    </td>
                    <td className="py-3 text-right">
                      <Switch
                        label={`SAT access for ${child.name || child.email}`}
                        checked={child.satEnabled}
                        onChange={() => toggleSat(child)}
                        disabled={satToggling === child.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Feedback */}
      <section aria-labelledby="feedback-heading">
        <SectionHeader id="feedback-heading" title="User feedback" count={data.feedback.length} />
        {data.feedback.length > 0 ? (
          <div className="space-y-4">
            {data.feedback.map(f => (
              <Card key={f.id}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{f.userName}</p>
                    <p className="truncate text-xs text-ink-muted">{f.userEmail}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill className="capitalize">{f.userRole}</Pill>
                    <Pill tone={f.category === 'bug' ? 'bad' : f.category.startsWith('feature') ? 'info' : 'neutral'} className="capitalize">
                      {f.category.replace(/_/g, ' ')}
                    </Pill>
                    <Pill tone={f.status === 'resolved' ? 'good' : 'warn'}>{f.status === 'resolved' ? 'Resolved' : 'Open'}</Pill>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{f.message}</p>
                {f.hasScreenshot && (
                  <details className="mt-2" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) loadScreenshot(f.id); }}>
                    <summary className="cursor-pointer text-xs font-semibold text-honey-text hover:underline">
                      View screenshot
                    </summary>
                    {screenshots[f.id]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={screenshots[f.id]} alt="Feedback screenshot" className="mt-2 max-w-full rounded-lg border border-line" />
                      : <p className="mt-2 text-xs text-ink-subtle">Loading screenshot…</p>}
                  </details>
                )}
                <p className="mt-2 text-xs text-ink-subtle">{new Date(f.createdAt).toLocaleString()}</p>

                {f.response ? (
                  <div className="mt-3 rounded-xl bg-honey-soft p-3.5">
                    <p className="mb-1 text-xs font-semibold text-honey-text">Your reply{f.respondedAt ? ` · ${new Date(f.respondedAt).toLocaleString()}` : ''}</p>
                    <p className="whitespace-pre-wrap text-sm text-ink">{f.response}</p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Textarea
                      aria-label={`Reply to ${f.userName}`}
                      value={replyDrafts[f.id] || ''}
                      onChange={e => setReplyDrafts(prev => ({ ...prev, [f.id]: e.target.value }))}
                      placeholder="Write a reply…"
                      rows={2}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={() => handleReply(f.id)} loading={replyingId === f.id} disabled={!(replyDrafts[f.id] || '').trim()}>
                        {replyingId === f.id ? 'Sending…' : 'Send reply'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong py-8 text-center text-sm text-ink-muted">No feedback submitted yet</p>
        )}
      </section>
    </Page>
  );
}
