'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpenText, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { GRADES, SUBJECTS, subjectLabel } from '@/lib/subjects';
import { MAX_TOPIC_LENGTH } from '@/lib/lesson';
import { suggestedTopics } from '@/lib/study-topics';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import Page, { PageLoader } from '@/components/ui/Page';
import { ListCard, SectionHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill, { Score } from '@/components/ui/Pill';
import SubjectIcon from '@/components/ui/SubjectIcon';
import { Chips } from '@/components/ui/Choice';
import { Field, Input, Select } from '@/components/ui/Field';

interface LessonSummary {
  id: string;
  subject: string;
  topic: string;
  grade: number;
  createdAt: string;
  practiceCount: number;
  bestScore: number | null;
}

export default function StudyPage() {
  const { user, token, getToken, loading } = useAuth();
  const childGrade = (user as { grade?: number | null })?.grade ?? 1;
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [grade, setGrade] = useState(childGrade);
  const [subject, setSubject] = useState('math');
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      apiFetch('/api/study', token)
        .then(data => { setLessons(data.lessons || []); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [token]);

  const ideas = suggestedTopics(subject, grade);

  // A tapped idea belongs to one subject and grade, so it goes when either changes
  const dropPickedIdea = () => { if (ideas.includes(topic)) setTopic(''); };

  const handleStart = async () => {
    if (!topic.trim()) return;
    setCreating(true);
    setError('');
    try {
      const data = await apiFetch('/api/study', getToken, {
        method: 'POST',
        body: JSON.stringify({ grade, subject, topic }),
      });
      router.push(`/child/study/${data.lesson.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the lesson');
      setCreating(false);
    }
  };

  if (loading || dataLoading) return <PageLoader />;

  const openForm = () => { setShowForm(true); setError(''); };

  return (
    <Page width="medium">
      <PageHeader
        title="Study"
        subtitle="Pick a topic, learn the basics, then practice it"
        actions={
          <Button onClick={openForm} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>New topic</Button>
        }
      />

      {lessons.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title="No lessons yet"
          description="Choose any topic to get a short lesson with the key ideas and worked examples. Then practice it with questions on what you just learned."
          action={<Button onClick={openForm}>Study a topic</Button>}
        />
      ) : (
        <section aria-labelledby="lessons-heading">
          <SectionHeader id="lessons-heading" title="Your lessons" count={lessons.length} />
          <ListCard>
            {lessons.map(l => (
              <li key={l.id}>
                <Link href={`/child/study/${l.id}`} className="group flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                  <SubjectIcon subject={l.subject} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-ink group-hover:underline sm:truncate">{l.topic}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                      <span>{subjectLabel(l.subject)}</span>
                      <span>Grade {l.grade}</span>
                      <span className="text-ink-subtle">{new Date(l.createdAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {l.bestScore !== null ? (
                      <span className="flex items-baseline gap-1.5">
                        <span className="hidden text-xs text-ink-muted sm:inline">Best</span>
                        <Score value={l.bestScore} className="text-base" />
                      </span>
                    ) : (
                      <Pill>Not practiced</Pill>
                    )}
                    <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ListCard>
        </section>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Study a new topic" size="lg">
        <form onSubmit={e => { e.preventDefault(); handleStart(); }} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Subject" htmlFor="study-subject">
              <Select id="study-subject" value={subject} onChange={e => { dropPickedIdea(); setSubject(e.target.value); }}>
                {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Grade level" htmlFor="study-grade">
              <Select id="study-grade" value={grade} onChange={e => { dropPickedIdea(); setGrade(Number(e.target.value)); }}>
                {GRADES.map(g => (
                  <option key={g} value={g} disabled={g < childGrade}>
                    Grade {g}{g < childGrade ? ' (below your grade)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Topic" htmlFor="study-topic">
            <Input
              id="study-topic"
              type="text"
              value={topic}
              maxLength={MAX_TOPIC_LENGTH}
              onChange={e => setTopic(e.target.value)}
              placeholder="Type a topic, or pick an idea below"
            />
          </Field>

          {ideas.length > 0 && (
            <Field label={`Ideas for Grade ${grade} ${subjectLabel(subject)}`}>
              <Chips label="Topic ideas" value={topic} onChange={setTopic} options={ideas.map(t => ({ value: t, label: t }))} />
            </Field>
          )}

          {error && <Alert>{error}</Alert>}

          <Button type="submit" size="lg" block loading={creating} disabled={!topic.trim()}>
            {creating ? 'Writing your lesson…' : 'Start lesson'}
          </Button>
        </form>
      </Modal>
    </Page>
  );
}
