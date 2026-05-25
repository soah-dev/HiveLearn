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

const questionTypeOptions = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'open_ended', label: 'Open Ended' },
];

const cadenceOptions = [
  { value: '1,2,3,4,5', label: 'Weekdays (Mon-Fri)' },
  { value: '0,1,2,3,4,5,6', label: 'Every Day' },
  { value: '1,3,5', label: 'Mon / Wed / Fri' },
  { value: '2,4', label: 'Tue / Thu' },
  { value: '0,6', label: 'Weekends' },
];

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Child {
  id: string;
  name: string | null;
  email: string;
}

interface Preset {
  id: string;
  childId: string;
  grade: number;
  subject: string;
  topic: string | null;
  difficulty: string;
  numQuestions: number;
  questionTypes: string;
  timeLimitMin: number | null;
  reviewMode: string;
  daysOfWeek: string;
  active: boolean;
  lastGeneratedAt: string | null;
  createdAt: string;
  child: { id: string; name: string | null; email: string };
}

export default function PresetsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [childId, setChildId] = useState('');
  const [grade, setGrade] = useState(6);
  const [subject, setSubject] = useState('math');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [timeLimitMin, setTimeLimitMin] = useState<number | null>(null);
  const [daysOfWeek, setDaysOfWeek] = useState('1,2,3,4,5');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/');
      return;
    }
    if (token) {
      Promise.all([
        apiFetch('/api/parent/children', token),
        apiFetch('/api/presets', token),
      ]).then(([childrenData, presetsData]) => {
        setChildren(childrenData.children || []);
        setPresets(presetsData.presets || []);
        if (childrenData.children?.length > 0) setChildId(childrenData.children[0].id);
        setDataLoading(false);
      }).catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  const handleCreate = async () => {
    if (!childId) { setError('Select a child'); return; }
    setError('');
    setSaving(true);

    try {
      const data = await apiFetch('/api/presets', token, {
        method: 'POST',
        body: JSON.stringify({
          childId, grade, subject, topic: topic || null, difficulty,
          numQuestions, questionTypes: [questionType], timeLimitMin,
          reviewMode: 'ai', daysOfWeek,
        }),
      });
      setPresets(prev => [data.preset, ...prev]);
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create preset');
    }
    setSaving(false);
  };

  const togglePreset = async (id: string, active: boolean) => {
    try {
      const data = await apiFetch(`/api/presets/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ active: !active }),
      });
      setPresets(prev => prev.map(p => p.id === id ? data.preset : p));
    } catch {
      // silently fail
    }
  };

  const deletePreset = async (id: string) => {
    try {
      await apiFetch(`/api/presets/${id}`, token, { method: 'DELETE' });
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch {
      // silently fail
    }
  };

  const resetForm = () => {
    setSubject('math');
    setTopic('');
    setDifficulty('medium');
    setNumQuestions(5);
    setQuestionType('multiple_choice');
    setTimeLimitMin(null);
    setDaysOfWeek('1,2,3,4,5');
    setError('');
  };

  const formatDays = (days: string) => {
    const match = cadenceOptions.find(o => o.value === days);
    if (match) return match.label;
    return days.split(',').map(d => dayLabels[Number(d)]).join(', ');
  };

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Assignment Presets</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Auto-generate assignments on a schedule</p>
          </div>
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            + New Preset
          </button>
        </div>

        {/* Presets List */}
        {presets.length === 0 && !showForm ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center">
            <p className="text-5xl mb-3">🔄</p>
            <p className="text-gray-500 dark:text-gray-400">No presets yet. Create one to auto-generate assignments on a schedule.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {presets.map(preset => (
              <div
                key={preset.id}
                className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border ${preset.active ? 'border-gray-200/60 dark:border-gray-700/60' : 'border-gray-300/40 dark:border-gray-700/40 opacity-60'} p-5 card-hover`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                    {preset.subject.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePreset(preset.id, preset.active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preset.active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preset.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="text-red-400 hover:text-red-600 text-sm font-bold"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                  {preset.numQuestions} questions for {preset.child.name || preset.child.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-2">
                  Grade {preset.grade} · {preset.difficulty} · {preset.questionTypes.replace(/,/g, ', ').replace(/_/g, ' ')}
                </p>
                {preset.topic && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Topic: {preset.topic}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400">
                    {formatDays(preset.daysOfWeek)}
                  </span>
                  {preset.lastGeneratedAt && (
                    <span className="text-xs text-gray-400">
                      Last: {new Date(preset.lastGeneratedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/50 dark:border-gray-700/50 animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">New Preset</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Child</label>
                  <select value={childId} onChange={e => setChildId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                    {children.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                    <select value={grade} onChange={e => setGrade(Number(e.target.value))} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Topic (optional)</label>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Fractions, World War II" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Questions</label>
                    <select value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      {[3,5,7,10,15].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Question Type</label>
                    <select value={questionType} onChange={e => setQuestionType(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      {questionTypeOptions.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Time Limit</label>
                    <select value={timeLimitMin ?? ''} onChange={e => setTimeLimitMin(e.target.value ? Number(e.target.value) : null)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      <option value="">No limit</option>
                      <option value="5">5 min</option>
                      <option value="10">10 min</option>
                      <option value="15">15 min</option>
                      <option value="20">20 min</option>
                      <option value="30">30 min</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Schedule</label>
                  <select value={daysOfWeek} onChange={e => setDaysOfWeek(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                    {cadenceOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Assignments will be ready to generate on these days when you visit your dashboard.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={saving || !childId}
                className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
              >
                {saving ? 'Creating...' : 'Create Preset'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
