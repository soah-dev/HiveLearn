'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { subjectLabel } from '@/lib/subjects';
import MathText from '@/components/MathText';
import QuizProgress from '@/components/QuizProgress';
import PageHeader from '@/components/PageHeader';
import AnswerOption, { AnswerState } from '@/components/quiz/AnswerOption';
import QuestionCard, { ResultMark } from '@/components/quiz/QuestionCard';
import Page, { PageLoader, PageMessage } from '@/components/ui/Page';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill, { scoreTone, toneTextClass } from '@/components/ui/Pill';
import PrintButton from '@/components/ui/PrintButton';

interface PracticeQuestion {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  orderIndex: number;
  answers: Array<{ selectedAnswer: string | null; isCorrect: boolean | null; flagged: boolean }>;
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
  /** Set when the session was started from a study lesson. */
  lessonId: string | null;
  questions: PracticeQuestion[];
}

export default function PracticeSessionPage() {
  const { user, token, getToken, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; pointsAwarded: number; correct: number; total: number; flagged?: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && params.id) {
      apiFetch(`/api/practice/${params.id}`, token)
        .then(data => {
          setSession(data.session);
          // Pre-fill saved answers and flags
          const saved: Record<string, string> = {};
          const savedFlags: Record<string, boolean> = {};
          for (const q of data.session.questions) {
            if (q.answers[0]?.selectedAnswer) saved[q.id] = q.answers[0].selectedAnswer;
            if (q.answers[0]?.flagged) savedFlags[q.id] = true;
          }
          setAnswers(saved);
          setFlags(savedFlags);
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router, params.id]);

  const handleSubmit = async () => {
    if (!session) return;

    // Warn about unanswered questions
    const unanswered = session.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      const confirmed = window.confirm(
        `You have ${unanswered.length} unanswered question${unanswered.length > 1 ? 's' : ''}. Submit anyway?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError('');
    try {
      const answerList = session.questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] || null,
        flagged: false,
      }));
      const data = await apiFetch(`/api/practice/${session.id}/submit`, getToken, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      });
      setResult(data);
      // Refresh session to show correct answers
      const freshToken = await getToken();
      const refreshed = await apiFetch(`/api/practice/${session.id}`, freshToken);
      setSession(refreshed.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    }
    setSubmitting(false);
  };

  if (loading || dataLoading) return <PageLoader />;
  if (!session) return <PageMessage>Session not found</PageMessage>;

  const isCompleted = session.status === 'completed';
  const answeredCount = session.questions.filter(q => !!answers[q.id]).length;

  // Prefer the submit response; fall back to the stored session when revisiting
  const score = result?.score ?? session.score;
  const points = result?.pointsAwarded ?? session.pointsAwarded;
  const correctCount = result?.correct ?? session.questions.filter(q => q.answers[0]?.isCorrect).length;
  const totalCount = result?.total ?? session.questions.length;

  // Practice on a study lesson leads back to that lesson, not the practice list
  const lessonHref = session.lessonId ? `/child/study/${session.lessonId}` : null;

  return (
    <Page width="narrow">
      <PageHeader
        back={lessonHref ? { href: lessonHref, label: 'Back to lesson' } : { href: '/child/practice', label: 'Back to practice' }}
        title={`${subjectLabel(session.subject)}${session.topic ? `: ${session.topic}` : ''}`}
        subtitle={`Grade ${session.grade} · ${session.difficulty} · ${session.questions.length} questions`}
        actions={<PrintButton />}
      />

      {/* Result */}
      {(isCompleted || result) && score !== null && (
        <Card className="mb-6 flex items-center gap-5 sm:gap-6">
          <p className={`text-5xl font-semibold leading-none tracking-tight ${toneTextClass(scoreTone(score))}`}>{score}%</p>
          <div className="min-w-0 border-l border-line pl-5 sm:pl-6">
            <p className="font-semibold text-ink">{correctCount} of {totalCount} correct</p>
            {points ? <Pill tone="honey" className="mt-1.5">+{points} pts</Pill> : null}
          </div>
        </Card>
      )}

      {/* Questions */}
      <div className="mb-8 space-y-4">
        {session.questions.map((q, i) => {
          const ans = q.answers[0];
          const myAnswer = answers[q.id] || '';

          const optionState = (key: string): AnswerState => {
            if (isCompleted) {
              if (key === q.correctAnswer) return 'correct';
              return myAnswer === key && !ans?.isCorrect ? 'wrong' : 'dim';
            }
            return myAnswer === key ? 'selected' : 'idle';
          };

          let status = null;
          if (!isCompleted && myAnswer) {
            status = <Check className="h-4 w-4 text-good-text" aria-label="Answered" />;
          } else if (isCompleted && ans?.isCorrect !== null && ans?.isCorrect !== undefined) {
            status = <ResultMark correct={ans.isCorrect} />;
          }

          return (
            <QuestionCard key={q.id} number={i + 1} question={q.questionText} status={status}>
              <div className="space-y-2">
                {[
                  { key: 'A', val: q.optionA },
                  { key: 'B', val: q.optionB },
                  { key: 'C', val: q.optionC },
                  { key: 'D', val: q.optionD },
                ].map(opt => (
                  <AnswerOption
                    key={opt.key}
                    letter={opt.key}
                    state={optionState(opt.key)}
                    onSelect={isCompleted ? undefined : () => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                  >
                    {opt.val && <MathText text={opt.val} />}
                  </AnswerOption>
                ))}
              </div>

              {/* Flag checkbox - disabled for practice to prevent abuse
              {!isCompleted && (
                <label className="flex items-center gap-2 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isFlagged}
                    onChange={e => setFlags(prev => ({ ...prev, [q.id]: e.target.checked }))}
                    className="h-4 w-4 accent-warn"
                  />
                  <span className="text-sm font-medium text-ink-muted">
                    Flag this question (will be excluded from scoring)
                  </span>
                </label>
              )}
              {!isCompleted && isFlagged && (
                <p className="mt-1 ml-6 text-xs text-warn-text">
                  This question will be disregarded from scoring
                </p>
              )}
              */}

              {/* After completion: show correct answer */}
              {isCompleted && myAnswer !== q.correctAnswer && (
                <p className="mt-3 text-sm text-ink-muted">
                  Correct answer: <span className="font-semibold text-good-text">
                    <span>{q.correctAnswer}.</span> <MathText text={(q.correctAnswer === 'A' ? q.optionA : q.correctAnswer === 'B' ? q.optionB : q.correctAnswer === 'C' ? q.optionC : q.optionD) || q.correctAnswer} />
                  </span>
                </p>
              )}
            </QuestionCard>
          );
        })}
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      {!isCompleted && (
        <div className="no-print sticky bottom-0 -mx-4 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-4 pb-4 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-pop">
            <QuizProgress answered={answeredCount} total={session.questions.length} />
            <Button block onClick={handleSubmit} loading={submitting}>
              {answeredCount < session.questions.length ? `Submit (${answeredCount}/${session.questions.length})` : 'Submit practice'}
            </Button>
          </div>
        </div>
      )}

      {isCompleted && (
        <Button size="lg" block className="no-print" onClick={() => router.push(lessonHref ?? '/child/practice')}>
          {lessonHref ? 'Back to lesson' : 'Start another session'}
        </Button>
      )}
    </Page>
  );
}
