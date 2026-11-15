'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { BookOpen, Calculator, ChartColumn, ChevronDown, ChevronUp, Coffee, Gauge, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import SATTimer from '@/components/sat/SATTimer';
import SATModuleHeader from '@/components/sat/SATModuleHeader';
import SATQuestionNav, { navStateClass } from '@/components/sat/SATQuestionNav';
import SATQuestionView from '@/components/sat/SATQuestionView';
import SATScoreCard from '@/components/sat/SATScoreCard';
import PageHeader from '@/components/PageHeader';
import Page, { PageLoader, PageMessage } from '@/components/ui/Page';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Hexagon from '@/components/ui/Hexagon';
import { toneTextClass } from '@/components/ui/Pill';

interface SATAnswer {
  selectedAnswer: string | null;
  isCorrect: boolean | null;
}

interface SATQuestion {
  id: string;
  questionType: string;
  passage: string | null;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer?: string;
  domain: string;
  orderIndex: number;
  answers: SATAnswer[];
}

interface SATModule {
  id: string;
  section: string;
  moduleNumber: number;
  difficulty: string;
  numQuestions: number;
  timeLimitMin: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  rawScore: number | null;
  questions: SATQuestion[];
}

interface SATSession {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  breakStartedAt: string | null;
  rwMod2Difficulty: string | null;
  mathMod2Difficulty: string | null;
  rwScaledScore: number | null;
  mathScaledScore: number | null;
  compositeScore: number | null;
  pointsAwarded: number | null;
  modules: SATModule[];
}

export default function SATSessionPage() {
  const { user, token, getToken, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [session, setSession] = useState<SATSession | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  const fetchSession = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch(`/api/sat/sessions/${params.id}`, token);
      setSession(data.session);

      // Pre-fill answers from existing data
      const saved: Record<string, string> = {};
      for (const mod of data.session.modules) {
        for (const q of mod.questions) {
          if (q.answers[0]?.selectedAnswer) {
            saved[q.id] = q.answers[0].selectedAnswer;
          }
        }
      }
      setAnswers(saved);
    } catch {
      setError('Failed to load session');
    }
    setDataLoading(false);
  }, [token, params.id]);

  useEffect(() => {
    if (token) fetchSession();
  }, [user, token, loading, router, fetchSession]);

  const getActiveModule = (): SATModule | null => {
    if (!session) return null;
    const statusToModule: Record<string, { section: string; mod: number }> = {
      rw_mod1: { section: 'rw', mod: 1 },
      rw_mod2: { section: 'rw', mod: 2 },
      math_mod1: { section: 'math', mod: 1 },
      math_mod2: { section: 'math', mod: 2 },
    };
    const target = statusToModule[session.status];
    if (!target) return null;
    return session.modules.find(m => m.section === target.section && m.moduleNumber === target.mod) || null;
  };

  const handleStartModule = async (section: string, moduleNumber: number) => {
    if (!token || !session) return;
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/api/sat/sessions/${session.id}/start-module`, token, {
        method: 'POST',
        body: JSON.stringify({ section, moduleNumber }),
      });
      setCurrentIndex(0);
      await fetchSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start module');
    }
    setActionLoading(false);
  };

  const handleSaveProgress = async () => {
    const mod = getActiveModule();
    if (!mod || !token || !session) return;
    try {
      const answerList = mod.questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] || null,
      }));
      await apiFetch(`/api/sat/sessions/${session.id}/save-progress`, token, {
        method: 'POST',
        body: JSON.stringify({ moduleId: mod.id, answers: answerList }),
      });
    } catch {
      // silent save
    }
  };

  const handleSubmitModule = useCallback(async (skipConfirm = false) => {
    const mod = getActiveModule();
    if (!mod || !session) return;
    const freshToken = await getToken();
    if (!freshToken) return;

    if (!skipConfirm) {
      const unanswered = mod.questions.filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        const confirmed = window.confirm(`You have ${unanswered.length} unanswered question${unanswered.length > 1 ? 's' : ''}. Submit anyway?`);
        if (!confirmed) return;
      }
    }

    setActionLoading(true);
    setError('');
    try {
      const answerList = mod.questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] || null,
      }));
      await apiFetch(`/api/sat/sessions/${session.id}/submit-module`, freshToken, {
        method: 'POST',
        body: JSON.stringify({ moduleId: mod.id, answers: answerList }),
      });
      setCurrentIndex(0);
      setMarkedForReview(new Set());
      await fetchSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
    setActionLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, answers, getToken]);

  const handleEndBreak = async () => {
    if (!token || !session) return;
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/api/sat/sessions/${session.id}/end-break`, token, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await fetchSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end break');
    }
    setActionLoading(false);
  };

  if (loading || dataLoading) return <PageLoader />;
  if (!session) return <PageMessage tone="bad">{error || 'Session not found'}</PageMessage>;

  // --- STATE MACHINE RENDERING ---

  // NOT STARTED
  if (session.status === 'not_started') {
    const outline: Array<{ icon: LucideIcon; title: string; text: string }> = [
      { icon: BookOpen, title: 'Section 1: Reading & Writing', text: '2 modules, 27 questions each, 32 minutes per module' },
      { icon: Coffee, title: 'Break', text: '10 minute break between sections' },
      { icon: Calculator, title: 'Section 2: Math', text: '2 modules, 22 questions each, 35 minutes per module' },
      { icon: Gauge, title: 'Adaptive', text: 'Module 2 difficulty adapts based on your Module 1 performance' },
      { icon: ChartColumn, title: 'Scoring', text: '200-800 per section, 400-1600 composite' },
    ];
    return (
      <Page width="narrow">
        <PageHeader back={{ href: '/child/sat', label: 'Back to SAT practice' }} title="Digital SAT practice test" subtitle="Here's how the test is laid out." />
        <Card padding="lg">
          <ul className="space-y-4">
            {outline.map(item => (
              <li key={item.title} className="flex items-start gap-3.5">
                <Hexagon size={40} tone="soft">
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </Hexagon>
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-sm text-ink-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
          {error && <Alert className="mt-6">{error}</Alert>}
          <Button size="lg" block className="mt-6" onClick={() => handleStartModule('rw', 1)} loading={actionLoading}>
            {actionLoading ? 'Starting…' : 'Begin test'}
          </Button>
        </Card>
      </Page>
    );
  }

  // BREAK
  if (session.status === 'break') {
    const rwMod1 = session.modules.find(m => m.section === 'rw' && m.moduleNumber === 1);
    const rwMod2 = session.modules.find(m => m.section === 'rw' && m.moduleNumber === 2);
    const rwTotal = (rwMod1?.rawScore ?? 0) + (rwMod2?.rawScore ?? 0);
    const rwMax = (rwMod1?.numQuestions ?? 0) + (rwMod2?.numQuestions ?? 0);

    return (
      <Page width="narrow">
        <Card padding="lg" className="text-center">
          <Hexagon size={64} tone="soft">
            <Coffee className="h-7 w-7" aria-hidden="true" />
          </Hexagon>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Break time</h1>
          <p className="mt-1 text-ink-muted">Take a 10-minute break before the Math section.</p>

          <div className="mx-auto mt-6 max-w-xs rounded-xl bg-muted p-4">
            <p className="text-sm text-ink-muted">Reading &amp; Writing raw score</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{rwTotal} / {rwMax}</p>
          </div>

          {session.breakStartedAt && (
            <div className="mt-6">
              <SATTimer
                startedAt={session.breakStartedAt}
                timeLimitMin={10}
                onExpiry={handleEndBreak}
              />
            </div>
          )}

          {error && <Alert className="mt-6 text-left">{error}</Alert>}
          <div className="mt-6">
            <Button size="lg" onClick={handleEndBreak} loading={actionLoading}>
              {actionLoading ? 'Loading Math…' : 'Skip break & start Math'}
            </Button>
          </div>
        </Card>
      </Page>
    );
  }

  // COMPLETED
  if (session.status === 'completed') {
    const sections: Array<{ key: string; label: string }> = [
      { key: 'rw', label: 'Reading & Writing' },
      { key: 'math', label: 'Math' },
    ];

    return (
      <Page width="medium">
        <PageHeader back={{ href: '/child/sat', label: 'Back to SAT practice' }} title="Test complete" subtitle="Here are your results." />

        <div className="mb-6">
          <SATScoreCard
            compositeScore={session.compositeScore || 0}
            rwScore={session.rwScaledScore || 0}
            mathScore={session.mathScaledScore || 0}
            pointsAwarded={session.pointsAwarded || undefined}
          />
        </div>

        {/* Domain Breakdown */}
        <Card className="mb-6">
          <h2 className="font-display text-lg font-semibold text-ink">Domain breakdown</h2>
          <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
            {sections.map(sec => {
              const allQ = session.modules.filter(m => m.section === sec.key).flatMap(m => m.questions);
              const domains = [...new Set(allQ.map(q => q.domain))];
              return (
                <div key={sec.key}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{sec.label}</p>
                  <ul className="space-y-3">
                    {domains.map(domain => {
                      const domainQs = allQ.filter(q => q.domain === domain);
                      const correct = domainQs.filter(q => q.answers[0]?.isCorrect).length;
                      const pct = domainQs.length > 0 ? Math.round((correct / domainQs.length) * 100) : 0;
                      const tone = pct >= 70 ? 'good' : pct >= 50 ? 'warn' : 'bad';
                      const bar = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }[tone];
                      const track = { good: 'bg-good-soft', warn: 'bg-warn-soft', bad: 'bg-bad-soft' }[tone];
                      return (
                        <li key={domain}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="capitalize text-ink">{domain.replace(/_/g, ' ')}</span>
                            <span className={`shrink-0 font-semibold tabular-nums ${toneTextClass(tone)}`}>
                              {correct}/{domainQs.length} ({pct}%)
                            </span>
                          </div>
                          <div className={cn('mt-1.5 h-1.5 overflow-hidden rounded-full', track)}>
                            <div className={cn('h-full rounded-full', bar)} style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Review Answers */}
        <ReviewAnswersSection session={session} />
      </Page>
    );
  }

  // ACTIVE MODULE (rw_mod1, rw_mod2, math_mod1, math_mod2)
  const activeModule = getActiveModule();
  if (!activeModule) {
    // Module exists but needs to be started
    const statusToTarget: Record<string, { section: string; mod: number; label: string }> = {
      rw_mod1: { section: 'rw', mod: 1, label: 'Reading & Writing Module 1' },
      rw_mod2: { section: 'rw', mod: 2, label: 'Reading & Writing Module 2' },
      math_mod1: { section: 'math', mod: 1, label: 'Math Module 1' },
      math_mod2: { section: 'math', mod: 2, label: 'Math Module 2' },
    };
    const target = statusToTarget[session.status];
    if (!target) return <PageMessage>Unknown session state: {session.status}</PageMessage>;

    return (
      <Page width="narrow" className="text-center">
        <Button size="lg" onClick={() => handleStartModule(target.section, target.mod)} loading={actionLoading}>
          {actionLoading ? 'Loading…' : `Start ${target.label}`}
        </Button>
      </Page>
    );
  }

  // Module is in progress or needs starting
  if (activeModule.status === 'not_started') {
    const section = activeModule.section;
    const modNum = activeModule.moduleNumber;
    return (
      <Page width="narrow">
        <Card padding="lg" className="text-center">
          <Hexagon size={64} tone="soft">
            {section === 'rw' ? <BookOpen className="h-7 w-7" aria-hidden="true" /> : <Calculator className="h-7 w-7" aria-hidden="true" />}
          </Hexagon>
          <h2 className="mt-4 font-display text-xl font-semibold text-ink">
            {section === 'rw' ? 'Reading & Writing' : 'Math'} · Module {modNum}
          </h2>
          <p className="mt-1 text-ink-muted">{activeModule.numQuestions} questions, {activeModule.timeLimitMin} minutes</p>
          {modNum === 2 && activeModule.difficulty !== 'standard' && (
            <p className="mt-2 text-sm text-ink-muted">
              <span className="font-semibold text-ink">
                {activeModule.difficulty === 'hard' ? 'Advanced' : 'Standard'} difficulty
              </span> based on Module 1 performance
            </p>
          )}
          {error && <Alert className="mt-6 text-left">{error}</Alert>}
          <div className="mt-6">
            <Button size="lg" onClick={() => handleStartModule(section, modNum)} loading={actionLoading}>
              {actionLoading ? 'Starting…' : 'Start module'}
            </Button>
          </div>
        </Card>
      </Page>
    );
  }

  // Module is in_progress — quiz UI
  const questions = activeModule.questions;
  const currentQ = questions[currentIndex];
  if (!currentQ) return <PageMessage>No questions loaded</PageMessage>;

  const answeredSet = new Set(questions.map((q, i) => answers[q.id] ? i : -1).filter(i => i >= 0));
  const markedIndexSet = new Set(questions.map((q, i) => markedForReview.has(q.id) ? i : -1).filter(i => i >= 0));

  return (
    <Page className="lg:py-6">
      {error && <Alert className="mb-4">{error}</Alert>}

      {/* Header with timer */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <SATModuleHeader
          section={activeModule.section as 'rw' | 'math'}
          moduleNumber={activeModule.moduleNumber}
          questionIndex={currentIndex}
          totalQuestions={questions.length}
          difficulty={activeModule.difficulty}
        />
        {activeModule.startedAt && (
          <SATTimer
            startedAt={activeModule.startedAt}
            timeLimitMin={activeModule.timeLimitMin}
            onExpiry={() => handleSubmitModule(true)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Question nav sidebar */}
        <div className="order-2 lg:order-1 lg:col-span-1">
          <Card padding="sm" className="lg:sticky lg:top-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Questions</p>
            <SATQuestionNav
              totalQuestions={questions.length}
              currentIndex={currentIndex}
              answeredSet={answeredSet}
              markedSet={markedIndexSet}
              onJump={setCurrentIndex}
            />
            <ul className="mt-4 space-y-1.5 text-xs text-ink-muted">
              <li className="flex items-center gap-2"><span className={cn('inline-block h-3 w-3 rounded', navStateClass.answered)} /> Answered</li>
              <li className="flex items-center gap-2"><span className={cn('inline-block h-3 w-3 rounded', navStateClass.marked)} /> Marked</li>
              <li className="flex items-center gap-2"><span className={cn('inline-block h-3 w-3 rounded', navStateClass.unanswered)} /> Unanswered</li>
            </ul>
          </Card>
        </div>

        {/* Question area */}
        <div className="order-1 lg:order-2 lg:col-span-3">
          <Card>
            <SATQuestionView
              questionType={currentQ.questionType}
              passage={currentQ.passage}
              questionText={currentQ.questionText}
              optionA={currentQ.optionA}
              optionB={currentQ.optionB}
              optionC={currentQ.optionC}
              optionD={currentQ.optionD}
              selectedAnswer={answers[currentQ.id] || null}
              isMarked={markedForReview.has(currentQ.id)}
              onAnswer={(ans) => setAnswers(prev => ({ ...prev, [currentQ.id]: ans }))}
              onToggleMark={() => setMarkedForReview(prev => {
                const next = new Set(prev);
                if (next.has(currentQ.id)) next.delete(currentQ.id);
                else next.add(currentQ.id);
                return next;
              })}
              section={activeModule.section as 'rw' | 'math'}
            />
          </Card>

          {/* Navigation buttons */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              onClick={() => { handleSaveProgress(); setCurrentIndex(Math.max(0, currentIndex - 1)); }}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSaveProgress}>Save</Button>
              {currentIndex === questions.length - 1 ? (
                <Button onClick={() => handleSubmitModule(false)} loading={actionLoading}>
                  {actionLoading ? 'Submitting…' : 'Submit module'}
                </Button>
              ) : (
                <Button onClick={() => { handleSaveProgress(); setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)); }}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

// Collapsible review answers section for completed sessions
function ReviewAnswersSection({ session }: { session: SATSession }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card padding="none">
      <button
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"
      >
        <span className="font-display text-lg font-semibold text-ink">Review all answers</span>
        {expanded
          ? <ChevronUp className="h-5 w-5 text-ink-subtle" aria-hidden="true" />
          : <ChevronDown className="h-5 w-5 text-ink-subtle" aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="border-t border-line p-5 sm:p-6">
          {session.modules.map(mod => (
            <div key={mod.id} className="mb-8 last:mb-0">
              <h3 className="mb-4 font-semibold text-ink">
                {mod.section === 'rw' ? 'Reading & Writing' : 'Math'} Module {mod.moduleNumber}
                <span className="ml-2 text-sm font-normal text-ink-muted">({mod.rawScore}/{mod.numQuestions})</span>
              </h3>
              <div className="space-y-6">
                {mod.questions.map((q, i) => (
                  <div key={q.id} className="border-b border-line pb-6 last:border-0 last:pb-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Q{i + 1} · {q.domain.replace(/_/g, ' ')}</p>
                    <SATQuestionView
                      questionType={q.questionType}
                      passage={q.passage}
                      questionText={q.questionText}
                      optionA={q.optionA}
                      optionB={q.optionB}
                      optionC={q.optionC}
                      optionD={q.optionD}
                      selectedAnswer={q.answers[0]?.selectedAnswer || null}
                      isMarked={false}
                      onAnswer={() => {}}
                      onToggleMark={() => {}}
                      showCorrect
                      correctAnswer={q.correctAnswer}
                      section={mod.section as 'rw' | 'math'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
