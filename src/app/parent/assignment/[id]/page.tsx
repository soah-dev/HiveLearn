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

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (!assignment) return <><Navbar /><div className="p-8 text-center text-gray-500">Assignment not found</div></>;

  const isReviewed = assignment.status === 'reviewed';
  const isSubmitted = assignment.status === 'submitted';

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-2">&larr; Back</button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{assignment.subject.replace('_', ' ')}: {assignment.topic}</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Grade {assignment.grade} | {assignment.difficulty} | {assignment.numQuestions} questions
                {assignment.timeLimitMin && ` | ${assignment.timeLimitMin} min`}
                {assignment.child?.name && ` | ${assignment.child.name}`}
              </p>
            </div>
            {isReviewed && assignment.score !== null && (
              <div className="text-right">
                <p className={`text-4xl font-bold ${assignment.score >= 80 ? 'text-green-600' : assignment.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {assignment.score}%
                </p>
                {assignment.pointsAwarded && <p className="text-sm text-gray-500">+{assignment.pointsAwarded} pts</p>}
              </div>
            )}
          </div>
        </div>

        {/* Feedback banner */}
        {isReviewed && assignment.aiFeedback && (
          <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Feedback</p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">{assignment.aiFeedback}</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4 mb-8">
          {assignment.questions.map((q, i) => {
            const ans = q.answers[0];
            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase">{q.questionType.replace('_', ' ')}</span>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">Q{i + 1}. {q.questionText}</p>
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
                      <div key={opt.key} className={`px-3 py-2 rounded-lg text-sm border ${
                        ans?.selectedAnswer === opt.key
                          ? ans?.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-red-500 bg-red-50 dark:bg-red-900/30'
                          : q.correctAnswer === opt.key && isReviewed ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-600'
                      }`}>
                        <span className="font-medium">{opt.key}.</span> {opt.val}
                      </div>
                    ))}
                  </div>
                )}

                {/* Child's answer */}
                {ans && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Answer: <span className="font-medium text-gray-900 dark:text-white">{ans.selectedAnswer || '(no answer)'}</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Correct: <span className="font-medium text-gray-900 dark:text-white">{q.correctAnswer}</span>
                    </p>
                  </div>
                )}

                {/* AI explanation */}
                {ans?.aiExplanation && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
                        <span className="text-sm text-gray-700 dark:text-gray-300">Mark correct</span>
                      </label>
                      {q.questionType === 'open_ended' && (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Score (0-100)"
                          value={reviews[q.id]?.score ?? ''}
                          onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: prev[q.id]?.isCorrect ?? false, comment: prev[q.id]?.comment || '', score: Number(e.target.value) } }))}
                          className="w-32 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Comment for this question..."
                      value={reviews[q.id]?.comment || ''}
                      onChange={e => setReviews(prev => ({ ...prev, [q.id]: { ...prev[q.id], isCorrect: prev[q.id]?.isCorrect ?? false, comment: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                )}

                {/* Parent comment display */}
                {ans?.parentComment && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Parent comment</p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">{ans.parentComment}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Review actions */}
        {isSubmitted && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Review this assignment</h3>

            {/* Review type toggle */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setReviewType('ai')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${reviewType === 'ai' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                AI Auto-Review
              </button>
              <button
                onClick={() => setReviewType('parent')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${reviewType === 'parent' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Review Manually
              </button>
            </div>

            {reviewType === 'parent' && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overall Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={overallScore}
                    onChange={e => setOverallScore(Number(e.target.value))}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overall Comment</label>
                  <textarea
                    value={parentComment}
                    onChange={e => setParentComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Great job! Here are some areas to focus on..."
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={reviewType === 'ai' ? handleAIReview : handleParentReview}
              disabled={reviewing}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
