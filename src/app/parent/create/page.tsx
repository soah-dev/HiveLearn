'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import MathText from '@/components/MathText';

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

const questionTypes = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'open_ended', label: 'Open Ended' },
];

interface Child {
  id: string;
  name: string | null;
  email: string;
}

interface GeneratedQuestion {
  question_type: string;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
}

export default function CreateAssignment() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [grade, setGrade] = useState(6);
  const [subject, setSubject] = useState('math');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['multiple_choice']);
  const [numQuestions, setNumQuestions] = useState(5);
  const [timeLimitMin, setTimeLimitMin] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'preview'>('form');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
      return;
    }
    if (token) {
      apiFetch('/api/parent/children', token).then(data => {
        setChildren(data.children || []);
        if (data.children?.length > 0) setChildId(data.children[0].id);
      });
    }
  }, [user, token, loading, router]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) { setError('Select at least one question type'); return; }
    setError('');
    setGenerating(true);

    try {
      const data = await apiFetch('/api/ai/generate', token, {
        method: 'POST',
        body: JSON.stringify({
          grade, subject, topic, difficulty, numQuestions, questionTypes: selectedTypes,
        }),
      });
      setQuestions(data.questions);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    }
    setGenerating(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const mapped = questions.map(q => ({
        questionType: q.question_type,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: q.correct_answer,
      }));

      await apiFetch('/api/assignments', token, {
        method: 'POST',
        body: JSON.stringify({
          childId, grade, subject, topic, difficulty, numQuestions: questions.length,
          timeLimitMin, reviewMode: 'ai', questions: mapped,
        }),
      });
      router.push('/parent/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
    setPublishing(false);
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  if (loading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Create Assignment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Generate AI-powered questions for your child</p>
        </div>

        {step === 'form' ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-8 animate-slide-up">
            <div className="space-y-6">
              {/* Child Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Assign to</label>
                {children.length === 0 ? (
                  <p className="text-sm text-red-500">No children linked. Generate an invite code first.</p>
                ) : (
                  <select value={childId} onChange={e => setChildId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                    {children.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
                  </select>
                )}
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Grade Level</label>
                <select value={grade} onChange={e => setGrade(Number(e.target.value))} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  {[6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Topic <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., Pythagorean Theorem, Photosynthesis, World War II"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                <div className="flex gap-3">
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-3 rounded-xl font-bold capitalize transition-all ${difficulty === d ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Question Types</label>
                <div className="flex flex-wrap gap-2">
                  {questionTypes.map(qt => (
                    <button key={qt.value} onClick={() => toggleType(qt.value)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedTypes.includes(qt.value) ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {qt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Number of Questions</label>
                <div className="flex gap-3">
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setNumQuestions(n)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${numQuestions === n ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Time Limit</label>
                <select value={timeLimitMin ?? ''} onChange={e => setTimeLimitMin(e.target.value ? Number(e.target.value) : null)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  <option value="">No time limit</option>
                  {[10, 15, 20, 30, 45, 60].map(t => <option key={t} value={t}>{t} minutes</option>)}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-slide-up">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || children.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 flex items-center justify-center gap-2"
              >
                {generating ? <><LoadingSpinner size="sm" /> Generating with AI...</> : 'Generate Questions'}
              </button>
            </div>
          </div>
        ) : (
          /* Preview Step */
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preview & Edit Questions</h2>
              <button onClick={() => setStep('form')} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                &larr; Back to form
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {questions.map((q, i) => (
                <div key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 capitalize px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                      Q{i + 1} · {q.question_type.replace('_', ' ')}
                    </span>
                  </div>
                  <textarea
                    value={q.question_text}
                    onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    rows={2}
                  />
                  {q.question_type === 'multiple_choice' && (
                    <div className="grid grid-cols-2 gap-2">
                      {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt, oi) => (
                        <input
                          key={opt}
                          value={q[opt] || ''}
                          onChange={e => updateQuestion(i, opt, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Correct Answer</label>
                    <input
                      value={q.correct_answer}
                      onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mt-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={generating} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                {generating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button onClick={handlePublish} disabled={publishing} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25">
                {publishing ? 'Publishing...' : 'Push to Child'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
