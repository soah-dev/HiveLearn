'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { DIFFICULTIES, GRADES, SUBJECTS, subjectLabel } from '@/lib/subjects';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import Page, { PageLoader } from '@/components/ui/Page';
import { ListCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Switch from '@/components/ui/Switch';
import SubjectIcon from '@/components/ui/SubjectIcon';
import DifficultyMeter from '@/components/ui/DifficultyMeter';
import { Field, Input, Select } from '@/components/ui/Field';

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

  if (loading || dataLoading) return <PageLoader />;

  const openForm = () => { setShowForm(true); resetForm(); };

  return (
    <Page width="medium">
      <PageHeader
        title="Scheduled assignments"
        subtitle="Presets auto-generate assignments on the days you choose"
        actions={
          <Button onClick={openForm} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>New preset</Button>
        }
      />

      {/* Presets List */}
      {presets.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No presets yet"
          description="A preset generates a fresh assignment for a child on the days you pick, so you don't have to create them by hand."
          action={<Button onClick={openForm}>Create a preset</Button>}
        />
      ) : (
        <ListCard>
          {presets.map(preset => (
            <li key={preset.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              {/* A paused preset stays in the list, dimmed */}
              <div className={cn('flex min-w-0 flex-1 items-center gap-3.5', !preset.active && 'opacity-60')}>
                <SubjectIcon subject={preset.subject} tone={preset.active ? 'soft' : 'muted'} />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-ink sm:truncate">
                    {subjectLabel(preset.subject)}
                    {preset.topic && <span className="font-normal text-ink-muted"> · {preset.topic}</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                    <span className="font-medium text-ink">{preset.child.name || preset.child.email}</span>
                    <span>{preset.numQuestions} questions</span>
                    <DifficultyMeter difficulty={preset.difficulty} />
                    <span>Grade {preset.grade}</span>
                    <span className="capitalize">{preset.questionTypes.replace(/,/g, ', ').replace(/_/g, ' ')}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium text-brand-text">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDays(preset.daysOfWeek)}
                    </span>
                    {preset.lastGeneratedAt && (
                      <span className="text-ink-subtle">Last generated {new Date(preset.lastGeneratedAt).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
              </div>
              <Switch
                checked={preset.active}
                onChange={() => togglePreset(preset.id, preset.active)}
                label={`${subjectLabel(preset.subject)} preset active`}
              />
              <button
                onClick={() => deletePreset(preset.id)}
                aria-label="Delete preset"
                title="Delete preset"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-bad-soft hover:text-bad-text"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ListCard>
      )}

      {/* Create Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New preset" size="lg">
        <div className="space-y-4">
          <Field label="Child" htmlFor="preset-child">
            <Select id="preset-child" value={childId} onChange={e => setChildId(e.target.value)}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Grade" htmlFor="preset-grade">
              <Select id="preset-grade" value={grade} onChange={e => setGrade(Number(e.target.value))}>
                {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </Select>
            </Field>
            <Field label="Subject" htmlFor="preset-subject">
              <Select id="preset-subject" value={subject} onChange={e => setSubject(e.target.value)}>
                {SUBJECTS.map(sub => <option key={sub.value} value={sub.value}>{sub.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Topic" htmlFor="preset-topic" optional>
            <Input id="preset-topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Fractions, World War II" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Difficulty" htmlFor="preset-difficulty">
              <Select id="preset-difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Questions" htmlFor="preset-questions">
              <Select id="preset-questions" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}>
                {[3, 5, 7, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Question type" htmlFor="preset-type">
              <Select id="preset-type" value={questionType} onChange={e => setQuestionType(e.target.value)}>
                {questionTypeOptions.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
              </Select>
            </Field>
            <Field label="Time limit" htmlFor="preset-time">
              <Select id="preset-time" value={timeLimitMin ?? ''} onChange={e => setTimeLimitMin(e.target.value ? Number(e.target.value) : null)}>
                <option value="">No limit</option>
                <option value="5">5 min</option>
                <option value="10">10 min</option>
                <option value="15">15 min</option>
                <option value="20">20 min</option>
                <option value="30">30 min</option>
              </Select>
            </Field>
          </div>

          <Field label="Schedule" htmlFor="preset-schedule" hint="Assignments will be ready to generate on these days when you visit your dashboard.">
            <Select id="preset-schedule" value={daysOfWeek} onChange={e => setDaysOfWeek(e.target.value)}>
              {cadenceOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>

          {error && <Alert>{error}</Alert>}

          <Button size="lg" block onClick={handleCreate} loading={saving} disabled={!childId}>
            {saving ? 'Creating…' : 'Create preset'}
          </Button>
        </div>
      </Modal>
    </Page>
  );
}
