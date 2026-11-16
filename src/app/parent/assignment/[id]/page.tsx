'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { subjectLabel } from '@/lib/subjects';
import MathText from '@/components/MathText';
import PageHeader from '@/components/PageHeader';
import AnswerOption, { AnswerState } from '@/components/quiz/AnswerOption';
import QuestionCard, { QuestionNote, ResultMark } from '@/components/quiz/QuestionCard';
import Page, { PageLoader, PageMessage } from '@/components/ui/Page';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill, { scoreTone, toneTextClass } from '@/components/ui/Pill';
import PrintButton from '@/components/ui/PrintButton';
import { Segmented } from '@/components/ui/Choice';
import { Field, Input, Textarea } from '@/components/ui/Field';

interface Question {
  id: string;
  questionType: string;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string;
  orderIndex: number;
  answers: Array<{
    id: string;
    selectedAnswer: string | null;
    isCorrect: boolean | null;
    aiExplanation: string | null;
    aiScore: number | null;
    parentComment: string | null;
    flagged: boolean;
    flagReason: string | null;
    flagResolvedAt: string | null;
  }>;
}

interface Assignment {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  grade: number;
  status: string;
  score: number | null;
  aiFeedback: string | null;
  parentComment: string | null;
  reviewMode: string;
  numQuestions: number;
  timeLimitMin: number | null;
  pointsAwarded: number | null;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  child: { id: string; name: string | null };
  questions: Question[];
}

export default function ParentAssignmentPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewType, setReviewType] = useState<'ai' | 'parent'>('ai');
  const [reviews, setReviews] = useState<Record<string, { isCorrect: boolean; comment: string; score?: number }>>({});
  const [parentComment, setParentComment] = useState('');
  const [overallScore, setOverallScore] = useState(0);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveCorrect, setResolveCorrect] = useState(false);
  const [resolveComment, setResolveComment] = useState('');
  const [resolveScore, setResolveScore] = useState<number | undefined>(undefined);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (token && params.id) {
      apiFetch(`/api/assignments/${params.id}`, token)
        .then(data => {
          setAssignment(data.assignment);
          // Pre-fill reviews from existing answers
          const r: Record<string, { isCorrect: boolean; comment: string; score?: number }> = {};
          for (const q of data.assignment.questions) {
            const ans = q.answers[0];
            if (ans) {
              r[q.id] = {
                isCorrect: ans.isCorrect ?? false,
                comment: ans.parentComment || '',
                score: ans.aiScore ?? undefined,
              };
            }
          }
          setReviews(r);
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router, params.id]);

  const handleAIReview = async () => {
    setReviewing(true);
    setError('');
    try {
      await apiFetch(`/api/assignments/${params.id}/review`, token, {
        method: 'POST',
        body: JSON.stringify({ mode: 'ai' }),
      });
      // Refresh assignment
      const data = await apiFetch(`/api/assignments/${params.id}`, token);
      setAssignment(data.assignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    }
    setReviewing(false);
  };

  const handleParentReview = async () => {
    setReviewing(true);
    setError('');
    try {
      const reviewList = Object.entries(reviews).map(([questionId, r]) => ({
        questionId,
        isCorrect: r.isCorrect,
        comment: r.comment,
        score: r.score,
      }));
      await apiFetch(`/api/assignments/${params.id}/review`, token, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'parent',
          reviews: reviewList,
          overallScore,
          parentComment,
        }),
      });
      const data = await apiFetch(`/api/assignments/${params.id}`, token);
      setAssignment(data.assignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    }
    setReviewing(false);
  };

  const handleResolveFlag = async (questionId: string, action: 'override' | 'dismiss' | 'exclude') => {
    if (!token) return;
    setResolving(true);
    try {
      await apiFetch(`/api/assignments/${params.id}/resolve-flag`, token, {
        method: 'POST',
        body: JSON.stringify({
          questionId,
          dismiss: action === 'dismiss',
          exclude: action === 'exclude',
          isCorrect: resolveCorrect,
          parentComment: resolveComment || null,
          aiScore: resolveScore,
        }),
      });
      const data = await apiFetch(`/api/assignments/${params.id}`, token);
      setAssignment(data.assignment);
      setResolvingId(null);
      setResolveCorrect(false);
      setResolveComment('');
      setResolveScore(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve flag');
    }
    setResolving(false);
  };

  const openResolve = (q: Question) => {
    const ans = q.answers[0];
    setResolvingId(q.id);
    setResolveCorrect(ans?.isCorrect ?? false);
    setResolveComment('');
    setResolveScore(ans?.aiScore ?? undefined);
  };

  if (loading || dataLoading) return <PageLoader />;
  if (!assignment) return <PageMessage>Assignment not found</PageMessage>;

  const isReviewed = assignment.status === 'reviewed';
  const isSubmitted = assignment.status === 'submitted';

  return (
    <Page width="medium">
      <PageHeader
        back={{ onClick: () => router.back(), label: 'Back' }}
        title={`${subjectLabel(assignment.subject)}: ${assignment.topic}`}
        subtitle={[
          assignment.child?.name,
          `Grade ${assignment.grade}`,
          assignment.difficulty,
          `${assignment.numQuestions} questions`,
          assignment.timeLimitMin ? `${assignment.timeLimitMin} min` : null,
        ].filter(Boolean).join(' · ')}
        actions={<PrintButton />}
      />

      {/* Result: score, points and overall feedback together */}
      {isReviewed && (assignment.score !== null || assignment.aiFeedback) && (
        <Card className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {assignment.score !== null && (
            <div className="shrink-0 sm:text-center">
              <p className={`text-5xl font-semibold leading-none tracking-tight ${toneTextClass(scoreTone(assignment.score))}`}>
                {assignment.score}%
              </p>
              {assignment.pointsAwarded ? <Pill tone="honey" className="mt-2">+{assignment.pointsAwarded} pts</Pill> : null}
            </div>
          )}
          {assignment.aiFeedback && (
            <div className="min-w-0 sm:border-l sm:border-line sm:pl-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Feedback</p>
              <p className="mt-1 text-sm leading-relaxed text-ink"><MathText text={assignment.aiFeedback} /></p>
            </div>
          )}
        </Card>
      )}

      {/* Questions */}
      <div className="mb-8 space-y-4">
        {assignment.questions.map((q, i) => {
          const ans = q.answers[0];
          const unresolvedFlag = !!ans?.flagged && !ans.flagResolvedAt;

          // The child's pick is green/red once graded; the right answer is revealed after review
          const optionState = (key: string): AnswerState => {
            if (ans?.selectedAnswer === key) {
              if (ans.isCorrect === true) return 'correct';
              return ans.isCorrect === false ? 'wrong' : 'selected';
            }
            return q.correctAnswer === key && isReviewed ? 'correct' : 'dim';
          };

          return (
            <QuestionCard
              key={q.id}
              number={i + 1}
              question={q.questionText}
              meta={q.questionType.replace(/_/g, ' ')}
              status={ans?.isCorrect !== null && ans?.isCorrect !== undefined ? <ResultMark correct={ans.isCorrect} /> : undefined}
              flagged={unresolvedFlag}
            >
              {/* Show options for MC */}
              {q.questionType === 'multiple_choice' && (
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { key: 'A', val: q.optionA },
                    { key: 'B', val: q.optionB },
                    { key: 'C', val: q.optionC },
                    { key: 'D', val: q.optionD },
                  ].map(opt => (
                    <AnswerOption key={opt.key} letter={opt.key} state={optionState(opt.key)}>
                      {opt.val && <MathText text={opt.val} />}
                    </AnswerOption>
                  ))}
                </div>
              )}

              {/* Child's answer */}
              {ans && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-ink-muted">Answer</dt>
                  <dd className="font-semibold text-ink">{ans.selectedAnswer ? <MathText text={ans.selectedAnswer} /> : '(no answer)'}</dd>
                  <dt className="text-ink-muted">Correct</dt>
                  <dd className="font-semibold text-ink"><MathText text={q.correctAnswer} /></dd>
                </dl>
              )}

              <div className="mt-3 space-y-2 empty:hidden">
                {/* AI explanation */}
                {ans?.aiExplanation && <QuestionNote label="Explanation"><MathText text={ans.aiExplanation} /></QuestionNote>}

                {/* Parent comment display */}
                {ans?.parentComment && <QuestionNote label="Parent comment">{ans.parentComment}</QuestionNote>}

                {/* Flagged question indicator */}
                {unresolvedFlag && (
                  <div className="rounded-xl border border-warn/40 bg-warn-soft p-4">
                    <p className="text-sm font-semibold text-warn-text">Child flagged this question</p>
                    {ans.flagReason && <p className="mt-1 text-sm text-warn-text">Reason: &ldquo;{ans.flagReason}&rdquo;</p>}

                    {resolvingId === q.id ? (
                      <div className="no-print mt-3 space-y-3 border-t border-warn/30 pt-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-ink">
                          <input
                            type="checkbox"
                            checked={resolveCorrect}
                            onChange={e => setResolveCorrect(e.target.checked)}
                            className="h-4 w-4 accent-brand"
                          />
                          Mark as correct
                        </label>
                        {q.questionType === 'open_ended' && (
                          <Input
                            controlSize="sm"
                            type="number"
                            min={0}
                            max={100}
                            aria-label="Override score"
                            placeholder="Override score (0-100)"
                            value={resolveScore ?? ''}
                            onChange={e => setResolveScore(e.target.value ? Number(e.target.value) : undefined)}
                            className="max-w-[12rem]"
                          />
                        )}
                        <Input
                          controlSize="sm"
                          type="text"
                          aria-label="Comment"
                          placeholder="Comment (optional)"
                          value={resolveComment}
                          onChange={e => setResolveComment(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => handleResolveFlag(q.id, 'override')} disabled={resolving}>
                            {resolving ? 'Saving…' : 'Override & include'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleResolveFlag(q.id, 'exclude')} disabled={resolving}>
                            Exclude from score
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleResolveFlag(q.id, 'dismiss')} disabled={resolving}>
                            Dismiss flag
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setResolvingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" className="no-print mt-3" onClick={() => openResolve(q)}>Review flag</Button>
                    )}
                  </div>
                )}
                {ans?.flagged && ans.flagResolvedAt && (
                  <QuestionNote tone="good">
                    Flag resolved {ans.isCorrect === null ? '(excluded from scoring)' : ''}
                  </QuestionNote>
                )}
              </div>

              {/* Parent review inputs (for submitted, parent-review mode) */}
              {isSubmitted && reviewType === 'parent' && (
                <div className="no-print mt-4 space-y-3 border-t border-line pt-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={reviews[q.id]?.isCorrect ?? false}
                        onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: e.target.checked, comment: prev[q.id]?.comment || '' } }))}
                        className="h-4 w-4 accent-brand"
                      />
                      Mark correct
                    </label>
                    {q.questionType === 'open_ended' && (
                      <Input
                        controlSize="sm"
                        type="number"
                        min={0}
                        max={100}
                        aria-label="Score"
                        placeholder="Score (0-100)"
                        value={reviews[q.id]?.score ?? ''}
                        onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: prev[q.id]?.isCorrect ?? false, comment: prev[q.id]?.comment || '', score: Number(e.target.value) } }))}
                        className="max-w-[9rem]"
                      />
                    )}
                  </div>
                  <Input
                    controlSize="sm"
                    type="text"
                    aria-label="Comment for this question"
                    placeholder="Comment for this question..."
                    value={reviews[q.id]?.comment || ''}
                    onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: prev[q.id]?.isCorrect ?? false, comment: e.target.value } }))}
                  />
                </div>
              )}
            </QuestionCard>
          );
        })}
      </div>

      {/* Review actions */}
      {isSubmitted && (
        <Card className="no-print">
          <h3 className="font-display text-lg font-semibold text-ink">Review this assignment</h3>

          {/* Review type toggle */}
          <Segmented
            block
            className="mt-4"
            label="Review method"
            value={reviewType}
            onChange={setReviewType}
            options={[{ value: 'ai', label: 'Auto-review' }, { value: 'parent', label: 'Review manually' }]}
          />

          {reviewType === 'parent' && (
            <div className="mt-5 space-y-4">
              <Field label="Overall score (0-100)" htmlFor="overall-score">
                <Input
                  id="overall-score"
                  type="number"
                  min={0}
                  max={100}
                  value={overallScore}
                  onChange={e => setOverallScore(Number(e.target.value))}
                  className="max-w-[8rem]"
                />
              </Field>
              <Field label="Overall comment" htmlFor="overall-comment">
                <Textarea
                  id="overall-comment"
                  value={parentComment}
                  onChange={e => setParentComment(e.target.value)}
                  rows={3}
                  placeholder="Great job! Here are some areas to focus on..."
                />
              </Field>
            </div>
          )}

          {error && <Alert className="mt-4">{error}</Alert>}

          <Button size="lg" block className="mt-5" onClick={reviewType === 'ai' ? handleAIReview : handleParentReview} loading={reviewing}>
            {reviewing
              ? reviewType === 'ai' ? 'Reviewing…' : 'Submitting review…'
              : reviewType === 'ai' ? 'Run auto-review' : 'Submit manual review'}
          </Button>
        </Card>
      )}

      {/* Errors from resolving a flag on an assignment that is already reviewed */}
      {error && !isSubmitted && <Alert className="mt-4">{error}</Alert>}
    </Page>
  );
}
