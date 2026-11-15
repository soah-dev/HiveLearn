'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ChevronRight, CircleCheck, Flame, GraduationCap, NotebookPen, PartyPopper, Plus, Star, Target, Timer } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { DIFFICULTIES, SUBJECTS, subjectLabel } from '@/lib/subjects';
import StatCard, { StatGrid } from '@/components/StatCard';
import AssignmentRow from '@/components/AssignmentRow';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import Page, { PageLoader } from '@/components/ui/Page';
import Card, { ListCard, SectionHeader } from '@/components/ui/Card';
import Button, { buttonClass } from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill, { Tone } from '@/components/ui/Pill';
import Hexagon from '@/components/ui/Hexagon';
import SubjectIcon from '@/components/ui/SubjectIcon';
import DifficultyMeter from '@/components/ui/DifficultyMeter';
import BadgeMedal from '@/components/ui/BadgeMedal';
import { Field, Input, Select } from '@/components/ui/Field';

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
  badge: { name: string; criteria?: string };
  earnedAt: string;
}

const offlineStatus: Record<string, { label: string; tone: Tone }> = {
  approved: { label: 'Approved', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'bad' },
};

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
  const [owDateBounds, setOwDateBounds] = useState<{ min: string; max: string } | null>(null);
  const [owSubmitting, setOwSubmitting] = useState(false);
  const [owError, setOwError] = useState('');

  useEffect(() => {
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

  const openOfflineForm = () => {
    const now = Date.now();
    setOwDateBounds({
      min: new Date(now - 7 * 86400000).toISOString().split('T')[0],
      max: new Date(now).toISOString().split('T')[0],
    });
    setOwError('');
    setShowOfflineForm(true);
  };

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

  if (loading || dataLoading) return <PageLoader />;

  // In-progress work first so "pick up where you left off" is always at the top
  const pending = assignments
    .filter(a => a.status === 'pending' || a.status === 'in_progress')
    .sort((a, b) => (a.status === 'in_progress' ? -1 : 0) - (b.status === 'in_progress' ? -1 : 0));
  const completed = assignments.filter(a => a.status === 'reviewed');
  const scoredAssignments = completed.filter(a => a.score !== null);
  const completedPractice = practiceSessions.filter(p => p.status === 'completed' && p.score !== null);
  const totalScoredCount = scoredAssignments.length + completedPractice.length;
  const totalScoreSum = scoredAssignments.reduce((sum, a) => sum + (a.score || 0), 0)
    + completedPractice.reduce((sum, p) => sum + (p.score || 0), 0);
  const accuracyRate = totalScoredCount > 0 ? Math.round(totalScoreSum / totalScoredCount) : 0;
  const inProgressCount = pending.filter(a => a.status === 'in_progress').length;

  // The first pending assignment gets the spotlight; the rest are a plain list
  const [upNext, ...queue] = pending;
  const streak = gamification?.currentStreak || 0;

  return (
    <Page>
      <PageHeader
        title={`Hey, ${user?.name?.split(' ')[0] || 'Student'}`}
        subtitle={pending.length > 0
          ? `You have ${pending.length} assignment${pending.length > 1 ? 's' : ''} waiting${inProgressCount > 0 ? `, ${inProgressCount} in progress` : ''}.`
          : 'Ready to learn something new today?'}
        actions={
          <Link href="/child/practice" className={buttonClass({ variant: 'secondary' })}>
            <Target className="h-4 w-4" aria-hidden="true" />
            Practice on your own
          </Link>
        }
      />

      <StatGrid className="mb-8">
        <StatCard
          title="Day streak"
          value={streak}
          icon={Flame}
          accent={streak > 0}
          subtitle={gamification?.longestStreak ? `Best: ${gamification.longestStreak} days` : undefined}
        />
        <StatCard title="Points" value={(gamification?.totalPoints || 0).toLocaleString()} icon={Star} />
        <StatCard title="Accuracy" value={`${accuracyRate}%`} icon={Target} />
        <StatCard title="Completed" value={completed.length} icon={CircleCheck} />
      </StatGrid>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          {/* Pending assignments: the main task, so it comes first */}
          <section aria-labelledby="pending-heading">
            <SectionHeader id="pending-heading" title="Your assignments" count={pending.length || undefined} />
            {!upNext ? (
              <EmptyState
                icon={PartyPopper}
                title="All caught up!"
                description="No pending assignments. Start a practice session to keep your streak alive and earn extra points."
                action={<Link href="/child/practice" className={buttonClass()}>Start practicing</Link>}
              />
            ) : (
              <div className="space-y-3">
                <Card highlight className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <SubjectIcon subject={upNext.subject} size={56} tone="honey" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-honey-text">
                      {upNext.status === 'in_progress' ? 'Pick up where you left off' : 'Up next'}
                    </p>
                    <p className="mt-0.5 break-words font-display text-xl font-semibold text-ink">
                      {subjectLabel(upNext.subject)}{upNext.topic ? `: ${upNext.topic}` : ''}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                      <span>{upNext.numQuestions} questions</span>
                      <DifficultyMeter difficulty={upNext.difficulty} />
                      {upNext.timeLimitMin ? (
                        <span className="inline-flex items-center gap-1">
                          <Timer className="h-3.5 w-3.5" aria-hidden="true" />{upNext.timeLimitMin} min
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Link href={`/child/assignment/${upNext.id}`} className={buttonClass({ size: 'lg', className: 'shrink-0' })}>
                    {upNext.status === 'in_progress' ? 'Continue' : 'Start'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Card>

                {queue.length > 0 && (
                  <ListCard>
                    {queue.map(a => (
                      <AssignmentRow
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
                  </ListCard>
                )}
              </div>
            )}
          </section>

          {completed.length > 0 && (
            <section aria-labelledby="completed-heading">
              <SectionHeader id="completed-heading" title="Completed" count={completed.length} />
              <ListCard>
                {completed.slice(0, 6).map(a => (
                  <AssignmentRow
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
              </ListCard>
            </section>
          )}

          <section aria-labelledby="offline-heading">
            <SectionHeader
              id="offline-heading"
              title="Offline work"
              description="Studied from a book or another site? Log it for points."
              action={
                <Button variant="secondary" size="sm" onClick={openOfflineForm} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                  Log work
                </Button>
              }
            />
            {offlineWork.length === 0 ? (
              <EmptyState compact icon={NotebookPen} title="No offline work logged yet" description="Studied on your own? Log it here and your parent can approve it for points." />
            ) : (
              <ListCard>
                {offlineWork.slice(0, 6).map(ow => {
                  const status = offlineStatus[ow.status] ?? { label: 'Pending', tone: 'neutral' as Tone };
                  return (
                    <li key={ow.id} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                      <SubjectIcon subject={ow.subject} tone="muted" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-ink sm:truncate">
                          {subjectLabel(ow.subject)}
                          {ow.bookReference && <span className="font-normal text-ink-muted"> · {ow.bookReference}</span>}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                          <span>{ow.numQuestions} questions</span>
                          <DifficultyMeter difficulty={ow.difficulty} />
                          <span>Score {ow.score}%</span>
                          <span className="text-ink-subtle">{new Date(ow.activityDate || ow.createdAt).toLocaleDateString()}</span>
                        </p>
                        {ow.parentComment && <p className="mt-1 text-xs italic text-ink-muted">&ldquo;{ow.parentComment}&rdquo;</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Pill tone={status.tone}>{status.label}</Pill>
                        {ow.status === 'approved' && ow.pointsAwarded ? (
                          <span className="text-xs font-semibold text-honey-text">+{ow.pointsAwarded} pts</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ListCard>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-ink">Recent badges</h2>
              <Link href="/child/badges" className="text-sm font-semibold text-honey-text hover:underline">View all</Link>
            </div>
            {recentBadges.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2">
                {recentBadges.map(b => (
                  <li key={b.id} className="text-center">
                    <BadgeMedal criteria={b.badge.criteria} earned size={60} />
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium text-ink">{b.badge.name}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-3.5">
                <BadgeMedal criteria="first_assignment" earned={false} size={52} />
                <p className="text-sm text-ink-muted">Finish an assignment to earn your first badge.</p>
              </div>
            )}
          </Card>

          {user?.satEnabled && (
            <Link href="/child/sat" className="group flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
              <Hexagon size={44} tone="ink">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </Hexagon>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-ink group-hover:underline">SAT practice</p>
                <p className="text-sm text-ink-muted">Full Digital SAT simulation with adaptive scoring</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <Modal open={showOfflineForm} onClose={() => setShowOfflineForm(false)} title="Log offline work" size="lg">
        <form onSubmit={e => { e.preventDefault(); submitOfflineWork(); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Subject" htmlFor="ow-subject">
              <Select id="ow-subject" value={owSubject} onChange={e => setOwSubject(e.target.value)}>
                {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Difficulty" htmlFor="ow-difficulty">
              <Select id="ow-difficulty" value={owDifficulty} onChange={e => setOwDifficulty(e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Number of questions" htmlFor="ow-questions">
              <Input id="ow-questions" type="number" min={1} max={100} value={owQuestions} onChange={e => setOwQuestions(Number(e.target.value))} />
            </Field>
            <Field label="Score (%)" htmlFor="ow-score">
              <Input id="ow-score" type="number" min={0} max={100} value={owScore} onChange={e => setOwScore(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Book or resource" htmlFor="ow-book" optional>
            <Input
              id="ow-book"
              type="text"
              value={owBook}
              onChange={e => setOwBook(e.target.value)}
              placeholder="e.g. Math Workbook Ch. 5, Khan Academy Algebra"
            />
          </Field>
          <Field label="Date of activity" htmlFor="ow-date" optional hint="Leave blank to use today's date. Must be within the last 7 days.">
            <Input
              id="ow-date"
              type="date"
              value={owActivityDate}
              min={owDateBounds?.min}
              max={owDateBounds?.max}
              onChange={e => setOwActivityDate(e.target.value)}
            />
          </Field>

          {owError && <Alert>{owError}</Alert>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowOfflineForm(false)}>Cancel</Button>
            <Button type="submit" loading={owSubmitting} disabled={owQuestions < 1}>Submit for review</Button>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
