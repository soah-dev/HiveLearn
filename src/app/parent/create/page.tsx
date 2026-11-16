'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { DIFFICULTIES, GRADES, SUBJECTS } from '@/lib/subjects';
import MathText from '@/components/MathText';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import Page, { PageLoader } from '@/components/ui/Page';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Pill from '@/components/ui/Pill';
import Hexagon from '@/components/ui/Hexagon';
import { Chips } from '@/components/ui/Choice';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';

const questionTypes = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'open_ended', label: 'Open Ended' },
];

const subjectQuestionTypes: Record<string, string[]> = {
  math: ['multiple_choice', 'fill_in_blank', 'true_false'],
  reading: ['multiple_choice', 'true_false', 'open_ended'],
  science: ['multiple_choice', 'true_false', 'fill_in_blank', 'open_ended'],
  history: ['multiple_choice', 'true_false', 'open_ended'],
  english: ['multiple_choice', 'fill_in_blank', 'open_ended'],
  geography: ['multiple_choice', 'true_false', 'fill_in_blank'],
  art: ['multiple_choice', 'open_ended'],
  music: ['multiple_choice', 'true_false', 'open_ended'],
  computer_science: ['multiple_choice', 'fill_in_blank', 'true_false'],
  foreign_languages: ['multiple_choice', 'fill_in_blank', 'open_ended'],
};

const questionCounts = [5, 10, 15, 20].map(n => ({ value: n, label: String(n) }));

const steps = [
  { key: 'form', label: 'Choose' },
  { key: 'preview', label: 'Review & send' },
] as const;

interface Child {
  id: string;
  name: string | null;
  email: string;
  grade: number | null;
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
  const [selectedType, setSelectedType] = useState('multiple_choice');
  const [numQuestions, setNumQuestions] = useState(5);
  const [timeLimitMin, setTimeLimitMin] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'preview'>('form');

  useEffect(() => {
    if (token) {
      apiFetch('/api/parent/children', token).then(data => {
        setChildren(data.children || []);
        if (data.children?.length > 0) {
          setChildId(data.children[0].id);
          if (data.children[0].grade) setGrade(data.children[0].grade);
        }
      });
    }
  }, [user, token, loading, router]);

  const typesForSubject = (s: string) =>
    questionTypes.filter(qt => (subjectQuestionTypes[s] || ['multiple_choice']).includes(qt.value));
  const availableTypes = typesForSubject(subject);

  // The selected child's grade is the minimum allowed — can't assign below their grade level
  const childGrade = children.find(c => c.id === childId)?.grade ?? 1;

  // Selecting a child snaps the grade to that child's grade level
  const handleChildChange = (id: string) => {
    setChildId(id);
    const child = children.find(c => c.id === id);
    if (child?.grade) setGrade(child.grade);
  };

  // Changing subject resets the question type if the current one isn't offered for it
  const handleSubjectChange = (s: string) => {
    setSubject(s);
    const valid = typesForSubject(s);
    if (!valid.some(qt => qt.value === selectedType) && valid.length > 0) {
      setSelectedType(valid[0].value);
    }
  };

  const handleGenerate = async () => {
    if (!selectedType) { setError('Select a question type'); return; }
    setError('');
    setGenerating(true);

    try {
      const data = await apiFetch('/api/ai/generate', token, {
        method: 'POST',
        body: JSON.stringify({
          childId, grade, subject, topic, difficulty, numQuestions, questionTypes: [selectedType],
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

  if (loading) return <PageLoader />;

  const stepIndex = steps.findIndex(st => st.key === step);

  return (
    <Page width="narrow">
      <PageHeader
        title="Create assignment"
        subtitle={step === 'form' ? 'Choose what to generate.' : 'Review, edit, then send to your child.'}
      />

      {/* Where you are in the two steps */}
      <ol className="mb-6 flex items-center gap-3 text-sm">
        {steps.map((st, i) => (
          <li key={st.key} className="flex items-center gap-2" aria-current={i === stepIndex ? 'step' : undefined}>
            {i > 0 && <span className="mr-1 h-px w-6 bg-line-strong sm:w-10" aria-hidden="true" />}
            <Hexagon size={28} tone={i <= stepIndex ? 'brand' : 'muted'}>
              {i < stepIndex
                ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
                : <span className="text-xs font-bold">{i + 1}</span>}
            </Hexagon>
            <span className={i === stepIndex ? 'font-semibold text-ink' : 'text-ink-muted'}>{st.label}</span>
          </li>
        ))}
      </ol>

      {step === 'form' ? (
        <Card>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              {/* Child Selection */}
              <Field label="Assign to" htmlFor="create-child">
                {children.length === 0 ? (
                  <Alert tone="warn">
                    No children linked yet. <Link href="/parent/dashboard" className="font-semibold underline">Add a child</Link> from your dashboard first.
                  </Alert>
                ) : (
                  <Select id="create-child" value={childId} onChange={e => handleChildChange(e.target.value)}>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
                  </Select>
                )}
              </Field>

              {/* Grade */}
              <Field label="Grade level" htmlFor="create-grade">
                <Select id="create-grade" value={grade} onChange={e => setGrade(Number(e.target.value))}>
                  {GRADES.map(g => (
                    <option key={g} value={g} disabled={g < childGrade}>
                      Grade {g}{g < childGrade ? ' (below grade level)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Subject */}
              <Field label="Subject" htmlFor="create-subject">
                <Select id="create-subject" value={subject} onChange={e => handleSubjectChange(e.target.value)}>
                  {SUBJECTS.map(sub => <option key={sub.value} value={sub.value}>{sub.label}</option>)}
                </Select>
              </Field>

              {/* Time Limit */}
              <Field label="Time limit" htmlFor="create-time">
                <Select id="create-time" value={timeLimitMin ?? ''} onChange={e => setTimeLimitMin(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">No time limit</option>
                  {[10, 15, 20, 30, 45, 60].map(t => <option key={t} value={t}>{t} minutes</option>)}
                </Select>
              </Field>
            </div>

            {/* Topic */}
            <Field label="Topic" htmlFor="create-topic" optional>
              <Input
                id="create-topic"
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g., Pythagorean Theorem, Photosynthesis, World War II"
              />
            </Field>

            {/* Difficulty */}
            <Field label="Difficulty">
              <Chips label="Difficulty" block value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
            </Field>

            {/* Question Type */}
            <Field label="Question type">
              <Chips label="Question type" value={selectedType} onChange={setSelectedType} options={availableTypes} />
            </Field>

            {/* Number of Questions */}
            <Field label="Number of questions">
              <Chips label="Number of questions" block value={numQuestions} onChange={setNumQuestions} options={questionCounts} />
            </Field>

            {error && <Alert>{error}</Alert>}

            <Button size="lg" block onClick={handleGenerate} loading={generating} disabled={children.length === 0}>
              {generating ? 'Generating questions…' : 'Generate questions'}
            </Button>
          </div>
        </Card>
      ) : (
        /* Preview Step */
        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Preview &amp; edit questions</h2>
              <p className="mt-1 text-sm text-ink-muted">The preview shows what your child will see. Edit the raw text below it; math wrapped in $...$ renders automatically.</p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 self-start" onClick={() => setStep('form')} icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
              Back to form
            </Button>
          </div>

          <div className="mb-6 space-y-4">
            {questions.map((q, i) => (
              <Card key={i}>
                <Pill className="mb-3 capitalize">Q{i + 1} · {q.question_type.replace(/_/g, ' ')}</Pill>

                {/* Rendered preview — exactly how the child page will display it */}
                <div className="mb-4 rounded-xl bg-muted p-4">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Preview</p>
                  <p className="font-medium text-ink"><MathText text={q.question_text} /></p>
                  {q.question_type === 'multiple_choice' && (
                    <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm text-ink-muted sm:grid-cols-2">
                      {([['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d]] as const).map(([letter, val]) => (
                        <li key={letter} className={q.correct_answer?.toUpperCase().trim() === letter ? 'font-medium text-good-text' : ''}>
                          <span className="font-bold">{letter}.</span> {val ? <MathText text={val} /> : <span className="text-ink-subtle">(empty)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.question_type !== 'multiple_choice' && q.correct_answer && (
                    <p className="mt-2 text-sm font-medium text-good-text">
                      {q.question_type === 'open_ended' ? 'Rubric: ' : 'Answer: '}<MathText text={q.correct_answer} />
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Textarea
                    aria-label={`Question ${i + 1} text`}
                    value={q.question_text}
                    onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                  {q.question_type === 'multiple_choice' && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt, oi) => (
                        <Input
                          key={opt}
                          controlSize="sm"
                          aria-label={`Question ${i + 1} option ${String.fromCharCode(65 + oi)}`}
                          value={q[opt] || ''}
                          onChange={e => updateQuestion(i, opt, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        />
                      ))}
                    </div>
                  )}
                  <Field label="Correct answer" htmlFor={`correct-${i}`}>
                    <Input
                      id={`correct-${i}`}
                      controlSize="sm"
                      value={q.correct_answer}
                      onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            ))}
          </div>

          {error && <Alert className="mb-4">{error}</Alert>}

          {/* Floats above the phone tab bar */}
          <div className="sticky bottom-[5.5rem] flex flex-col-reverse gap-2 rounded-2xl border border-line bg-surface p-3 shadow-pop sm:flex-row lg:bottom-4">
            <Button variant="secondary" className="flex-1" onClick={handleGenerate} loading={generating}>
              {generating ? 'Regenerating…' : 'Regenerate'}
            </Button>
            <Button className="flex-1" onClick={handlePublish} loading={publishing}>
              {publishing ? 'Sending…' : 'Send to child'}
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
