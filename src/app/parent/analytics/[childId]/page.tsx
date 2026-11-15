'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChartColumn, CircleCheck, ClipboardList, Star, Target, TrendingUp, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { subjectLabel } from '@/lib/subjects';
import StatCard, { StatGrid } from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';
import Page, { PageLoader, PageMessage } from '@/components/ui/Page';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Hexagon from '@/components/ui/Hexagon';
import { Segmented } from '@/components/ui/Choice';
import { Input } from '@/components/ui/Field';
import ChartCard from '@/components/charts/ChartCard';
import {
  activeDotProps, axisProps, barCursor, ChartTooltip, dotProps, gridProps, legendFormatter, lineCursor, series, surface,
} from '@/components/charts/chartTheme';
import { startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts';

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

const datePresets: Array<{ value: DatePreset; label: string }> = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_7', label: '7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

// One colour per activity type, everywhere it appears. Colour follows the type, never its rank.
const activityTypes = [
  { key: 'assignment', label: 'Assignments', singular: 'Assignment', color: series[1] },
  { key: 'practice', label: 'Practice', singular: 'Practice', color: series[2] },
  { key: 'offline', label: 'Offline', singular: 'Offline', color: series[3] },
] as const;

const typeInfo = (type: string) => activityTypes.find(t => t.key === type);

/** Axis label for an ISO day: "2026-11-09" becomes "Nov 9". Anything else is left as is. */
function shortDate(value: string | number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return m ? format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), 'MMM d') : String(value);
}

/** Activity type as text with its series colour beside it. */
function TypeKey({ type }: { type: string }) {
  const info = typeInfo(type);
  if (!info) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: info.color }} aria-hidden="true" />
      {info.singular}
    </span>
  );
}

/** Scatter point: an 8px+ dot with a surface ring, inside a larger invisible hover target. */
function ScatterDot({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle cx={cx} cy={cy} r={5} fill={fill} stroke={surface} strokeWidth={2} />
    </g>
  );
}

interface ScatterTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { date: string; score: number | null; type: string } }>;
}

function ScatterTooltip({ active, payload }: ScatterTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const info = typeInfo(point.type);
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-pop">
      <p className="mb-1 text-xs text-ink-muted">{point.date}</p>
      <p className="flex items-center gap-2 text-sm">
        <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: info?.color }} />
        <span className="font-semibold tabular-nums text-ink">{point.score}%</span>
        <span className="text-ink-muted">{info?.singular}</span>
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { token, loading } = useAuth();
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

  if (loading || dataLoading) return <PageLoader />;
  if (!data) return <PageMessage>No data available</PageMessage>;

  const { activityView } = data;
  const counts: Record<string, number> = {
    assignment: activityView.summary.assignmentCount,
    practice: activityView.summary.practiceCount,
    offline: activityView.summary.offlineCount,
  };

  const totalItems = activityView.activities.length;
  const totalPages = Math.ceil(totalItems / FEED_PAGE_SIZE);
  const paginatedActivities = activityView.activities.slice((feedPage - 1) * FEED_PAGE_SIZE, feedPage * FEED_PAGE_SIZE);

  // Plot days by their position in one sorted list. Left to itself the chart orders
  // days by first appearance per series, which scrambles the timeline.
  const chartDays = [...new Set(activityView.chartData.map(d => d.date))].sort();

  const subjectData = data.bySubject.map(d => ({ ...d, label: subjectLabel(d.subject) }));
  const difficultyData = data.byDifficulty.map(d => ({ ...d, label: d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1) }));
  // Horizontal bars: one row per category, so long names never collide
  const barHeight = (rows: number) => Math.max(120, rows * 40 + 36);

  return (
    <Page>
      <PageHeader back={{ href: '/parent/analytics', label: 'Back to reports' }} title="Progress" />

      {/* Activity in a chosen period */}
      <section className="mb-10" aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="font-display text-xl font-semibold text-ink">Activity</h2>

        {/* One filter row scoping everything in this section */}
        <div className="mb-5 mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Segmented label="Period" size="sm" value={datePreset} onChange={setDatePreset} options={datePresets} />
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <Input controlSize="sm" type="date" aria-label="From" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="!w-auto" />
              <span className="text-sm text-ink-muted">to</span>
              <Input controlSize="sm" type="date" aria-label="To" value={customTo} onChange={e => setCustomTo(e.target.value)} className="!w-auto" />
              <Button size="sm" onClick={handleCustomApply} disabled={!customFrom || !customTo}>Apply</Button>
            </div>
          )}
          <p className="text-sm text-ink-subtle">{activityView.from} to {activityView.to}</p>
        </div>

        {/* While a new period loads, keep the old numbers on screen, dimmed */}
        <div className={cn('space-y-5 transition-opacity', activityLoading && 'opacity-50')} aria-busy={activityLoading}>
          <StatGrid>
            <StatCard title="Activities" value={activityView.summary.totalActivities} icon={ClipboardList} />
            <StatCard title="Average score" value={`${activityView.summary.avgScore}%`} icon={Target} />
            <StatCard title="Points earned" value={activityView.summary.totalPoints.toLocaleString()} icon={Star} />
            <StatCard
              title="By type"
              icon={ChartColumn}
              value={
                <span className="flex flex-col gap-1.5 text-sm font-medium leading-none tracking-normal">
                  {activityTypes.map(t => (
                    <span key={t.key} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                      <span className="tabular-nums text-ink">{counts[t.key]}</span>
                      <span className="font-normal text-ink-muted">{t.label}</span>
                    </span>
                  ))}
                </span>
              }
            />
          </StatGrid>

          {/* The activity table below is this chart's table view */}
          <ChartCard
            title="Scores by activity type"
            subtitle="Each dot is one scored activity."
            empty={activityView.chartData.length === 0 && 'No scored activities in this range'}
          >
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[-0.5, chartDays.length - 0.5]}
                  ticks={chartDays.map((_, i) => i)}
                  tickFormatter={i => shortDate(chartDays[i] ?? '')}
                  minTickGap={16}
                  {...axisProps}
                />
                <YAxis dataKey="score" domain={[0, 100]} unit="%" {...axisProps} axisLine={false} />
                <Tooltip content={<ScatterTooltip />} cursor={false} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={legendFormatter}
                  itemSorter={item => activityTypes.findIndex(t => t.label === item.value)}
                />
                {activityTypes.map(t => {
                  const points = activityView.chartData
                    .filter(d => d.type === t.key)
                    .map(d => ({ ...d, day: chartDays.indexOf(d.date) }));
                  return points.length > 0
                    ? <Scatter key={t.key} name={t.label} data={points} fill={t.color} shape={ScatterDot} />
                    : null;
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Unified activity feed */}
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-ink">Activity log</h3>
              {totalItems > 0 && (
                <span className="text-xs tabular-nums text-ink-subtle">
                  {(feedPage - 1) * FEED_PAGE_SIZE + 1}–{Math.min(feedPage * FEED_PAGE_SIZE, totalItems)} of {totalItems}
                </span>
              )}
            </div>
            {totalItems > 0 ? (
              <>
                {/* Desktop header */}
                <div className="hidden grid-cols-6 gap-4 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle md:grid">
                  <span>Date</span>
                  <span>Subject</span>
                  <span>Type</span>
                  <span>Topic</span>
                  <span className="text-right">Score</span>
                  <span className="text-right">Points</span>
                </div>
                <div className="divide-y divide-line">
                  {paginatedActivities.map(a => (
                    <div key={a.id} className="py-3 md:grid md:grid-cols-6 md:items-center md:gap-4">
                      {/* Mobile stacked layout */}
                      <div className="mb-1 flex items-center justify-between gap-3 md:hidden">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="truncate text-sm font-semibold text-ink">{subjectLabel(a.subject)}</span>
                          <TypeKey type={a.type} />
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-ink">{a.score !== null ? `${a.score}%` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:hidden">
                        <span className="truncate text-xs text-ink-muted">{a.date} {a.topic && `· ${a.topic}`}</span>
                        <span className="shrink-0 text-xs text-ink-muted">{a.pointsAwarded ? `+${a.pointsAwarded} pts` : ''}</span>
                      </div>
                      {/* Desktop grid layout */}
                      <span className="hidden text-sm tabular-nums text-ink-muted md:block">{a.date}</span>
                      <span className="hidden text-sm font-semibold text-ink md:block">{subjectLabel(a.subject)}</span>
                      <span className="hidden md:block"><TypeKey type={a.type} /></span>
                      <span className="hidden truncate text-sm text-ink-muted md:block">{a.topic || '—'}</span>
                      <span className="hidden text-right text-sm font-semibold tabular-nums text-ink md:block">{a.score !== null ? `${a.score}%` : '—'}</span>
                      <span className="hidden text-right text-sm tabular-nums text-ink-muted md:block">{a.pointsAwarded ? `+${a.pointsAwarded}` : '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 border-t border-line pt-4">
                    <Button variant="secondary" size="sm" onClick={() => setFeedPage(p => Math.max(1, p - 1))} disabled={feedPage === 1}>
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setFeedPage(page)}
                        aria-current={feedPage === page ? 'page' : undefined}
                        className={cn(
                          'h-8 w-8 rounded-lg text-sm font-semibold tabular-nums transition-colors',
                          feedPage === page ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-muted hover:text-ink'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    <Button variant="secondary" size="sm" onClick={() => setFeedPage(p => Math.min(totalPages, p + 1))} disabled={feedPage === totalPages}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-sm text-ink-muted">No activities in this date range</p>
            )}
          </Card>
        </div>
      </section>

      {/* Lifetime */}
      <section aria-labelledby="lifetime-heading">
        <h2 id="lifetime-heading" className="mb-3 font-display text-xl font-semibold text-ink">All time</h2>
        <StatGrid className="mb-5">
          <StatCard title="Completed" value={data.totalCompleted} icon={CircleCheck} />
          <StatCard title="Completion rate" value={`${data.completionRate}%`} icon={ClipboardList} />
          <StatCard title="Average score" value={`${data.avgScore}%`} icon={Target} />
          <StatCard title="Strongest subject" value={data.strongest ? subjectLabel(data.strongest) : 'N/A'} icon={Trophy} />
        </StatGrid>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Score trends */}
          <ChartCard
            className="lg:col-span-2"
            title="Score trend"
            subtitle="Score on each reviewed assignment, oldest to newest."
            empty={data.scoreTrends.length === 0 && 'No data yet'}
            table={{ columns: ['Date', 'Subject', 'Score'], rows: data.scoreTrends.map(d => [d.date, subjectLabel(d.subject), `${d.score}%`]) }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.scoreTrends} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" minTickGap={24} tickFormatter={shortDate} {...axisProps} />
                <YAxis domain={[0, 100]} unit="%" {...axisProps} axisLine={false} />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={lineCursor} />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke={series[1]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={dotProps(series[1])}
                  activeDot={activeDotProps(series[1])}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* By subject */}
          <ChartCard
            title="Average score by subject"
            empty={subjectData.length === 0 && 'No data yet'}
            table={{ columns: ['Subject', 'Average', 'Assignments'], rows: subjectData.map(d => [d.label, `${d.avgScore}%`, d.count]) }}
          >
            <ResponsiveContainer width="100%" height={barHeight(subjectData.length)}>
              <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} vertical horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} axisLine={false} />
                <YAxis type="category" dataKey="label" width={118} {...axisProps} />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={barCursor} />
                <Bar dataKey="avgScore" name="Average score" fill={series[1]} radius={[0, 4, 4, 0]} maxBarSize={16}>
                  <LabelList dataKey="avgScore" position="right" formatter={(v: unknown) => `${v}%`} fill="rgb(var(--ink))" fontSize={12} fontWeight={600} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="space-y-5">
            {/* By difficulty */}
            <ChartCard
              title="Average score by difficulty"
              empty={difficultyData.length === 0 && 'No data yet'}
              table={{ columns: ['Difficulty', 'Average', 'Assignments'], rows: difficultyData.map(d => [d.label, `${d.avgScore}%`, d.count]) }}
            >
              <ResponsiveContainer width="100%" height={barHeight(difficultyData.length)}>
                <BarChart data={difficultyData} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
                  <CartesianGrid {...gridProps} vertical horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} axisLine={false} />
                  <YAxis type="category" dataKey="label" width={72} {...axisProps} />
                  <Tooltip content={<ChartTooltip unit="%" />} cursor={barCursor} />
                  <Bar dataKey="avgScore" name="Average score" fill={series[1]} radius={[0, 4, 4, 0]} maxBarSize={16}>
                    <LabelList dataKey="avgScore" position="right" formatter={(v: unknown) => `${v}%`} fill="rgb(var(--ink))" fontSize={12} fontWeight={600} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Weakest subject */}
            <Card>
              <h3 className="font-display text-base font-semibold text-ink">Area to improve</h3>
              {data.weakest ? (
                <div className="mt-4 flex items-center gap-4">
                  <Hexagon size={48} tone="soft">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </Hexagon>
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">{subjectLabel(data.weakest)}</p>
                    <p className="text-sm text-ink-muted">Could use more practice</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">Complete more assignments to see insights</p>
              )}
            </Card>
          </div>
        </div>
      </section>
    </Page>
  );
}
