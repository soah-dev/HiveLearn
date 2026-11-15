'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, Flag, Hourglass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { subjectLabel } from '@/lib/subjects';
import MathText from '@/components/MathText';
import QuizProgress, { Countdown } from '@/components/QuizProgress';
import PageHeader from '@/components/PageHeader';
import AnswerOption, { AnswerState } from '@/components/quiz/AnswerOption';
import QuestionCard, { QuestionNote, ResultMark } from '@/components/quiz/QuestionCard';
import Page, { PageLoader, PageMessage } from '@/components/ui/Page';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill, { scoreTone, toneTextClass } from '@/components/ui/Pill';
import Hexagon from '@/components/ui/Hexagon';
import SubjectIcon from '@/components/ui/SubjectIcon';
import PrintButton from '@/components/ui/PrintButton';
import { Input, Textarea } from '@/components/ui/Field';

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
  startedAt: string | null;
  questions: Question[];
}

export default function ChildAssignmentPage() {
  const { user, token, getToken, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [flagReasons, setFlagReasons] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = useCallback(async (skipConfirm = false) => {
    if (!assignment) return;

    // Warn about unanswered (non-flagged) questions
    if (!skipConfirm) {
      const unanswered = assignment.questions.filter(q => !answers[q.id] && !flags[q.id]);
      if (unanswered.length > 0) {
        const confirmed = window.confirm(
          `You have ${unanswered.length} unanswered question${unanswered.length > 1 ? 's' : ''}. Submit anyway?`
        );
        if (!confirmed) return;
      }
    }

    setSubmitting(true);
    try {
      const answerList = assignment.questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] || null,
        flagged: flags[q.id] || false,
        flagReason: flags[q.id] ? (flagReasons[q.id] || null) : null,
      }));
      await apiFetch(`/api/assignments/${assignment.id}/submit`, getToken, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      });

      // Refresh
      const freshToken = await getToken();
      const data = await apiFetch(`/api/assignments/${params.id}`, freshToken);
      setAssignment(data.assignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    }
    setSubmitting(false);
  }, [assignment, getToken, answers, flags, flagReasons, params.id]);

  useEffect(() => {
    if (token && params.id) {
      apiFetch(`/api/assignments/${params.id}`, token)
        .then(data => {
          const a = data.assignment;
          setAssignment(a);
          // Pre-fill saved answers and flags
          const saved: Record<string, string> = {};
          const savedFlags: Record<string, boolean> = {};
          for (const q of a.questions) {
            if (q.answers[0]?.selectedAnswer) {
              saved[q.id] = q.answers[0].selectedAnswer;
            }
            if (q.answers[0]?.flagged) {
              savedFlags[q.id] = true;
            }
          }
          setAnswers(saved);
          setFlags(savedFlags);

          // Start timer if timed and in progress
          if (a.timeLimitMin && a.startedAt && (a.status === 'in_progress' || a.status === 'pending')) {
            const elapsed = (Date.now() - new Date(a.startedAt).getTime()) / 1000;
            const remaining = Math.max(0, a.timeLimitMin * 60 - elapsed);
            setTimeLeft(Math.floor(remaining));
          }
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router, params.id]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit (skip confirmation)
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, handleSubmit]);

  const startAssignment = async () => {
    if (!assignment || !token) return;
    try {
      await apiFetch(`/api/assignments/${assignment.id}/start`, token, { method: 'POST' });
      const data = await apiFetch(`/api/assignments/${params.id}`, token);
      const a = data.assignment;
      setAssignment(a);
      if (a.timeLimitMin) {
        setTimeLeft(a.timeLimitMin * 60);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    }
  };

  const saveProgress = async () => {
    if (!assignment || !token) return;
    setSaving(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer,
      }));
      await apiFetch(`/api/assignments/${assignment.id}/save-progress`, token, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      });
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (loading || dataLoading) return <PageLoader />;
  if (!assignment) return <PageMessage>Assignment not found</PageMessage>;

  const isReviewed = assignment.status === 'reviewed';
  const isSubmitted = assignment.status === 'submitted';
  const isPending = assignment.status === 'pending';
  const isActive = assignment.status === 'in_progress';
  const canAnswer = isPending || isActive;
  const answeredCount = assignment.questions.filter(q => !!answers[q.id]).length;

  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: '/child/dashboard', label: 'Back to dashboard' }}
        title={`${subjectLabel(assignment.subject)}: ${assignment.topic}`}
        subtitle={`Grade ${assignment.grade} · ${assignment.difficulty} · ${assignment.numQuestions} questions${assignment.timeLimitMin ? ` · ${assignment.timeLimitMin} min limit` : ''}`}
        actions={(isReviewed || isActive) ? <PrintButton /> : undefined}
      />

      {/* Start card for pending */}
      {isPending && (
        <Card padding="lg" className="mb-8 text-center">
          <SubjectIcon subject={assignment.subject} size={64} tone="honey" />
          <h2 className="mt-4 font-display text-xl font-semibold text-ink">Ready to begin?</h2>
          <p className="mt-1 text-ink-muted">
            {assignment.numQuestions} questions · {assignment.difficulty}
            {assignment.timeLimitMin && ` · ${assignment.timeLimitMin} min time limit`}
          </p>
          {timeLeft !== null && <Countdown seconds={timeLeft} className="mt-4" />}
          <div className="mt-6">
            <Button size="lg" onClick={startAssignment}>Start assignment</Button>
          </div>
        </Card>
      )}

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

      {isSubmitted && (
        <Card padding="lg" className="text-center">
          <Hexagon size={56} tone="info">
            <Hourglass className="h-6 w-6" aria-hidden="true" />
          </Hexagon>
          <p className="mt-4 font-display text-lg font-semibold text-ink">Assignment submitted!</p>
          <p className="mt-1 text-sm text-ink-muted">Your results will be visible once your parent reviews it.</p>
        </Card>
      )}

      {/* Questions */}
      {(isActive || isReviewed) && (
        <div className="mb-8 space-y-4">
          {assignment.questions.map((q, i) => {
            const ans = q.answers[0];
            const myAnswer = answers[q.id] || '';
            const isFlagged = flags[q.id] || false;
            const wasFlagged = ans?.flagged || false;

            const optionState = (key: string): AnswerState => {
              if (isReviewed) {
                if (key === q.correctAnswer) return 'correct';
                return myAnswer === key && !ans?.isCorrect ? 'wrong' : 'dim';
              }
              return myAnswer === key ? 'selected' : 'idle';
            };
            const pick = (value: string) => (canAnswer ? () => setAnswers(prev => ({ ...prev, [q.id]: value })) : undefined);

            let status = null;
            if (canAnswer && myAnswer && !isFlagged) {
              status = <Check className="h-4 w-4 text-good-text" aria-label="Answered" />;
            } else if (isReviewed && wasFlagged) {
              status = ans.flagResolvedAt ? <Pill tone="good">Resolved</Pill> : <Pill tone="warn">Pending review</Pill>;
            } else if (isReviewed && ans?.isCorrect !== null && ans?.isCorrect !== undefined) {
              status = <ResultMark correct={ans.isCorrect} />;
            }

            return (
              <QuestionCard key={q.id} number={i + 1} question={q.questionText} status={status} flagged={isFlagged || wasFlagged}>
                {/* Multiple Choice */}
                {q.questionType === 'multiple_choice' && (
                  <div className="space-y-2">
                    {[
                      { key: 'A', val: q.optionA },
                      { key: 'B', val: q.optionB },
                      { key: 'C', val: q.optionC },
                      { key: 'D', val: q.optionD },
                    ].map(opt => (
                      <AnswerOption key={opt.key} letter={opt.key} state={optionState(opt.key)} onSelect={pick(opt.key)}>
                        {opt.val && <MathText text={opt.val} />}
                      </AnswerOption>
                    ))}
                  </div>
                )}

                {/* True/False */}
                {q.questionType === 'true_false' && (
                  <div className="grid grid-cols-2 gap-2">
                    {['True', 'False'].map(val => (
                      <AnswerOption key={val} state={optionState(val)} onSelect={pick(val)}>{val}</AnswerOption>
                    ))}
                  </div>
                )}

                {/* Fill in the Blank */}
                {q.questionType === 'fill_in_blank' && (
                  <Input
                    type="text"
                    aria-label={`Answer to question ${i + 1}`}
                    value={myAnswer}
                    onChange={e => canAnswer && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    disabled={!canAnswer}
                    placeholder="Type your answer..."
                  />
                )}

                {/* Open Ended */}
                {q.questionType === 'open_ended' && (
                  <Textarea
                    aria-label={`Answer to question ${i + 1}`}
                    value={myAnswer}
                    onChange={e => canAnswer && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    disabled={!canAnswer}
                    placeholder="Write your response..."
                    rows={4}
                    className="resize-none"
                  />
                )}

                {/* Flag checkbox - during quiz */}
                {canAnswer && (
                  <div className="no-print mt-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">
                      <input
                        type="checkbox"
                        checked={isFlagged}
                        onChange={e => setFlags(prev => ({ ...prev, [q.id]: e.target.checked }))}
                        className="h-4 w-4 accent-warn"
                      />
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      Flag this question
                    </label>
                    {isFlagged && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-warn-text">Make your best guess and your parent will review</p>
                        <Input
                          controlSize="sm"
                          type="text"
                          value={flagReasons[q.id] || ''}
                          onChange={e => setFlagReasons(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="What's wrong with this question? (optional)"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Post-review info */}
                {isReviewed && (
                  <div className="mt-4 space-y-2">
                    {wasFlagged && (
                      <QuestionNote tone="warn" label={ans.flagResolvedAt ? 'Flag resolved by parent' : 'Flagged — awaiting parent review'}>
                        {ans.flagReason && <p>Reason: {ans.flagReason}</p>}
                        {ans.parentComment && <p className="mt-1">Parent: {ans.parentComment}</p>}
                      </QuestionNote>
                    )}
                    {!wasFlagged && q.questionType !== 'open_ended' && (
                      <p className="text-sm text-ink-muted">
                        Correct answer: <span className="font-semibold text-good-text">
                          {q.questionType === 'multiple_choice'
                            ? <><span>{q.correctAnswer}.</span> <MathText text={(q.correctAnswer === 'A' ? q.optionA : q.correctAnswer === 'B' ? q.optionB : q.correctAnswer === 'C' ? q.optionC : q.optionD) || q.correctAnswer} /></>
                            : <MathText text={q.correctAnswer} />}
                        </span>
                      </p>
                    )}
                    {ans?.aiScore !== null && ans?.aiScore !== undefined && (
                      <p className="text-sm text-ink-muted">Score: {ans.aiScore}/100</p>
                    )}
                    {ans?.aiExplanation && <QuestionNote label="Explanation"><MathText text={ans.aiExplanation} /></QuestionNote>}
                    {!wasFlagged && ans?.parentComment && <QuestionNote label="Parent says">{ans.parentComment}</QuestionNote>}
                  </div>
                )}
              </QuestionCard>
            );
          })}
        </div>
      )}

      {error && <Alert className="mb-4">{error}</Alert>}

      {/* Sticky action bar: progress, timer and submit always in view */}
      {isActive && (
        <div className="no-print sticky bottom-0 -mx-4 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-4 pb-4 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-pop">
            <QuizProgress answered={answeredCount} total={assignment.questions.length} timeLeft={timeLeft} />
            <div className="flex gap-3">
              {!assignment.timeLimitMin && (
                <Button variant="secondary" className="flex-1" onClick={saveProgress} loading={saving}>
                  Save progress
                </Button>
              )}
              <Button className="flex-1" onClick={() => handleSubmit()} loading={submitting}>
                {answeredCount < assignment.questions.length ? `Submit (${answeredCount}/${assignment.questions.length})` : 'Submit assignment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
