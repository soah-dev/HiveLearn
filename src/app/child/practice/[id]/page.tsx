'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PracticeQuestion {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  orderIndex: number;
  answers: Array<{ selectedAnswer: string | null; isCorrect: boolean | null }>;
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
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; pointsAwarded: number; correct: number; total: number } | null>(null);
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
          // Pre-fill saved answers
          const saved: Record<string, string> = {};
          for (const q of data.session.questions) {
            if (q.answers[0]?.selectedAnswer) saved[q.id] = q.answers[0].selectedAnswer;
          }
          setAnswers(saved);
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router, params.id]);

  const handleSubmit = async () => {
    if (!session || !token) return;
    setSubmitting(true);
    setError('');
    try {
      const answerList = session.questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] || null,
      }));
      const data = await apiFetch(`/api/practice/${session.id}/submit`, token, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      });
      setResult(data);
      // Refresh session to show correct answers
      const refreshed = await apiFetch(`/api/practice/${session.id}`, token);
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
        <div className="mb-6">
          <button onClick={() => router.push('/child/practice')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-2">&larr; Back to Practice</button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {session.subject.replace('_', ' ')}{session.topic ? `: ${session.topic}` : ''}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">Grade {session.grade} · {session.difficulty} · 10 questions</p>
            </div>
            {isCompleted && session.score !== null && (
              <div className="text-right">
                <p className={`text-4xl font-bold ${session.score >= 80 ? 'text-green-600' : session.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {session.score}%
                </p>
                {session.pointsAwarded && <p className="text-sm text-indigo-600 dark:text-indigo-400">+{session.pointsAwarded} pts</p>}
              </div>
            )}
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div className="mb-6 p-5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-200 mb-1">{result.correct}/{result.total} correct</p>
            <p className="text-indigo-600 dark:text-indigo-300">You earned <strong>+{result.pointsAwarded} points</strong>!</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4 mb-8">
          {session.questions.map((q, i) => {
            const ans = q.answers[0];
            const myAnswer = answers[q.id] || '';

            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-gray-900 dark:text-white font-medium">Q{i + 1}. {q.questionText}</p>
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
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        isCompleted
                          ? opt.key === q.correctAnswer
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : myAnswer === opt.key && !ans?.isCorrect
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                          : myAnswer === opt.key
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200'
                            : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                      }`}
                    >
                      <span className="font-medium">{opt.key}.</span> {opt.val}
                    </button>
                  ))}
                </div>

                {isCompleted && myAnswer !== q.correctAnswer && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Correct answer: <span className="font-medium text-green-600 dark:text-green-400">{q.correctAnswer}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!isCompleted && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Practice'}
          </button>
        )}

        {isCompleted && (
          <button
            onClick={() => router.push('/child/practice')}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Start Another Session
          </button>
        )}
      </main>
    </>
  );
}
