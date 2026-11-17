'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { DIFFICULTIES, subjectLabel } from '@/lib/subjects';
import type { LessonContent } from '@/lib/lesson';
import PageHeader from '@/components/PageHeader';
import LessonText, { LessonInline } from '@/components/study/LessonText';
import { QuestionNote } from '@/components/quiz/QuestionCard';
import Page, { PageLoader, PageMessage } from '@/components/ui/Page';
import Card, { ListCard, SectionHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill, { Score } from '@/components/ui/Pill';
import Hexagon from '@/components/ui/Hexagon';
import DifficultyMeter from '@/components/ui/DifficultyMeter';
import PrintButton from '@/components/ui/PrintButton';
import { Chips } from '@/components/ui/Choice';
import { Field } from '@/components/ui/Field';

interface LessonPractice {
  id: string;
  difficulty: string;
  status: string;
  score: number | null;
  pointsAwarded: number | null;
  createdAt: string;
  numQuestions: number;
}

interface Lesson {
  id: string;
  subject: string;
  topic: string;
  grade: number;
  content: LessonContent | null;
  practiceSessions: LessonPractice[];
}

const questionCounts = [5, 10].map(n => ({ value: n, label: String(n) }));

export default function LessonPage() {
  const { token, getToken, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && params.id) {
      apiFetch(`/api/study/${params.id}`, token)
        .then(data => { setLesson(data.lesson); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [token, params.id]);

  const startPractice = async () => {
    if (!lesson) return;
    setStarting(true);
    setError('');
    try {
      const data = await apiFetch(`/api/study/${lesson.id}/practice`, getToken, {
        method: 'POST',
        body: JSON.stringify({ difficulty, numQuestions }),
      });
      router.push(`/child/practice/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate practice');
      setStarting(false);
    }
  };

  if (loading || dataLoading) return <PageLoader />;
  if (!lesson) return <PageMessage>Lesson not found</PageMessage>;

  const { content, practiceSessions } = lesson;
  if (!content) return <PageMessage tone="bad">This lesson could not be loaded</PageMessage>;

  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: '/child/study', label: 'Back to study' }}
        title={lesson.topic}
        subtitle={`${subjectLabel(lesson.subject)} · Grade ${lesson.grade}`}
        actions={<PrintButton />}
      />

      <p className="mb-6 text-lg leading-relaxed text-ink"><LessonInline text={content.summary} /></p>

      <Card padding="lg" className="mb-8 space-y-7">
        {content.sections.map((section, i) => (
          <section key={i} className="print-break-inside-avoid">
            <h2 className="mb-2 font-display text-lg font-semibold text-ink"><LessonInline text={section.heading} /></h2>
            <LessonText text={section.body} />
          </section>
        ))}
      </Card>

      {content.keyTerms.length > 0 && (
        <section className="mb-8" aria-labelledby="terms-heading">
          <SectionHeader id="terms-heading" title="Key words" />
          <ListCard>
            {content.keyTerms.map((t, i) => (
              <li key={i} className="px-4 py-3.5 sm:px-5">
                <p className="font-semibold text-ink first-letter:uppercase"><LessonInline text={t.term} /></p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted"><LessonInline text={t.definition} /></p>
              </li>
            ))}
          </ListCard>
        </section>
      )}

      {content.examples.length > 0 && (
        <section className="mb-8" aria-labelledby="examples-heading">
          <SectionHeader id="examples-heading" title="Worked examples" />
          <div className="space-y-4">
            {content.examples.map((example, i) => (
              <Card key={i} className="print-break-inside-avoid">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Example {i + 1}</p>
                <p className="mt-1 font-medium leading-relaxed text-ink"><LessonInline text={example.prompt} /></p>
                {example.steps.length > 0 && (
                  <ol className="mt-4 space-y-2.5">
                    {example.steps.map((step, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Hexagon size={26} tone="muted" className="mt-px">
                          <span className="text-[11px] font-bold tabular-nums">{j + 1}</span>
                        </Hexagon>
                        <span className="min-w-0 flex-1 pt-0.5 text-[15px] leading-relaxed text-ink"><LessonInline text={step} /></span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-4">
                  <QuestionNote label="Answer">
                    <span className="text-[15px] font-medium text-ink"><LessonInline text={example.answer} /></span>
                  </QuestionNote>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {content.takeaways.length > 0 && (
        <section className="mb-8" aria-labelledby="takeaways-heading">
          <SectionHeader id="takeaways-heading" title="Remember" />
          <Card className="print-break-inside-avoid">
            <ul className="space-y-2.5">
              {content.takeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1"><LessonInline text={takeaway} /></span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Card highlight className="no-print mb-8">
        <h2 className="font-display text-lg font-semibold text-ink">Practice this topic</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Answer questions on what you just read. Every session earns points and keeps your streak alive.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Difficulty">
            <Chips label="Difficulty" block value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
          </Field>
          <Field label="Number of questions">
            <Chips label="Number of questions" block value={numQuestions} onChange={setNumQuestions} options={questionCounts} />
          </Field>
        </div>
        {error && <Alert className="mt-4">{error}</Alert>}
        <Button size="lg" block className="mt-5" onClick={startPractice} loading={starting}>
          {starting ? 'Generating questions…' : 'Start practice'}
        </Button>
      </Card>

      {practiceSessions.length > 0 && (
        <section className="no-print" aria-labelledby="practice-heading">
          <SectionHeader id="practice-heading" title="Your practice" count={practiceSessions.length} />
          <ListCard>
            {practiceSessions.map(s => {
              const done = s.status === 'completed';
              return (
                <li key={s.id}>
                  <Link href={`/child/practice/${s.id}`} className="group flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink group-hover:underline">{s.numQuestions} questions</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                        <DifficultyMeter difficulty={s.difficulty} />
                        <span className="text-ink-subtle">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {done && s.pointsAwarded ? <span className="hidden text-xs font-semibold text-honey-text sm:inline">+{s.pointsAwarded} pts</span> : null}
                      {done && s.score !== null ? (
                        <Score value={s.score} className="text-base" />
                      ) : (
                        <Pill tone={done ? 'good' : 'brand'}>{done ? 'Done' : 'In progress'}</Pill>
                      )}
                      <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ListCard>
        </section>
      )}
    </Page>
  );
}
