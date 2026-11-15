'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { DIFFICULTIES, GRADES, SUBJECTS, subjectLabel } from '@/lib/subjects';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import Page, { PageLoader } from '@/components/ui/Page';
import { ListCard, SectionHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill, { Score } from '@/components/ui/Pill';
import Spinner from '@/components/ui/Spinner';
import SubjectIcon from '@/components/ui/SubjectIcon';
import DifficultyMeter from '@/components/ui/DifficultyMeter';
import { Chips } from '@/components/ui/Choice';
import { Field, Input, Select } from '@/components/ui/Field';

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
}

const questionCounts = [5, 10, 15, 20].map(n => ({ value: n, label: String(n) }));

export default function PracticePage() {
  const { user, token, loading } = useAuth();
  const childGrade = (user as { grade?: number | null })?.grade ?? 1;
  const router = useRouter();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [grade, setGrade] = useState(childGrade);
  const [subject, setSubject] = useState('math');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      apiFetch('/api/practice', token)
        .then(data => { setSessions(data.sessions || []); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const handleStart = async () => {
    setGenerating(true);
    setError('');
    try {
      const data = await apiFetch('/api/practice', token, {
        method: 'POST',
        body: JSON.stringify({ grade, subject, topic: topic.trim() || null, difficulty, numQuestions }),
      });
      router.push(`/child/practice/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate practice');
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this practice session? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/practice/${id}`, token, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove session');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || dataLoading) return <PageLoader />;

  const openForm = () => { setShowForm(true); setError(''); };

  return (
    <Page width="medium">
      <PageHeader
        title="Practice"
        subtitle="Generate questions and practice on your own"
        actions={
          <Button onClick={openForm} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>New session</Button>
        }
      />

      {/* Errors from removing a session; generation errors show inside the dialog */}
      {error && !showForm && <Alert className="mb-6" onDismiss={() => setError('')}>{error}</Alert>}

      {sessions.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No practice sessions yet"
          description="Pick a subject and difficulty to generate a set of questions. Every session earns points and keeps your streak alive."
          action={<Button onClick={openForm}>Start a session</Button>}
        />
      ) : (
        <section aria-labelledby="sessions-heading">
          <SectionHeader id="sessions-heading" title="Past sessions" count={sessions.length} />
          <ListCard>
            {sessions.map(s => {
              const done = s.status === 'completed';
              return (
                <li key={s.id} className="flex items-center gap-1 pr-2 sm:pr-3">
                  <Link href={`/child/practice/${s.id}`} className="group flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 sm:pl-5">
                    <SubjectIcon subject={s.subject} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-ink group-hover:underline sm:truncate">
                        {s.topic || `Grade ${s.grade} ${subjectLabel(s.subject)}`}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                        <span>{subjectLabel(s.subject)}</span>
                        <DifficultyMeter difficulty={s.difficulty} />
                        <span>Grade {s.grade}</span>
                        <span className="text-ink-subtle">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {done && s.pointsAwarded ? <span className="hidden text-xs font-semibold text-honey-text sm:inline">+{s.pointsAwarded} pts</span> : null}
                      {done && s.score !== null ? (
                        <Score value={s.score} className="text-base" />
                      ) : (
                        <Pill tone={done ? 'good' : 'honey'}>{done ? 'Done' : 'In progress'}</Pill>
                      )}
                      {done && <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden="true" />}
                    </div>
                  </Link>
                  {!done && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      aria-label="Remove session"
                      title="Remove session"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-bad-soft hover:text-bad-text disabled:opacity-50"
                    >
                      {deletingId === s.id ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  )}
                </li>
              );
            })}
          </ListCard>
        </section>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New practice session" size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Grade level" htmlFor="practice-grade">
              <Select id="practice-grade" value={grade} onChange={e => setGrade(Number(e.target.value))}>
                {GRADES.map(g => (
                  <option key={g} value={g} disabled={g < childGrade}>
                    Grade {g}{g < childGrade ? ' (below your grade)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" htmlFor="practice-subject">
              <Select id="practice-subject" value={subject} onChange={e => setSubject(e.target.value)}>
                {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Topic" htmlFor="practice-topic" optional>
            <Input
              id="practice-topic"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Fractions, The Solar System, Grammar..."
            />
          </Field>

          <Field label="Difficulty">
            <Chips label="Difficulty" block value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
          </Field>

          <Field label="Number of questions">
            <Chips label="Number of questions" block value={numQuestions} onChange={setNumQuestions} options={questionCounts} />
          </Field>

          {error && <Alert>{error}</Alert>}

          <Button size="lg" block onClick={handleStart} loading={generating}>
            {generating ? 'Generating questions…' : 'Start practice'}
          </Button>
        </div>
      </Modal>
    </Page>
  );
}
