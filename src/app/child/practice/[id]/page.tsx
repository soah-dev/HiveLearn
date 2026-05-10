'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import MathText from '@/components/MathText';

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
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
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

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (!session) return <><Navbar /><div className="p-8 text-center text-gray-500">Session not found</div></>;

  const isCompleted = session.status === 'completed';

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 animate-slide-up">
          <button onClick={() => router.push('/child/practice')} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline mb-3 inline-block">&larr; Back to Practice</button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white capitalize">
                {session.subject.replace('_', ' ')}{session.topic ? `: ${session.topic}` : ''}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">Grade {session.grade} · {session.difficulty} · 10 questions</p>
            </div>
            {isCompleted && session.score !== null && (
              <div className="text-right">
                <p className={`text-4xl font-extrabold ${session.score >= 80 ? 'text-green-600' : session.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {session.score}%
                </p>
                {session.pointsAwarded && <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">+{session.pointsAwarded} pts</p>}
              </div>
            )}
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl text-center animate-slide-up">
            <p className="text-3xl font-extrabold text-indigo-800 dark:text-indigo-200 mb-1">{result.correct}/{result.total} correct</p>
            <p className="text-indigo-600 dark:text-indigo-300 font-medium">You earned <strong>+{result.pointsAwarded} points</strong>!</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4 mb-8">
          {session.questions.map((q, i) => {
            const ans = q.answers[0];
            const myAnswer = answers[q.id] || '';

            return (
              <div
                key={q.id}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <p className="text-gray-900 dark:text-white font-bold">Q{i + 1}. <MathText text={q.questionText} /></p>
                  {isCompleted && ans?.isCorrect !== null && ans?.isCorrect !== undefined && (
                    <span className={`text-xl ml-2 flex-shrink-0 ${ans.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                      {ans.isCorrect ? '✓' : '✗'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'A', val: q.optionA },
                    { key: 'B', val: q.optionB },
                    { key: 'C', val: q.optionC },
                    { key: 'D', val: q.optionD },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => !isCompleted && setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                      disabled={isCompleted}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        isCompleted
                          ? opt.key === q.correctAnswer
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : myAnswer === opt.key && !ans?.isCorrect
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              : 'border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300'
                          : myAnswer === opt.key
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 shadow-sm shadow-indigo-500/20'
                            : 'border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                      }`}
                    >
                      <span className="font-bold">{opt.key}.</span> {opt.val && <MathText text={opt.val} />}
                    </button>
                  ))}
                </div>

                {/* Flag checkbox - disabled for practice to prevent abuse
                {!isCompleted && (
                  <label className="flex items-center gap-2 mt-4 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isFlagged}
                      onChange={e => setFlags(prev => ({ ...prev, [q.id]: e.target.checked }))}
                      className="rounded border-amber-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-medium group-hover:underline">
                      Flag this question (will be excluded from scoring)
                    </span>
                  </label>
                )}
                {!isCompleted && isFlagged && (
                  <p className="mt-1 ml-6 text-xs text-amber-600 dark:text-amber-400">
                    This question will be disregarded from scoring
                  </p>
                )}
                */}

                {/* After completion: show correct answer */}
                {isCompleted && myAnswer !== q.correctAnswer && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Correct answer: <span className="font-bold text-green-600 dark:text-green-400"><MathText text={q.correctAnswer} /></span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!isCompleted && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
          >
            {submitting ? 'Submitting...' : 'Submit Practice'}
          </button>
        )}

        {isCompleted && (
          <button
            onClick={() => router.push('/child/practice')}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25"
          >
            Start Another Session
          </button>
        )}
      </main>
    </>
  );
}
