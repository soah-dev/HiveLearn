'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { GRADES } from '@/lib/subjects';
import PageHeader from '@/components/PageHeader';
import Page, { PageLoader } from '@/components/ui/Page';
import Card, { ListCard, SectionHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Pill from '@/components/ui/Pill';
import Switch from '@/components/ui/Switch';
import { Field, Select, Textarea } from '@/components/ui/Field';

interface Child {
  id: string;
  name: string | null;
  email: string;
  grade: number | null;
  image: string | null;
  weeklyReportEnabled: boolean;
  leaderboardOptOut: boolean;
}

interface LinkedParent {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export default function SettingsPage() {
  const { user, token, getToken, loading, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [editingGrade, setEditingGrade] = useState<Record<string, number>>({});
  const [savingGrade, setSavingGrade] = useState<string | null>(null);
  const [gradeSaved, setGradeSaved] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [togglingReport, setTogglingReport] = useState<string | null>(null);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [myFeedback, setMyFeedback] = useState<Array<{
    id: string;
    category: string;
    message: string;
    status: string;
    response: string | null;
    respondedAt: string | null;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token && user?.role === 'parent') {
      apiFetch('/api/parent/children', getToken)
        .then(data => {
          const kids = data.children || [];
          setChildren(kids);
          const grades: Record<string, number> = {};
          for (const c of kids) grades[c.id] = c.grade ?? 1;
          setEditingGrade(grades);
        })
        .catch(() => {});
    }
    if (token && user?.role === 'child') {
      apiFetch('/api/child/parents', getToken)
        .then(data => setLinkedParents(data.parents || []))
        .catch(() => {});
    }
    if (token && user) {
      apiFetch('/api/feedback', getToken)
        .then(data => setMyFeedback(data.feedback || []))
        .catch(() => {});
    }
  }, [user, token, loading, router]);

  const saveGrade = async (childId: string) => {
    setSavingGrade(childId);
    setActionError('');
    try {
      await apiFetch('/api/parent/children', getToken, {
        method: 'PATCH',
        body: JSON.stringify({ childId, grade: editingGrade[childId] }),
      });
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, grade: editingGrade[childId] } : c));
      setGradeSaved(childId);
      setTimeout(() => setGradeSaved(null), 2000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save grade');
    }
    setSavingGrade(null);
  };

  const toggleWeeklyReport = async (childId: string, enabled: boolean) => {
    setTogglingReport(childId);
    setActionError('');
    try {
      await apiFetch('/api/parent/children', getToken, {
        method: 'PATCH',
        body: JSON.stringify({ childId, weeklyReportEnabled: enabled }),
      });
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, weeklyReportEnabled: enabled } : c));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update');
    }
    setTogglingReport(null);
  };

  const toggleLeaderboard = async (childId: string, optOut: boolean) => {
    setTogglingLeaderboard(childId);
    setActionError('');
    try {
      await apiFetch('/api/parent/children', getToken, {
        method: 'PATCH',
        body: JSON.stringify({ childId, leaderboardOptOut: optOut }),
      });
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, leaderboardOptOut: optOut } : c));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update');
    }
    setTogglingLeaderboard(null);
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) { setFeedbackError('Please enter a message'); return; }
    setFeedbackSubmitting(true);
    setFeedbackError('');
    try {
      const freshToken = await getToken();
      const formData = new FormData();
      formData.append('message', feedbackMessage.trim());
      formData.append('category', feedbackCategory);
      if (feedbackFile) formData.append('screenshot', feedbackFile);

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      setFeedbackSuccess(true);
      setFeedbackMessage('');
      setFeedbackCategory('general');
      setFeedbackFile(null);
      apiFetch('/api/feedback', getToken)
        .then(data => setMyFeedback(data.feedback || []))
        .catch(() => {});
      setTimeout(() => { setFeedbackSuccess(false); setFeedbackOpen(false); }, 2000);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to submit feedback');
    }
    setFeedbackSubmitting(false);
  };

  if (loading) return <PageLoader />;

  const childGrade = (user as { grade?: number | null })?.grade;

  return (
    <Page width="narrow">
      <PageHeader title="Settings" subtitle="Your profile, family preferences and appearance" />

      {actionError && <Alert className="mb-6" onDismiss={() => setActionError('')}>{actionError}</Alert>}

      <div className="space-y-8">
        {/* Profile */}
        <Card className="flex items-center gap-4">
          <Avatar name={user?.name} image={user?.image} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-sm text-ink-muted">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone="brand" className="capitalize">{user?.role}</Pill>
              {user?.role === 'child' && <Pill>{childGrade ? `Grade ${childGrade}` : 'Grade not set'}</Pill>}
            </div>
          </div>
        </Card>

        {/* Linked Parents (Child only) */}
        {user?.role === 'child' && linkedParents.length > 0 && (
          <section aria-labelledby="parents-heading">
            <SectionHeader id="parents-heading" title="Linked parents" />
            <ListCard>
              {linkedParents.map(parent => (
                <li key={parent.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={parent.name || 'P'} image={parent.image} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{parent.name || 'Parent'}</p>
                    <p className="truncate text-xs text-ink-muted">{parent.email}</p>
                  </div>
                </li>
              ))}
            </ListCard>
          </section>
        )}

        {/* Per-child preferences (Parent only): grade, weekly report, leaderboard */}
        {user?.role === 'parent' && children.length > 0 && (
          <section aria-labelledby="children-heading">
            <SectionHeader id="children-heading" title="Your children" description="Grade level, weekly reports and leaderboard visibility." />
            <ListCard>
              {children.map(child => {
                const label = child.name || child.email;
                return (
                  <li key={child.id} className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={label} image={child.image} />
                      <p className="min-w-0 flex-1 truncate font-semibold text-ink">{label}</p>
                    </div>

                    <div className="mt-4 space-y-4 sm:pl-[52px]">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor={`grade-${child.id}`} className="text-sm font-medium text-ink">Grade level</label>
                        <div className="flex items-center gap-2">
                          <Select
                            id={`grade-${child.id}`}
                            controlSize="sm"
                            wrapperClassName="w-32"
                            value={editingGrade[child.id] ?? child.grade ?? 1}
                            onChange={e => setEditingGrade(prev => ({ ...prev, [child.id]: Number(e.target.value) }))}
                          >
                            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                          </Select>
                          <Button variant="secondary" size="sm" onClick={() => saveGrade(child.id)} loading={savingGrade === child.id}>
                            {gradeSaved === child.id ? 'Saved' : 'Save'}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-ink">Weekly email report</p>
                          <p className="text-xs text-ink-subtle">A summary of their activity every Sunday</p>
                        </div>
                        <Switch
                          label={`Weekly email report for ${label}`}
                          checked={child.weeklyReportEnabled}
                          onChange={enabled => toggleWeeklyReport(child.id, enabled)}
                          disabled={togglingReport === child.id}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-ink">Global leaderboard</p>
                          <p className="text-xs text-ink-subtle">Show them on the global leaderboard (first name only)</p>
                        </div>
                        <Switch
                          label={`Show ${label} on the global leaderboard`}
                          checked={!child.leaderboardOptOut}
                          onChange={visible => toggleLeaderboard(child.id, !visible)}
                          disabled={togglingLeaderboard === child.id}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ListCard>
          </section>
        )}

        {/* Dark Mode */}
        <Card className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Dark mode</h2>
            <p className="text-sm text-ink-muted">Toggle dark/light theme</p>
          </div>
          <Switch label="Dark mode" checked={darkMode} onChange={toggleDarkMode} />
        </Card>

        {/* Feedback */}
        <Card>
          {!feedbackOpen ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">Feedback</h2>
                <p className="text-sm text-ink-muted">Help us improve HiveExcel</p>
              </div>
              <Button variant="secondary" onClick={() => setFeedbackOpen(true)}>Send feedback</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-display text-base font-semibold text-ink">Send feedback</h2>

              <Field label="Category" htmlFor="feedback-category">
                <Select id="feedback-category" value={feedbackCategory} onChange={e => setFeedbackCategory(e.target.value)}>
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature_request">Feature Request</option>
                </Select>
              </Field>

              <Field label="Message" htmlFor="feedback-message">
                <Textarea
                  id="feedback-message"
                  value={feedbackMessage}
                  onChange={e => setFeedbackMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell us what's on your mind..."
                />
              </Field>

              <Field label="Screenshot" htmlFor="feedback-file" optional>
                <input
                  id="feedback-file"
                  type="file"
                  accept="image/*"
                  onChange={e => setFeedbackFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-ink-muted file:mr-3 file:h-9 file:cursor-pointer file:rounded-lg file:border-0 file:bg-muted file:px-3 file:text-sm file:font-semibold file:text-ink hover:file:bg-line"
                />
                {feedbackFile && (
                  <p className="mt-1 text-xs text-ink-subtle">{feedbackFile.name} ({(feedbackFile.size / 1024).toFixed(0)} KB)</p>
                )}
              </Field>

              {feedbackError && <Alert>{feedbackError}</Alert>}
              {feedbackSuccess && <Alert tone="good">Thank you! Your feedback has been submitted.</Alert>}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => { setFeedbackOpen(false); setFeedbackError(''); }}>Cancel</Button>
                <Button onClick={submitFeedback} loading={feedbackSubmitting} disabled={!feedbackMessage.trim()}>
                  {feedbackSubmitting ? 'Submitting…' : 'Submit'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Your feedback history */}
        {myFeedback.length > 0 && (
          <section aria-labelledby="feedback-heading">
            <SectionHeader id="feedback-heading" title="Your feedback" />
            <ListCard>
              {myFeedback.map(f => (
                <li key={f.id} className="p-4 sm:p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Pill tone={f.status === 'resolved' ? 'good' : 'neutral'}>{f.status === 'resolved' ? 'Replied' : 'Awaiting reply'}</Pill>
                    <span className="text-xs text-ink-subtle">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-ink">{f.message}</p>
                  {f.response && (
                    <div className="mt-3 rounded-xl bg-brand-soft p-3.5">
                      <p className="mb-1 text-xs font-semibold text-brand-text">HiveExcel team{f.respondedAt ? ` · ${new Date(f.respondedAt).toLocaleDateString()}` : ''}</p>
                      <p className="whitespace-pre-wrap text-sm text-ink">{f.response}</p>
                    </div>
                  )}
                </li>
              ))}
            </ListCard>
          </section>
        )}

        {/* Sign Out */}
        <Button variant="danger" size="lg" block onClick={async () => { await signOut(); router.push('/'); }}>
          Sign out
        </Button>
      </div>
    </Page>
  );
}
