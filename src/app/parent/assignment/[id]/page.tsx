'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

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
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
      return;
    }
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

  const handleResolveFlag = async (questionId: string, dismiss: boolean) => {
    if (!token) return;
    setResolving(true);
    try {
      await apiFetch(`/api/assignments/${params.id}/resolve-flag`, token, {
        method: 'POST',
        body: JSON.stringify({
          questionId,
          dismiss,
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

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (!assignment) return <><Navbar /><div className="p-8 text-center text-gray-500">Assignment not found</div></>;

  const isReviewed = assignment.status === 'reviewed';
  const isSubmitted = assignment.status === 'submitted';

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 animate-slide-up">
          <button onClick={() => router.back()} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline mb-3 inline-block">&larr; Back</button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white capitalize">{assignment.subject.replace('_', ' ')}: {assignment.topic}</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Grade {assignment.grade} | {assignment.difficulty} | {assignment.numQuestions} questions
                {assignment.timeLimitMin && ` | ${assignment.timeLimitMin} min`}
                {assignment.child?.name && ` | ${assignment.child.name}`}
              </p>
            </div>
            {isReviewed && assignment.score !== null && (
              <div className="text-right">
                <p className={`text-4xl font-extrabold ${assignment.score >= 80 ? 'text-green-600' : assignment.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {assignment.score}%
                </p>
                {assignment.pointsAwarded && <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">+{assignment.pointsAwarded} pts</p>}
              </div>
            )}
          </div>
        </div>

        {/* Feedback banner */}
        {isReviewed && assignment.aiFeedback && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl animate-slide-up">
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">Feedback</p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">{assignment.aiFeedback}</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4 mb-8">
          {assignment.questions.map((q, i) => {
            const ans = q.answers[0];
            return (
              <div
                key={q.id}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">{q.questionType.replace('_', ' ')}</span>
                    <p className="text-gray-900 dark:text-white font-bold mt-2">Q{i + 1}. {q.questionText}</p>
                  </div>
                  {ans?.isCorrect !== null && ans?.isCorrect !== undefined && (
                    <span className={`text-lg ${ans.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                      {ans.isCorrect ? '✓' : '✗'}
                    </span>
                  )}
                </div>

                {/* Show options for MC */}
                {q.questionType === 'multiple_choice' && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { key: 'A', val: q.optionA },
                      { key: 'B', val: q.optionB },
                      { key: 'C', val: q.optionC },
                      { key: 'D', val: q.optionD },
                    ].map(opt => (
                      <div key={opt.key} className={`px-3 py-2.5 rounded-xl text-sm border-2 ${
                        ans?.selectedAnswer === opt.key
                          ? ans?.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-red-500 bg-red-50 dark:bg-red-900/30'
                          : q.correctAnswer === opt.key && isReviewed ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200/60 dark:border-gray-600/60'
                      }`}>
                        <span className="font-bold">{opt.key}.</span> {opt.val}
                      </div>
                    ))}
                  </div>
                )}

                {/* Child's answer */}
                {ans && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Answer: <span className="font-bold text-gray-900 dark:text-white">{ans.selectedAnswer || '(no answer)'}</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Correct: <span className="font-bold text-gray-900 dark:text-white">{q.correctAnswer}</span>
                    </p>
                  </div>
                )}

                {/* AI explanation */}
                {ans?.aiExplanation && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{ans.aiExplanation}</p>
                  </div>
                )}

                {/* Parent review inputs (for submitted, parent-review mode) */}
                {isSubmitted && reviewType === 'parent' && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reviews[q.id]?.isCorrect ?? false}
                          onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: e.target.checked, comment: prev[q.id]?.comment || '' } }))}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Mark correct</span>
                      </label>
                      {q.questionType === 'open_ended' && (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Score (0-100)"
                          value={reviews[q.id]?.score ?? ''}
                          onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: prev[q.id]?.isCorrect ?? false, comment: prev[q.id]?.comment || '', score: Number(e.target.value) } }))}
                          className="w-32 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Comment for this question..."
                      value={reviews[q.id]?.comment || ''}
                      onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: prev[q.id]?.isCorrect ?? false, comment: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {/* Parent comment display */}
                {ans?.parentComment && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">Parent comment</p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">{ans.parentComment}</p>
                  </div>
                )}

                {/* Flagged question indicator */}
                {ans?.flagged && !ans.flagResolvedAt && (
                  <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Child flagged this question for review</p>
                    {ans.flagReason && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Reason: {ans.flagReason}</p>}

                    {resolvingId === q.id ? (
                      <div className="mt-3 space-y-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={resolveCorrect}
                            onChange={e => setResolveCorrect(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Mark as correct</span>
                        </label>
                        {q.questionType === 'open_ended' && (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="Override score (0-100)"
                            value={resolveScore ?? ''}
                            onChange={e => setResolveScore(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-40 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        )}
                        <input
                          type="text"
                          placeholder="Comment (optional)"
                          value={resolveComment}
                          onChange={e => setResolveComment(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveFlag(q.id, false)}
                            disabled={resolving}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all"
                          >
                            {resolving ? 'Saving...' : 'Override & Resolve'}
                          </button>
                          <button
                            onClick={() => handleResolveFlag(q.id, true)}
                            disabled={resolving}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition-all"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => setResolvingId(null)}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openResolve(q)}
                        className="mt-3 px-5 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-all shadow-sm"
                      >
                        Review Flag
                      </button>
                    )}
                  </div>
                )}
                {ans?.flagged && ans.flagResolvedAt && (
                  <div className="mt-3 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-xs font-bold text-green-600 dark:text-green-400">Flag resolved</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Review actions */}
        {isSubmitted && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 animate-slide-up">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">Review this assignment</h3>

            {/* Review type toggle */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setReviewType('ai')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${reviewType === 'ai' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                AI Auto-Review
              </button>
              <button
                onClick={() => setReviewType('parent')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${reviewType === 'parent' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Review Manually
              </button>
            </div>

            {reviewType === 'parent' && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Overall Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={overallScore}
                    onChange={e => setOverallScore(Number(e.target.value))}
                    className="w-32 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Overall Comment</label>
                  <textarea
                    value={parentComment}
                    onChange={e => setParentComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Great job! Here are some areas to focus on..."
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={reviewType === 'ai' ? handleAIReview : handleParentReview}
              disabled={reviewing}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
            >
              {reviewing
                ? reviewType === 'ai' ? 'AI is reviewing...' : 'Submitting review...'
                : reviewType === 'ai' ? 'Run AI Auto-Review' : 'Submit Manual Review'}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
