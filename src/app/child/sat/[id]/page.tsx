'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import SATTimer from '@/components/sat/SATTimer';
import SATModuleHeader from '@/components/sat/SATModuleHeader';
import SATQuestionNav from '@/components/sat/SATQuestionNav';
import SATQuestionView from '@/components/sat/SATQuestionView';
import SATScoreCard from '@/components/sat/SATScoreCard';

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
    if (!loading && (!user || user.role !== 'child')) {
      router.push('/');
      return;
    }
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

  if (loading || dataLoading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;
  if (!session) return <><Navbar /><div className="p-8 text-center text-red-500">{error || 'Session not found'}</div></>;

  // --- STATE MACHINE RENDERING ---

  // NOT STARTED
  if (session.status === 'not_started') {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center animate-slide-up">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Digital SAT Practice Test</h1>
            <div className="text-left max-w-md mx-auto space-y-3 mb-8">
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-lg">📖</span>
                <p><strong>Section 1: Reading & Writing</strong> - 2 modules, 27 questions each, 32 minutes per module</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-lg">☕</span>
                <p><strong>Break</strong> - 10 minute break between sections</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-lg">🔢</span>
                <p><strong>Section 2: Math</strong> - 2 modules, 22 questions each, 35 minutes per module</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-lg">🎯</span>
                <p><strong>Adaptive</strong> - Module 2 difficulty adapts based on your Module 1 performance</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-lg">📊</span>
                <p><strong>Scoring</strong> - 200-800 per section, 400-1600 composite</p>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <button
              onClick={() => handleStartModule('rw', 1)}
              disabled={actionLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg text-lg"
            >
              {actionLoading ? 'Starting...' : 'Begin Test'}
            </button>
          </div>
        </main>
      </>
    );
  }

  // BREAK
  if (session.status === 'break') {
    const rwMod1 = session.modules.find(m => m.section === 'rw' && m.moduleNumber === 1);
    const rwMod2 = session.modules.find(m => m.section === 'rw' && m.moduleNumber === 2);
    const rwTotal = (rwMod1?.rawScore ?? 0) + (rwMod2?.rawScore ?? 0);
    const rwMax = (rwMod1?.numQuestions ?? 0) + (rwMod2?.numQuestions ?? 0);

    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 text-center animate-slide-up">
            <p className="text-5xl mb-4">☕</p>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Break Time</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Take a 10-minute break before the Math section.</p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 mb-6 inline-block">
              <p className="text-sm text-gray-600 dark:text-gray-400">Reading & Writing Raw Score</p>
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{rwTotal} / {rwMax}</p>
            </div>

            {session.breakStartedAt && (
              <div className="mb-6">
                <SATTimer
                  startedAt={session.breakStartedAt}
                  timeLimitMin={10}
                  onExpiry={handleEndBreak}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <button
              onClick={handleEndBreak}
              disabled={actionLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg"
            >
              {actionLoading ? 'Loading Math...' : 'Skip Break & Start Math'}
            </button>
          </div>
        </main>
      </>
    );
  }

  // COMPLETED
  if (session.status === 'completed') {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8 animate-slide-up">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Test Complete!</h1>
            <p className="text-gray-500 dark:text-gray-400">Here are your results.</p>
          </div>

          <div className="mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <SATScoreCard
              compositeScore={session.compositeScore || 0}
              rwScore={session.rwScaledScore || 0}
              mathScore={session.mathScaledScore || 0}
              pointsAwarded={session.pointsAwarded || undefined}
            />
          </div>

          {/* Domain Breakdown */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Domain Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['rw', 'math'].map(sec => {
                const mods = session.modules.filter(m => m.section === sec);
                const allQ = mods.flatMap(m => m.questions);
                const domains = [...new Set(allQ.map(q => q.domain))];
                return domains.map(domain => {
                  const domainQs = allQ.filter(q => q.domain === domain);
                  const correct = domainQs.filter(q => q.answers[0]?.isCorrect).length;
                  const pct = domainQs.length > 0 ? Math.round((correct / domainQs.length) * 100) : 0;
                  return (
                    <div key={domain} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{domain.replace(/_/g, ' ')}</span>
                      <span className={`text-sm font-bold ${pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {correct}/{domainQs.length} ({pct}%)
                      </span>
                    </div>
                  );
                });
              })}
            </div>
          </div>

          {/* Review Answers */}
          <ReviewAnswersSection session={session} />

          <div className="text-center mt-8">
            <button
              onClick={() => router.push('/child/sat')}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              ← Back to SAT Practice
            </button>
          </div>
        </main>
      </>
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
    if (!target) return <><Navbar /><div className="p-8 text-center text-gray-500">Unknown session state: {session.status}</div></>;

    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8 text-center">
          <button
            onClick={() => handleStartModule(target.section, target.mod)}
            disabled={actionLoading}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {actionLoading ? 'Loading...' : `Start ${target.label}`}
          </button>
        </main>
      </>
    );
  }

  // Module is in progress or needs starting
  if (activeModule.status === 'not_started') {
    const section = activeModule.section;
    const modNum = activeModule.moduleNumber;
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8 text-center">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {section === 'rw' ? 'Reading & Writing' : 'Math'} - Module {modNum}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">{activeModule.numQuestions} questions, {activeModule.timeLimitMin} minutes</p>
            {modNum === 2 && activeModule.difficulty !== 'standard' && (
              <p className="text-sm mb-4">
                <span className={`font-bold ${activeModule.difficulty === 'hard' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {activeModule.difficulty === 'hard' ? 'Advanced' : 'Standard'} difficulty
                </span> based on Module 1 performance
              </p>
            )}
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <button
              onClick={() => handleStartModule(section, modNum)}
              disabled={actionLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg"
            >
              {actionLoading ? 'Starting...' : 'Start Module'}
            </button>
          </div>
        </main>
      </>
    );
  }

  // Module is in_progress — quiz UI
  const questions = activeModule.questions;
  const currentQ = questions[currentIndex];
  if (!currentQ) return <><Navbar /><div className="p-8 text-center text-gray-500">No questions loaded</div></>;

  const answeredSet = new Set(questions.map((q, i) => answers[q.id] ? i : -1).filter(i => i >= 0));
  const markedIndexSet = new Set(questions.map((q, i) => markedForReview.has(q.id) ? i : -1).filter(i => i >= 0));

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Header with timer */}
        <div className="flex items-center justify-between mb-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Question nav sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 sticky top-20">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Questions</p>
              <SATQuestionNav
                totalQuestions={questions.length}
                currentIndex={currentIndex}
                answeredSet={answeredSet}
                markedSet={markedIndexSet}
                onJump={setCurrentIndex}
              />
              <div className="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-indigo-200 dark:bg-indigo-800 inline-block" /> Answered</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400 dark:bg-amber-600 inline-block" /> Marked</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 inline-block" /> Unanswered</div>
              </div>
            </div>
          </div>

          {/* Question area */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
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
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => { handleSaveProgress(); setCurrentIndex(Math.max(0, currentIndex - 1)); }}
                disabled={currentIndex === 0}
                className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-all"
              >
                Previous
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveProgress}
                  className="px-4 py-2.5 rounded-xl font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
                >
                  Save
                </button>
                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={() => handleSubmitModule(false)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-md"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Module'}
                  </button>
                ) : (
                  <button
                    onClick={() => { handleSaveProgress(); setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)); }}
                    className="px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Collapsible review answers section for completed sessions
function ReviewAnswersSection({ session }: { session: SATSession }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <button
          onClick={() => setExpanded(true)}
          className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
        >
          <span className="font-bold text-indigo-600 dark:text-indigo-400">Review All Answers</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Answer Review</h2>
        <button onClick={() => setExpanded(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Collapse</button>
      </div>
      {session.modules.map(mod => (
        <div key={mod.id} className="mb-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 capitalize">
            {mod.section === 'rw' ? 'Reading & Writing' : 'Math'} Module {mod.moduleNumber}
            <span className="ml-2 text-sm font-normal text-gray-500">({mod.rawScore}/{mod.numQuestions})</span>
          </h3>
          <div className="space-y-4">
            {mod.questions.map((q, i) => (
              <div key={q.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Q{i + 1} - {q.domain.replace(/_/g, ' ')}</p>
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
  );
}
