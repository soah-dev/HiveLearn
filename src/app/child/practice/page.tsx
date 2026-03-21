'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

const subjects = [
  { value: 'math', label: 'Math' },
  { value: 'reading', label: 'Reading' },
  { value: 'science', label: 'Science' },
  { value: 'history', label: 'History' },
  { value: 'english', label: 'English' },
  { value: 'geography', label: 'Geography' },
  { value: 'art', label: 'Art' },
  { value: 'music', label: 'Music' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'foreign_languages', label: 'Foreign Languages' },
];

interface PracticeSession {
  id: string;
  subject: string;
  topic: string | null;
  grade: number;
  difficulty: string;
  status: string;
  score: number | null;
  pointsAwarded: number | null;
  createdAt: string;
}

export default function PracticePage() {
  const { user, token, loading } = useAuth();
  const childGrade = (user as { grade?: number | null })?.grade ?? 1;
  const router = useRouter();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [grade, setGrade] = useState(childGrade);
  const [subject, setSubject] = useState('math');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
    if (token) {
      apiFetch('/api/practice', token)
        .then(data => { setSessions(data.sessions || []); setDataLoading(false); })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const handleStart = async () => {
    setGenerating(true);
    setError('');
    try {
      const data = await apiFetch('/api/practice', token, {
        method: 'POST',
        body: JSON.stringify({ grade, subject, topic: topic.trim() || null, difficulty }),
      });
      router.push(`/child/practice/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate practice');
      setGenerating(false);
    }
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Generate questions and practice on your own</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setError(''); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            + New Session
          </button>
        </div>

        {/* New Session Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Practice Session</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade Level</label>
                <select value={grade} onChange={e => setGrade(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                    <option key={g} value={g} disabled={g < childGrade}>
                      Grade {g}{g < childGrade ? ' (below your grade)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g., Fractions, The Solar System, Grammar..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
              <div className="flex gap-3">
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-2 rounded-lg font-medium capitalize transition-colors ${difficulty === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={generating}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {generating ? <><LoadingSpinner size="sm" /> Generating questions...</> : 'Start Practice'}
            </button>
          </div>
        )}

        {/* Past Sessions */}
        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-4xl mb-3">🧠</p>
            <p className="text-gray-500 dark:text-gray-400">No practice sessions yet. Start one to begin!</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Past Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/child/practice/${s.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 capitalize">{s.subject.replace('_', ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {s.status === 'completed' ? 'Done' : 'In Progress'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{s.topic || `Grade ${s.grade} ${s.subject.replace('_', ' ')}`}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-3">{s.difficulty} · Grade {s.grade}</p>
                  {s.status === 'completed' && s.score !== null && (
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-bold ${s.score >= 80 ? 'text-green-600' : s.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {s.score}%
                      </span>
                      {s.pointsAwarded && <span className="text-xs text-indigo-600 dark:text-indigo-400">+{s.pointsAwarded} pts</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
