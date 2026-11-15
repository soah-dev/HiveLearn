'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarClock, ChevronRight, CircleCheck, ClipboardList, Flame, Inbox, Plus, Star, Target, UserPlus, UsersRound,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { GRADES, subjectLabel } from '@/lib/subjects';
import StatCard, { StatGrid } from '@/components/StatCard';
import AssignmentRow from '@/components/AssignmentRow';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { useToast } from '@/contexts/ToastContext';
import Page, { PageLoader } from '@/components/ui/Page';
import Card, { ListCard, SectionHeader } from '@/components/ui/Card';
import Button, { buttonClass } from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Pill, { Score } from '@/components/ui/Pill';
import Hexagon from '@/components/ui/Hexagon';
import SubjectIcon from '@/components/ui/SubjectIcon';
import DifficultyMeter from '@/components/ui/DifficultyMeter';
import { Field, Input, Select } from '@/components/ui/Field';

interface DuePreset {
  id: string;
  childId: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  numQuestions: number;
  grade: number;
  child: { id: string; name: string | null; email: string };
}

interface Child {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  gamification: { totalPoints: number; currentStreak: number } | null;
}

interface Invite {
  id: string;
  childName: string;
  childEmail: string;
  status: string;
  expiresAt: string;
  child: { id: string; name: string | null; email: string } | null;
}

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
  child: { id: string; name: string | null };
  unresolvedFlagCount: number;
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
  createdAt: string;
  child: { id: string; name: string | null };
}

interface PracticeSession {
  id: string;
  subject: string;
  topic: string | null;
  grade: number;
  difficulty: string;
  status: string;
  score: number | null;
  pointsAwarded: number | null;
  createdAt: string;
  child: { id: string; name: string | null };
}

export default function ParentDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [offlineWork, setOfflineWork] = useState<OfflineWork[]>([]);
  const [duePresets, setDuePresets] = useState<DuePreset[]>([]);
  const [generatingPresets, setGeneratingPresets] = useState<Set<string>>(new Set());
  const [generatedPresets, setGeneratedPresets] = useState<Set<string>>(new Set());
  const [presetErrors, setPresetErrors] = useState<Record<string, string>>({});
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(new Set());
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [reviewingOwId, setReviewingOwId] = useState<string | null>(null);
  const [owComment, setOwComment] = useState('');
  const [owProcessing, setOwProcessing] = useState(false);

  // Add Child modal state
  const [showModal, setShowModal] = useState(false);
  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childGrade, setChildGrade] = useState(6);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      Promise.all([
        apiFetch('/api/parent/children', token),
        apiFetch('/api/assignments', token),
        apiFetch('/api/parent/invite', token),
        apiFetch('/api/practice', token),
        apiFetch('/api/offline-work', token),
        apiFetch('/api/presets/due', token),
      ]).then(([childrenData, assignmentsData, invitesData, practiceData, offlineData, presetsData]) => {
        setChildren(childrenData.children || []);
        setAssignments(assignmentsData.assignments || []);
        const invites = invitesData.invites || [];
        setPendingInvites(invites.filter((i: Invite) => i.status === 'pending'));
        setPracticeSessions(practiceData.sessions || []);
        setOfflineWork(offlineData.entries || []);
        setDuePresets(presetsData.duePresets || []);
        setDataLoading(false);
      }).catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const cancelInvite = async (inviteId: string) => {
    setInviteActionId(inviteId);
    try {
      await apiFetch(`/api/parent/invite?id=${inviteId}`, token, { method: 'DELETE' });
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
      toast('Invite cancelled', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel invite', 'error');
    } finally {
      setInviteActionId(null);
    }
  };

  const resendInvite = async (invite: Invite) => {
    setInviteActionId(invite.id);
    try {
      await apiFetch(`/api/parent/invite?id=${invite.id}`, token, { method: 'DELETE' });
      await apiFetch('/api/parent/invite', token, {
        method: 'POST',
        body: JSON.stringify({ childName: invite.childName, childEmail: invite.childEmail }),
      });
      const invitesData = await apiFetch('/api/parent/invite', token);
      setPendingInvites((invitesData.invites || []).filter((i: Invite) => i.status === 'pending'));
      toast(`Invite resent to ${invite.childEmail}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not resend invite', 'error');
    } finally {
      setInviteActionId(null);
    }
  };

  const sendInvite = async () => {
    if (!childName.trim() || !childEmail.trim()) return;
    setSending(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      await apiFetch('/api/parent/invite', token, {
        method: 'POST',
        body: JSON.stringify({ childName: childName.trim(), childEmail: childEmail.trim(), childGrade }),
      });
      setInviteSuccess(`Invite sent to ${childEmail}!`);
      setChildName('');
      setChildEmail('');
      // Refresh pending invites
      const invitesData = await apiFetch('/api/parent/invite', token);
      setPendingInvites((invitesData.invites || []).filter((i: Invite) => i.status === 'pending'));
      setTimeout(() => {
        setShowModal(false);
        setInviteSuccess('');
      }, 2000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const handleOfflineReview = async (id: string, action: 'approve' | 'reject') => {
    if (!token) return;
    setOwProcessing(true);
    try {
      await apiFetch(`/api/offline-work/${id}/review`, token, {
        method: 'POST',
        body: JSON.stringify({ action, parentComment: owComment || null }),
      });
      const data = await apiFetch('/api/offline-work', token);
      setOfflineWork(data.entries || []);
      setReviewingOwId(null);
      setOwComment('');
      toast(action === 'approve' ? 'Offline work approved' : 'Offline work rejected', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save review', 'error');
    }
    setOwProcessing(false);
  };

  const generateFromPreset = async (presetId: string) => {
    setGeneratingPresets(prev => new Set(prev).add(presetId));
    setPresetErrors(prev => { const next = { ...prev }; delete next[presetId]; return next; });
    try {
      await apiFetch('/api/presets/generate', token, {
        method: 'POST',
        body: JSON.stringify({ presetId }),
      });
      setGeneratedPresets(prev => new Set(prev).add(presetId));
      setDuePresets(prev => prev.filter(p => p.id !== presetId));
      // Refresh assignments
      const data = await apiFetch('/api/assignments', token);
      setAssignments(data.assignments || []);
    } catch (err) {
      setPresetErrors(prev => ({ ...prev, [presetId]: err instanceof Error ? err.message : 'Failed' }));
    }
    setGeneratingPresets(prev => { const next = new Set(prev); next.delete(presetId); return next; });
  };

  const generateAllPresets = async () => {
    for (const preset of duePresets) {
      if (generatedPresets.has(preset.id)) continue;
      await generateFromPreset(preset.id);
    }
  };

  const autoReviewAssignment = async (assignmentId: string) => {
    setReviewingIds(prev => new Set(prev).add(assignmentId));
    setReviewErrors(prev => { const next = { ...prev }; delete next[assignmentId]; return next; });
    try {
      await apiFetch(`/api/assignments/${assignmentId}/review`, token, {
        method: 'POST',
        body: JSON.stringify({ mode: 'ai' }),
      });
      setReviewedIds(prev => new Set(prev).add(assignmentId));
      // Refresh assignments
      const data = await apiFetch('/api/assignments', token);
      setAssignments(data.assignments || []);
    } catch (err) {
      setReviewErrors(prev => ({ ...prev, [assignmentId]: err instanceof Error ? err.message : 'Failed' }));
    }
    setReviewingIds(prev => { const next = new Set(prev); next.delete(assignmentId); return next; });
  };

  const hasUnresolvedFlags = (a: Assignment) => (a.unresolvedFlagCount || 0) > 0;

  const autoReviewAll = async () => {
    const reviewable = assignments.filter(a =>
      a.status === 'submitted' && !hasUnresolvedFlags(a) && !reviewedIds.has(a.id)
    );
    for (const assignment of reviewable) {
      await autoReviewAssignment(assignment.id);
    }
  };

  if (loading || dataLoading) return <PageLoader />;

  const pendingOffline = offlineWork.filter(ow => ow.status === 'pending');
  const needsReviewAssignments = assignments.filter(a => a.status === 'submitted');
  const reviewableAssignments = needsReviewAssignments.filter(a => !hasUnresolvedFlags(a));
  const flaggedAssignments = needsReviewAssignments.filter(a => hasUnresolvedFlags(a));
  const otherAssignments = assignments.filter(a => a.status !== 'submitted');
  const totalCompleted = assignments.filter(a => a.status === 'reviewed').length;
  const attentionCount = duePresets.length + needsReviewAssignments.length + pendingOffline.length;
  const hasChildren = children.length > 0 || pendingInvites.length > 0;

  const openAddChild = () => { setShowModal(true); setInviteError(''); setInviteSuccess(''); };

  const subheading = 'text-sm font-semibold text-ink';
  const subcount = 'ml-1.5 font-medium text-ink-subtle';

  return (
    <>
      <Page>
        <PageHeader
          title={`Hi, ${user?.name?.split(' ')[0] || 'there'}`}
          subtitle={attentionCount > 0
            ? `${attentionCount} thing${attentionCount > 1 ? 's need' : ' needs'} your attention.`
            : 'Nothing is waiting on you right now.'}
          actions={
            <>
              <Button variant="secondary" onClick={openAddChild} icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>
                Add child
              </Button>
              <Link href="/parent/create" className={buttonClass()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create assignment
              </Link>
            </>
          }
        />

        <StatGrid className="mb-8">
          <StatCard title="Needs review" value={needsReviewAssignments.length} icon={Inbox} accent={needsReviewAssignments.length > 0} />
          <StatCard title="Completed" value={totalCompleted} icon={CircleCheck} />
          <StatCard title="Assignments" value={assignments.length} icon={ClipboardList} />
          <StatCard title="Practice sessions" value={practiceSessions.length} icon={Target} />
        </StatGrid>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="min-w-0 space-y-8 lg:col-span-2">
            {/* Needs attention: everything the parent has to act on, grouped at the top */}
            {attentionCount > 0 && (
              <section aria-labelledby="attention-heading">
                <SectionHeader id="attention-heading" title="Needs your attention" count={attentionCount} />

                <div className="space-y-5">
                  {/* Due presets */}
                  {duePresets.length > 0 && (
                    <div>
                      <Card padding="none" className="overflow-hidden">
                        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                          <div className="flex items-center gap-3">
                            <Hexagon size={40} tone="soft">
                              <CalendarClock className="h-[18px] w-[18px]" aria-hidden="true" />
                            </Hexagon>
                            <div>
                              <h3 className="font-semibold text-ink">
                                {duePresets.length} scheduled assignment{duePresets.length > 1 ? 's' : ''} ready to generate
                              </h3>
                              <p className="text-xs text-ink-muted">
                                Based on your scheduled presets for today ·{' '}
                                <Link href="/parent/presets" className="font-semibold text-honey-text hover:underline">Manage</Link>
                              </p>
                            </div>
                          </div>
                          <Button size="sm" className="self-start sm:self-auto" onClick={generateAllPresets} loading={generatingPresets.size > 0}>
                            {generatingPresets.size > 0 ? 'Generating…' : 'Generate all'}
                          </Button>
                        </div>
                        <ul className="divide-y divide-line">
                          {duePresets.map(preset => (
                            <li key={preset.id} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
                              <SubjectIcon subject={preset.subject} size={36} tone="muted" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink">
                                  {subjectLabel(preset.subject)}
                                  {preset.topic && <span className="font-normal text-ink-muted"> · {preset.topic}</span>}
                                </p>
                                <p className="truncate text-xs text-ink-muted">
                                  {preset.child.name || preset.child.email} · {preset.numQuestions} questions · {preset.difficulty}
                                </p>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => generateFromPreset(preset.id)}
                                loading={generatingPresets.has(preset.id)}
                              >
                                Generate
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </Card>
                      {duePresets.filter(p => presetErrors[p.id]).map(p => (
                        <Alert key={p.id} className="mt-2">{subjectLabel(p.subject)}: {presetErrors[p.id]}</Alert>
                      ))}
                    </div>
                  )}

                  {/* Submitted assignments */}
                  {needsReviewAssignments.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className={subheading}>
                          Submitted assignments<span className={subcount}>{needsReviewAssignments.length}</span>
                        </h3>
                        {reviewableAssignments.length > 0 && (
                          <Button size="sm" onClick={autoReviewAll} loading={reviewingIds.size > 0}>
                            {reviewingIds.size > 0 ? 'Reviewing…' : `Auto-review all (${reviewableAssignments.length})`}
                          </Button>
                        )}
                      </div>

                      {flaggedAssignments.length > 0 && (
                        <p className="mb-2 text-xs text-warn-text">
                          {flaggedAssignments.length} assignment{flaggedAssignments.length > 1 ? 's have' : ' has'} flagged questions that need manual resolution before auto-review.
                        </p>
                      )}

                      <ListCard>
                        {needsReviewAssignments.map(a => (
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
                            childName={a.child?.name || undefined}
                            role="parent"
                            flaggedCount={a.unresolvedFlagCount || 0}
                            action={hasUnresolvedFlags(a) ? (
                              <Link href={`/parent/assignment/${a.id}`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                                Resolve
                              </Link>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => autoReviewAssignment(a.id)}
                                loading={reviewingIds.has(a.id)}
                                disabled={reviewedIds.has(a.id)}
                              >
                                {reviewedIds.has(a.id) ? 'Reviewed' : 'Auto-review'}
                              </Button>
                            )}
                          />
                        ))}
                      </ListCard>
                      {needsReviewAssignments.filter(a => reviewErrors[a.id]).map(a => (
                        <Alert key={a.id} className="mt-2">{subjectLabel(a.subject)}: {reviewErrors[a.id]}</Alert>
                      ))}
                    </div>
                  )}

                  {/* Offline work */}
                  {pendingOffline.length > 0 && (
                    <div>
                      <h3 className={`${subheading} mb-2`}>
                        Offline work to approve<span className={subcount}>{pendingOffline.length}</span>
                      </h3>
                      <ListCard>
                        {pendingOffline.map(ow => (
                          <li key={ow.id} className="px-4 py-3.5 sm:px-5">
                            <div className="flex items-center gap-3.5">
                              <SubjectIcon subject={ow.subject} tone="muted" />
                              <div className="min-w-0 flex-1">
                                <p className="break-words font-semibold text-ink sm:truncate">
                                  {subjectLabel(ow.subject)}
                                  {ow.bookReference && <span className="font-normal text-ink-muted"> · {ow.bookReference}</span>}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                                  <span className="font-medium text-ink">{ow.child?.name || 'Child'}</span>
                                  <span>{ow.numQuestions} questions</span>
                                  <DifficultyMeter difficulty={ow.difficulty} />
                                  <span>Self-reported: {ow.score}%</span>
                                  <span className="text-ink-subtle">{new Date(ow.createdAt).toLocaleDateString()}</span>
                                </p>
                              </div>
                              {reviewingOwId !== ow.id && (
                                <Button variant="secondary" size="sm" onClick={() => setReviewingOwId(ow.id)}>Review</Button>
                              )}
                            </div>

                            {reviewingOwId === ow.id && (
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:pl-[54px]">
                                <Input
                                  controlSize="sm"
                                  type="text"
                                  aria-label="Comment"
                                  value={owComment}
                                  onChange={e => setOwComment(e.target.value)}
                                  placeholder="Comment (optional)"
                                  className="sm:flex-1"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleOfflineReview(ow.id, 'approve')} disabled={owProcessing}>Approve</Button>
                                  <Button size="sm" variant="danger" onClick={() => handleOfflineReview(ow.id, 'reject')} disabled={owProcessing}>Reject</Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setReviewingOwId(null); setOwComment(''); }}>Cancel</Button>
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ListCard>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Recent Assignments */}
            <section aria-labelledby="recent-heading">
              <SectionHeader id="recent-heading" title="Recent assignments" />
              {assignments.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No assignments yet"
                  description={children.length > 0 ? 'Create one and it will show up on your child\'s dashboard right away.' : 'Link a child first, then create their first assignment.'}
                  action={children.length > 0 ? (
                    <Link href="/parent/create" className={buttonClass()}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create assignment
                    </Link>
                  ) : undefined}
                />
              ) : otherAssignments.length === 0 ? (
                <EmptyState compact icon={CircleCheck} title="Everything is in the review queue" description="All assignments are listed above under Needs your attention." />
              ) : (
                <ListCard>
                  {otherAssignments.slice(0, 9).map(a => (
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
                      childName={a.child?.name || undefined}
                      role="parent"
                      flaggedCount={a.unresolvedFlagCount || 0}
                    />
                  ))}
                </ListCard>
              )}
            </section>

            {/* Practice Sessions */}
            {practiceSessions.length > 0 && (
              <section aria-labelledby="practice-heading">
                <SectionHeader id="practice-heading" title="Practice sessions" description="Started by your children on their own." />
                <ListCard>
                  {practiceSessions.slice(0, 6).map(s => {
                    const done = s.status === 'completed';
                    return (
                      <li key={s.id} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                        <SubjectIcon subject={s.subject} tone="muted" />
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-semibold text-ink sm:truncate">{s.topic || `Grade ${s.grade} ${subjectLabel(s.subject)}`}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                            {s.child?.name && <span className="font-medium text-ink">{s.child.name}</span>}
                            <span>{subjectLabel(s.subject)}</span>
                            <DifficultyMeter difficulty={s.difficulty} />
                            <span>Grade {s.grade}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {done && s.pointsAwarded ? <span className="hidden text-xs font-semibold text-honey-text sm:inline">+{s.pointsAwarded} pts</span> : null}
                          {done && s.score !== null ? (
                            <Score value={s.score} className="text-base" />
                          ) : (
                            <Pill tone={done ? 'good' : 'honey'}>{done ? 'Done' : 'In progress'}</Pill>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ListCard>
              </section>
            )}
          </div>

          {/* Children (linked + pending invites). Leads the page on phones until the first child is added. */}
          <section className={hasChildren ? 'min-w-0' : 'order-first min-w-0 lg:order-none'} aria-labelledby="children-heading">
            <SectionHeader
              id="children-heading"
              title="Your children"
              count={children.length || undefined}
              action={hasChildren ? (
                <button onClick={openAddChild} className="text-sm font-semibold text-honey-text hover:underline">Add another</button>
              ) : undefined}
            />

            {!hasChildren ? (
              <EmptyState
                compact
                icon={UsersRound}
                title="No children linked yet"
                description="Invite your child by email. Once they accept, you can create assignments and follow their progress here."
                action={<Button onClick={openAddChild} icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>Add child</Button>}
              />
            ) : (
              <ListCard>
                {children.map(child => (
                  <li key={child.id}>
                    <Link href={`/parent/analytics/${child.id}`} className="group flex items-center gap-3 px-4 py-3.5">
                      <Avatar name={child.name || child.email} image={child.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink group-hover:underline">{child.name || child.email}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5" aria-hidden="true" />
                            {(child.gamification?.totalPoints || 0).toLocaleString()} pts
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                            {child.gamification?.currentStreak || 0} day streak
                          </span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                    </Link>
                  </li>
                ))}

                {pendingInvites.map(invite => (
                  <li key={invite.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={invite.childName} pending />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{invite.childName}</p>
                        <p className="truncate text-xs text-ink-muted">{invite.childEmail}</p>
                      </div>
                      <Pill>Invited</Pill>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap text-xs text-ink-subtle">Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => resendInvite(invite)} disabled={inviteActionId === invite.id}>
                          Resend
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:!bg-bad-soft hover:!text-bad-text" onClick={() => cancelInvite(invite.id)} disabled={inviteActionId === invite.id}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ListCard>
            )}
          </section>
        </div>
      </Page>

      {/* Add Child Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add child">
        <form onSubmit={e => { e.preventDefault(); sendInvite(); }} className="space-y-4">
          <Field label="Child's name" htmlFor="child-name">
            <Input
              id="child-name"
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Enter your child's name"
            />
          </Field>

          <Field label="Child's grade" htmlFor="child-grade">
            <Select id="child-grade" value={childGrade} onChange={e => setChildGrade(Number(e.target.value))}>
              {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
            </Select>
          </Field>

          <Field label="Child's email" htmlFor="child-email" hint="We'll email them an invite link to join your family.">
            <Input
              id="child-email"
              type="email"
              value={childEmail}
              onChange={(e) => setChildEmail(e.target.value)}
              placeholder="Enter your child's email"
            />
          </Field>

          {inviteError && <Alert>{inviteError}</Alert>}
          {inviteSuccess && <Alert tone="good">{inviteSuccess}</Alert>}

          <Button type="submit" size="lg" block loading={sending} disabled={!childName.trim() || !childEmail.trim()}>
            {sending ? 'Sending…' : 'Send invite'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
