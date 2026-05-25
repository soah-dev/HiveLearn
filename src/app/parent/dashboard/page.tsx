'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import AssignmentCard from '@/components/AssignmentCard';
import Link from 'next/link';

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
  questions?: Array<{ answers?: Array<{ id: string }> }>;
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
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
      return;
    }
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
    } catch {
      // silently fail
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
    } catch {
      // silently fail
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
    } catch {
      // silently fail
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

  const hasUnresolvedFlags = (a: Assignment) =>
    (a.questions?.reduce((sum, q) => sum + (q.answers?.length || 0), 0) || 0) > 0;

  const autoReviewAll = async () => {
    const reviewable = assignments.filter(a =>
      a.status === 'submitted' && !hasUnresolvedFlags(a) && !reviewedIds.has(a.id)
    );
    for (const assignment of reviewable) {
      await autoReviewAssignment(assignment.id);
    }
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const pendingOffline = offlineWork.filter(ow => ow.status === 'pending');
  const needsReviewAssignments = assignments.filter(a => a.status === 'submitted');
  const reviewableAssignments = needsReviewAssignments.filter(a => !hasUnresolvedFlags(a));
  const flaggedAssignments = needsReviewAssignments.filter(a => hasUnresolvedFlags(a));
  const otherAssignments = assignments.filter(a => a.status !== 'submitted');
  const totalCompleted = assignments.filter(a => a.status === 'reviewed').length;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Parent Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage assignments and track progress</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/parent/presets"
              className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-5 py-3 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all"
            >
              Presets
            </Link>
            <Link
              href="/parent/create"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              + Create Assignment
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Children" value={children.length} icon="👨‍👩‍👧‍👦" />
          <StatCard title="Total Assignments" value={assignments.length} icon="📝" />
          <StatCard title="Needs Review" value={needsReviewAssignments.length} icon="⏳" />
          <StatCard title="Completed" value={totalCompleted} icon="✅" />
        </div>

        {/* Due Presets Banner */}
        {duePresets.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {duePresets.length} preset{duePresets.length > 1 ? 's' : ''} ready to generate
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Based on your scheduled presets for today</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/parent/presets" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Manage
                </Link>
                <button
                  onClick={generateAllPresets}
                  disabled={generatingPresets.size > 0}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                >
                  {generatingPresets.size > 0 ? 'Generating...' : 'Generate All'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {duePresets.map(preset => (
                <div key={preset.id} className="bg-white/80 dark:bg-gray-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                      {preset.subject.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {preset.numQuestions}q · {preset.difficulty} · {preset.child.name || preset.child.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {presetErrors[preset.id] && (
                      <span className="text-xs text-red-500" title={presetErrors[preset.id]}>Failed</span>
                    )}
                    <button
                      onClick={() => generateFromPreset(preset.id)}
                      disabled={generatingPresets.has(preset.id)}
                      className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/60 disabled:opacity-50 transition-all"
                    >
                      {generatingPresets.has(preset.id) ? '...' : 'Generate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Children */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Children</h2>
            <button
              onClick={() => { setShowModal(true); setInviteError(''); setInviteSuccess(''); }}
              className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all"
            >
              + Add Child
            </button>
          </div>

          {children.length === 0 && pendingInvites.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center">
              <p className="text-5xl mb-3 animate-float">👨‍👩‍👧‍👦</p>
              <p className="text-gray-500 dark:text-gray-400">No children linked yet. Click &quot;Add Child&quot; to invite your child by email.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child, i) => (
                <Link key={child.id} href={`/parent/analytics/${child.id}`}>
                  <div
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5 card-hover animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      {child.image ? (
                        <img src={child.image} alt="" className="w-11 h-11 rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-sm" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                          {(child.name || 'C')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{child.name || child.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ⭐ {child.gamification?.totalPoints || 0} pts | 🔥 {child.gamification?.currentStreak || 0} day streak
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Pending Invites</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-2 border-yellow-200 dark:border-yellow-800 p-5 card-hover">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold">
                      {invite.childName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{invite.childName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{invite.childEmail}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                      Pending
                    </span>
                    <span className="text-xs text-gray-400">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => resendInvite(invite)}
                      disabled={inviteActionId === invite.id}
                      className="flex-1 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 transition-all"
                    >
                      {inviteActionId === invite.id ? '...' : 'Resend'}
                    </button>
                    <button
                      onClick={() => cancelInvite(invite.id)}
                      disabled={inviteActionId === invite.id}
                      className="flex-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-all"
                    >
                      {inviteActionId === invite.id ? '...' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Offline Work */}
        {pendingOffline.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Offline Work Reviews <span className="text-sm font-normal text-gray-500">({pendingOffline.length} pending)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOffline.map(ow => (
                <div key={ow.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-2 border-teal-200 dark:border-teal-800 p-5 card-hover">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400 capitalize">{ow.subject.replace('_', ' ')}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{ow.child?.name || 'Child'}</p>
                  {ow.bookReference && <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{ow.bookReference}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-3">
                    {ow.difficulty} · {ow.numQuestions} questions · Self-reported: {ow.score}%
                  </p>

                  {reviewingOwId === ow.id ? (
                    <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={owComment}
                        onChange={e => setOwComment(e.target.value)}
                        placeholder="Comment (optional)"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOfflineReview(ow.id, 'approve')}
                          disabled={owProcessing}
                          className="flex-1 bg-green-600 text-white text-sm py-2 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                          {owProcessing ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleOfflineReview(ow.id, 'reject')}
                          disabled={owProcessing}
                          className="flex-1 bg-red-500 text-white text-sm py-2 rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 transition-all"
                        >
                          {owProcessing ? '...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => { setReviewingOwId(null); setOwComment(''); }}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewingOwId(ow.id)}
                      className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm py-2.5 rounded-xl font-bold hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm"
                    >
                      Review
                    </button>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(ow.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs Your Review */}
        {needsReviewAssignments.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Needs Your Review <span className="text-sm font-normal text-orange-600 dark:text-orange-400">({needsReviewAssignments.length})</span>
              </h2>
              {reviewableAssignments.length > 0 && (
                <button
                  onClick={autoReviewAll}
                  disabled={reviewingIds.size > 0}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50"
                >
                  {reviewingIds.size > 0 ? 'Reviewing...' : `Auto-Review All (${reviewableAssignments.length})`}
                </button>
              )}
            </div>

            {flaggedAssignments.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                {flaggedAssignments.length} assignment{flaggedAssignments.length > 1 ? 's have' : ' has'} flagged questions that need manual resolution before auto-review.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {needsReviewAssignments.map(a => {
                const flagged = hasUnresolvedFlags(a);
                return (
                  <div key={a.id} className="relative">
                    <AssignmentCard
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
                      flaggedCount={a.questions?.reduce((sum: number, q: { answers?: { id: string }[] }) => sum + (q.answers?.length || 0), 0) || 0}
                    />
                    {!flagged && (
                      <div className="mt-2">
                        {reviewErrors[a.id] && (
                          <p className="text-xs text-red-500 mb-1">{reviewErrors[a.id]}</p>
                        )}
                        <button
                          onClick={() => autoReviewAssignment(a.id)}
                          disabled={reviewingIds.has(a.id) || reviewedIds.has(a.id)}
                          className="w-full text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-2 rounded-xl font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 disabled:opacity-50 transition-all"
                        >
                          {reviewingIds.has(a.id) ? 'Reviewing...' : reviewedIds.has(a.id) ? 'Reviewed' : 'Auto-Review'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Assignments */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Assignments</h2>
          {assignments.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center">
              <p className="text-5xl mb-3 animate-float">📝</p>
              <p className="text-gray-500 dark:text-gray-400">No assignments yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherAssignments.slice(0, 9).map(a => (
                <AssignmentCard
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
                  flaggedCount={a.questions?.reduce((sum: number, q: { answers?: { id: string }[] }) => sum + (q.answers?.length || 0), 0) || 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Practice Sessions */}
        {practiceSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Practice Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {practiceSessions.slice(0, 6).map((s, i) => (
                <div
                  key={s.id}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5 card-hover animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 capitalize">{s.subject.replace('_', ' ')}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      s.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {s.status === 'completed' ? 'Done' : 'In Progress'}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{s.topic || `Grade ${s.grade} ${s.subject.replace('_', ' ')}`}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-2">{s.difficulty} · Grade {s.grade} · {s.child?.name}</p>
                  {s.status === 'completed' && s.score !== null && (
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-extrabold ${s.score >= 80 ? 'text-green-600' : s.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {s.score}%
                      </span>
                      {s.pointsAwarded && <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">+{s.pointsAwarded} pts</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Child Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/50 dark:border-gray-700/50 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">Add Child</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Child&apos;s Name</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Enter your child's name"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Child&apos;s Grade</label>
              <select
                value={childGrade}
                onChange={e => setChildGrade(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Child&apos;s Email</label>
              <input
                type="email"
                value={childEmail}
                onChange={(e) => setChildEmail(e.target.value)}
                placeholder="Enter your child's email"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-slide-up">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-600 dark:text-green-400 animate-slide-up">
                {inviteSuccess}
              </div>
            )}

            <button
              onClick={sendInvite}
              disabled={sending || !childName.trim() || !childEmail.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
            >
              {sending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
