'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!assignment || !token) return;
    setSubmitting(true);
    try {
      const answerList = assignment.questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] || null,
      }));
      await apiFetch(`/api/assignments/${assignment.id}/submit`, token, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      });

      // Refresh — parent will trigger review
      const data = await apiFetch(`/api/assignments/${params.id}`, token);
      setAssignment(data.assignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    }
    setSubmitting(false);
  }, [assignment, token, answers, params.id]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
    if (token && params.id) {
      apiFetch(`/api/assignments/${params.id}`, token)
        .then(data => {
          const a = data.assignment;
          setAssignment(a);
          // Pre-fill saved answers
          const saved: Record<string, string> = {};
          for (const q of a.questions) {
            if (q.answers[0]?.selectedAnswer) {
              saved[q.id] = q.answers[0].selectedAnswer;
            }
          }
          setAnswers(saved);

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
          // Auto-submit
          handleSubmit();
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleFlag = async (questionId: string, flagged: boolean) => {
    if (!assignment || !token) return;
    setFlagging(true);
    try {
      await apiFetch(`/api/assignments/${assignment.id}/flag`, token, {
        method: 'POST',
        body: JSON.stringify({ questionId, flagged, flagReason: flagged ? flagReason : null }),
      });
      const data = await apiFetch(`/api/assignments/${params.id}`, token);
      setAssignment(data.assignment);
      setFlaggingId(null);
      setFlagReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag question');
    }
    setFlagging(false);
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (!assignment) return <><Navbar /><div className="p-8 text-center text-gray-500">Assignment not found</div></>;

  const isReviewed = assignment.status === 'reviewed';
  const isSubmitted = assignment.status === 'submitted';
  const isPending = assignment.status === 'pending';
  const isActive = assignment.status === 'in_progress';
  const canAnswer = isPending || isActive;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 animate-slide-up">
          <button onClick={() => router.push('/child/dashboard')} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline mb-3 inline-block">&larr; Back to Dashboard</button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white capitalize">
                {assignment.subject.replace('_', ' ')}: {assignment.topic}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Grade {assignment.grade} | {assignment.difficulty} | {assignment.numQuestions} questions
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

        {/* Timer */}
        {timeLeft !== null && canAnswer && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-mono text-2xl font-extrabold ${
            timeLeft < 60 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 border-2 border-red-200 dark:border-red-800' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-2 border-indigo-200 dark:border-indigo-800'
          } animate-slide-up`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}

        {/* Start button for pending */}
        {isPending && (
          <div className="text-center mb-8 animate-slide-up">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8">
              <p className="text-5xl mb-4 animate-float">📝</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to begin?</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {assignment.numQuestions} questions | {assignment.difficulty}
                {assignment.timeLimitMin && ` | ${assignment.timeLimitMin} min time limit`}
              </p>
              <button onClick={startAssignment} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40">
                Start Assignment
              </button>
            </div>
          </div>
        )}

        {/* Feedback banner */}
        {isReviewed && assignment.aiFeedback && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl animate-slide-up">
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">Feedback</p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">{assignment.aiFeedback}</p>
          </div>
        )}

        {isSubmitted && (
          <div className="p-8 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl text-center animate-slide-up">
            <p className="text-5xl mb-3 animate-float">⏳</p>
            <p className="text-yellow-800 dark:text-yellow-200 font-bold text-lg">Assignment submitted!</p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">Your results will be visible once your parent reviews it.</p>
          </div>
        )}

        {/* Questions */}
        {(isActive || isReviewed) && (
          <div className="space-y-4 mb-8">
            {assignment.questions.map((q, i) => {
              const ans = q.answers[0];
              const myAnswer = answers[q.id] || '';

              return (
                <div
                  key={q.id}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-gray-900 dark:text-white font-bold">Q{i + 1}. {q.questionText}</p>
                    {isReviewed && ans?.isCorrect !== null && ans?.isCorrect !== undefined && (
                      <span className={`text-xl ml-2 ${ans.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                        {ans.isCorrect ? '✓' : '✗'}
                      </span>
                    )}
                  </div>

                  {/* Multiple Choice */}
                  {q.questionType === 'multiple_choice' && (
                    <div className="space-y-2">
                      {[
                        { key: 'A', val: q.optionA },
                        { key: 'B', val: q.optionB },
                        { key: 'C', val: q.optionC },
                        { key: 'D', val: q.optionD },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => canAnswer && setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                          disabled={!canAnswer}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                            isReviewed
                              ? opt.key === q.correctAnswer
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                : myAnswer === opt.key && !ans?.isCorrect
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                                  : 'border-gray-200/60 dark:border-gray-600/60'
                              : myAnswer === opt.key
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm shadow-indigo-500/20'
                                : 'border-gray-200/60 dark:border-gray-600/60 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                          }`}
                        >
                          <span className="font-bold">{opt.key}.</span> {opt.val}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {q.questionType === 'true_false' && (
                    <div className="flex gap-3">
                      {['True', 'False'].map(val => (
                        <button
                          key={val}
                          onClick={() => canAnswer && setAnswers(prev => ({ ...prev, [q.id]: val }))}
                          disabled={!canAnswer}
                          className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                            isReviewed
                              ? val === q.correctAnswer
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : myAnswer === val && !ans?.isCorrect
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                  : 'border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300'
                              : myAnswer === val
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200'
                                : 'border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fill in the Blank */}
                  {q.questionType === 'fill_in_blank' && (
                    <input
                      type="text"
                      value={myAnswer}
                      onChange={e => canAnswer && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      disabled={!canAnswer}
                      placeholder="Type your answer..."
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  )}

                  {/* Open Ended */}
                  {q.questionType === 'open_ended' && (
                    <textarea
                      value={myAnswer}
                      onChange={e => canAnswer && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      disabled={!canAnswer}
                      placeholder="Write your response..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-60 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  )}

                  {/* Review info */}
                  {isReviewed && (
                    <div className="mt-3 space-y-2">
                      {q.questionType !== 'open_ended' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Correct answer: <span className="font-bold text-green-600 dark:text-green-400">{q.correctAnswer}</span>
                        </p>
                      )}
                      {ans?.aiScore !== null && ans?.aiScore !== undefined && (
                        <p className="text-sm text-gray-500">AI Score: {ans.aiScore}/100</p>
                      )}
                      {ans?.aiExplanation && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <p className="text-sm text-blue-800 dark:text-blue-200">{ans.aiExplanation}</p>
                        </div>
                      )}
                      {ans?.parentComment && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">Parent says:</p>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">{ans.parentComment}</p>
                        </div>
                      )}

                      {/* Flag for review */}
                      {ans?.flagged && !ans.flagResolvedAt && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Flagged for parent review</p>
                          {ans.flagReason && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{ans.flagReason}</p>}
                          <button
                            onClick={() => handleFlag(q.id, false)}
                            disabled={flagging}
                            className="mt-2 text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold"
                          >
                            Remove flag
                          </button>
                        </div>
                      )}
                      {ans?.flagged && ans.flagResolvedAt && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                          <p className="text-sm font-bold text-green-800 dark:text-green-200">Reviewed by parent</p>
                        </div>
                      )}
                      {(!ans?.flagged || ans?.flagResolvedAt) && (
                        <div>
                          {flaggingId === q.id ? (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2">
                              <input
                                type="text"
                                value={flagReason}
                                onChange={e => setFlagReason(e.target.value)}
                                placeholder="Why do you think this is wrong? (optional)"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleFlag(q.id, true)}
                                  disabled={flagging}
                                  className="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all"
                                >
                                  {flagging ? 'Submitting...' : 'Submit Flag'}
                                </button>
                                <button
                                  onClick={() => { setFlaggingId(null); setFlagReason(''); }}
                                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setFlaggingId(q.id)}
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
                            >
                              Flag for review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        {isActive && (
          <div className="flex gap-3 sticky bottom-4">
            {!assignment.timeLimitMin && (
              <button
                onClick={saveProgress}
                disabled={saving}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
            >
              {submitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </main>
    </>
  );
}
