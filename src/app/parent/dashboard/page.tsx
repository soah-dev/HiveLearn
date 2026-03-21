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
  const [dataLoading, setDataLoading] = useState(true);

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
      ]).then(([childrenData, assignmentsData, invitesData, practiceData]) => {
        setChildren(childrenData.children || []);
        setAssignments(assignmentsData.assignments || []);
        const invites = invitesData.invites || [];
        setPendingInvites(invites.filter((i: Invite) => i.status === 'pending'));
        setPracticeSessions(practiceData.sessions || []);
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

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const pendingReview = assignments.filter(a => a.status === 'submitted').length;
  const totalCompleted = assignments.filter(a => a.status === 'reviewed').length;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Parent Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage assignments and track progress</p>
          </div>
          <Link
            href="/parent/create"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            + Create Assignment
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Children" value={children.length} icon="👨‍👩‍👧‍👦" />
          <StatCard title="Total Assignments" value={assignments.length} icon="📝" />
          <StatCard title="Pending Review" value={pendingReview} icon="⏳" />
          <StatCard title="Completed" value={totalCompleted} icon="✅" />
        </div>

        {/* Children */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Children</h2>
            <button
              onClick={() => { setShowModal(true); setInviteError(''); setInviteSuccess(''); }}
              className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
            >
              + Add Child
            </button>
          </div>

          {children.length === 0 && pendingInvites.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No children linked yet. Click &quot;Add Child&quot; to invite your child by email.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map(child => (
                <Link key={child.id} href={`/parent/analytics/${child.id}`}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      {child.image ? (
                        <img src={child.image} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
                          {(child.name || 'C')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{child.name || child.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {child.gamification?.totalPoints || 0} pts | {child.gamification?.currentStreak || 0} day streak
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Pending Invites</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-800 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-yellow-600 dark:text-yellow-300 font-semibold">
                      {invite.childName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{invite.childName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{invite.childEmail}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
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
                      className="flex-1 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 transition-colors"
                    >
                      {inviteActionId === invite.id ? '...' : 'Resend'}
                    </button>
                    <button
                      onClick={() => cancelInvite(invite.id)}
                      disabled={inviteActionId === invite.id}
                      className="flex-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                    >
                      {inviteActionId === invite.id ? '...' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Practice Sessions */}
        {practiceSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Practice Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {practiceSessions.slice(0, 6).map(s => (
                <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 capitalize">{s.subject.replace('_', ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {s.status === 'completed' ? 'Done' : 'In Progress'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{s.topic || `Grade ${s.grade} ${s.subject.replace('_', ' ')}`}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-2">{s.difficulty} · Grade {s.grade} · {s.child?.name}</p>
                  {s.status === 'completed' && s.score !== null && (
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-bold ${s.score >= 80 ? 'text-green-600' : s.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {s.score}%
                      </span>
                      {s.pointsAwarded && <span className="text-xs text-indigo-600 dark:text-indigo-400">+{s.pointsAwarded} pts</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Assignments */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Assignments</h2>
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No assignments yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.slice(0, 9).map(a => (
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
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Child Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Child</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
              >
                &times;
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child&apos;s Name</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Enter your child's name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child&apos;s Grade</label>
              <select
                value={childGrade}
                onChange={e => setChildGrade(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child&apos;s Email</label>
              <input
                type="email"
                value={childEmail}
                onChange={(e) => setChildEmail(e.target.value)}
                placeholder="Enter your child's email"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
                {inviteSuccess}
              </div>
            )}

            <button
              onClick={sendInvite}
              disabled={sending || !childName.trim() || !childEmail.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
