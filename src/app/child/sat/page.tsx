'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChartColumn, ChevronRight, CircleCheck, GraduationCap, Hourglass, Lock, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import StatCard, { StatGrid } from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Page, { PageLoader } from '@/components/ui/Page';
import Card, { ListCard, SectionHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Hexagon from '@/components/ui/Hexagon';
import { toneTextClass } from '@/components/ui/Pill';

interface SATSessionSummary {
  id: string;
  status: string;
  rwScaledScore: number | null;
  mathScaledScore: number | null;
  compositeScore: number | null;
  pointsAwarded: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const stageLabels: Record<string, string> = {
  not_started: 'Not started',
  rw_mod1: 'Reading & Writing · Module 1',
  rw_mod2: 'Reading & Writing · Module 2',
  break: 'On break',
  math_mod1: 'Math · Module 1',
  math_mod2: 'Math · Module 2',
};

export default function SATHubPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SATSessionSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && user?.satEnabled) {
      apiFetch('/api/sat/sessions', token)
        .then(data => { setSessions(data.sessions || []); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const startNewTest = async () => {
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      const data = await apiFetch('/api/sat/sessions', token, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      router.push(`/child/sat/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setCreating(false);
    }
  };

  // Sessions are only fetched when SAT is enabled, so only wait on them in that case
  if (loading || (user?.satEnabled && dataLoading)) return <PageLoader />;

  // Locked state
  if (!user?.satEnabled) {
    return (
      <Page width="narrow" className="lg:pt-20">
        <Card padding="lg" className="text-center">
          <Hexagon size={64} tone="muted">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </Hexagon>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">SAT practice is locked</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-muted">
            SAT Practice is not yet enabled for your account. Ask your parent to contact support.
          </p>
        </Card>
      </Page>
    );
  }

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const inProgressSessions = sessions.filter(s => s.status !== 'completed');
  const bestScore = completedSessions.length > 0
    ? Math.max(...completedSessions.map(s => s.compositeScore || 0))
    : 0;
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.compositeScore || 0), 0) / completedSessions.length)
    : 0;

  return (
    <Page>
      <PageHeader
        title="SAT practice"
        subtitle="Full Digital SAT simulation with adaptive scoring"
        actions={
          <Button onClick={startNewTest} loading={creating}>
            {creating ? 'Creating…' : 'Start new practice test'}
          </Button>
        }
      />

      {error && <Alert className="mb-6">{error}</Alert>}

      <StatGrid className="mb-8">
        <StatCard title="Tests completed" value={completedSessions.length} icon={CircleCheck} />
        <StatCard title="Best score" value={bestScore || '–'} icon={Trophy} />
        <StatCard title="Average score" value={avgScore || '–'} icon={ChartColumn} />
        <StatCard title="In progress" value={inProgressSessions.length} icon={Hourglass} />
      </StatGrid>

      {inProgressSessions.length > 0 && (
        <section className="mb-8" aria-labelledby="sat-progress-heading">
          <SectionHeader id="sat-progress-heading" title="In progress" count={inProgressSessions.length} />
          <ListCard>
            {inProgressSessions.map(s => (
              <li key={s.id}>
                <Link href={`/child/sat/${s.id}`} className="group flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                  <Hexagon size={40} tone="soft">
                    <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" />
                  </Hexagon>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink group-hover:underline">
                      {stageLabels[s.status] ?? s.status.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Started {new Date(s.startedAt || s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-text">
                    Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ListCard>
        </section>
      )}

      <section aria-labelledby="sat-past-heading">
        <SectionHeader id="sat-past-heading" title="Past tests" count={completedSessions.length || undefined} />
        {completedSessions.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No completed tests yet" description="Start your first practice test to get a scaled score for Reading & Writing and Math." />
        ) : (
          <ListCard>
            {completedSessions.map(s => {
              const composite = s.compositeScore || 0;
              const tone = composite >= 1200 ? 'good' : composite >= 800 ? 'warn' : 'bad';
              return (
                <li key={s.id}>
                  <Link href={`/child/sat/${s.id}`} className="group flex items-center gap-4 px-4 py-3.5 sm:px-5">
                    <p className={`w-16 shrink-0 text-2xl font-semibold tabular-nums tracking-tight ${toneTextClass(tone)}`}>{s.compositeScore}</p>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink group-hover:underline">
                        R&amp;W {s.rwScaledScore} · Math {s.mathScaledScore}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">{new Date(s.completedAt!).toLocaleDateString()}</p>
                    </div>
                    {s.pointsAwarded ? <span className="shrink-0 text-xs font-semibold text-honey-text">+{s.pointsAwarded} pts</span> : null}
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ListCard>
        )}
      </section>
    </Page>
  );
}
