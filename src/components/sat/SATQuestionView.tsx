'use client';

import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/cn';
import MathText from '@/components/MathText';
import AnswerOption, { AnswerState } from '@/components/quiz/AnswerOption';
import { Input } from '@/components/ui/Field';

interface SATQuestionViewProps {
  questionType: string;
  passage: string | null;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  selectedAnswer: string | null;
  isMarked: boolean;
  onAnswer: (answer: string) => void;
  onToggleMark: () => void;
  showCorrect?: boolean;
  correctAnswer?: string;
  section: 'rw' | 'math';
}

export default function SATQuestionView({
  questionType,
  passage,
  questionText,
  optionA,
  optionB,
  optionC,
  optionD,
  selectedAnswer,
  isMarked,
  onAnswer,
  onToggleMark,
  showCorrect,
  correctAnswer,
}: SATQuestionViewProps) {
  const options = [
    { label: 'A', text: optionA },
    { label: 'B', text: optionB },
    { label: 'C', text: optionC },
    { label: 'D', text: optionD },
  ].filter(o => o.text);

  const optionState = (label: string): AnswerState => {
    if (showCorrect) {
      if (correctAnswer === label) return 'correct';
      return selectedAnswer === label ? 'wrong' : 'dim';
    }
    return selectedAnswer === label ? 'selected' : 'idle';
  };

  const producedCorrect = selectedAnswer?.trim() === correctAnswer?.trim();

  return (
    <div className="space-y-4">
      {/* Passage for R&W */}
      {passage && (
        <div className="max-h-60 overflow-y-auto rounded-xl bg-muted p-4 text-sm leading-relaxed text-ink">
          <MathText text={passage} />
        </div>
      )}

      {/* Question text */}
      <div className="text-[15px] font-medium leading-relaxed text-ink sm:text-base">
        <MathText text={questionText} />
      </div>

      {/* Mark for review: only while the test is being taken */}
      {!showCorrect && (
        <button
          onClick={onToggleMark}
          aria-pressed={isMarked}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors',
            isMarked
              ? 'border-warn/50 bg-warn-soft text-warn-text'
              : 'border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink'
          )}
        >
          <Bookmark className="h-3.5 w-3.5" fill={isMarked ? 'currentColor' : 'none'} aria-hidden="true" />
          {isMarked ? 'Marked for review' : 'Mark for review'}
        </button>
      )}

      {/* Multiple choice options */}
      {questionType === 'multiple_choice' && options.length > 0 && (
        <div className="space-y-2">
          {options.map(opt => (
            <AnswerOption
              key={opt.label}
              letter={opt.label}
              state={optionState(opt.label)}
              onSelect={showCorrect ? undefined : () => onAnswer(opt.label)}
            >
              <MathText text={opt.text!} />
            </AnswerOption>
          ))}
        </div>
      )}

      {/* Student produced (grid-in) input */}
      {questionType === 'student_produced' && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Your answer
            <Input
              type="text"
              value={selectedAnswer || ''}
              onChange={e => !showCorrect && onAnswer(e.target.value)}
              disabled={!!showCorrect}
              placeholder="Enter a numeric value (e.g., 42, 3.5, 7/2)"
              // Important modifiers: these must win over the control's own disabled styling
              className={cn('mt-1.5', showCorrect && (producedCorrect ? '!border-good !bg-good-soft !text-ink' : '!border-bad !bg-bad-soft !text-ink'))}
            />
          </label>
          {showCorrect && correctAnswer && (
            <p className="mt-2 text-sm text-ink-muted">
              Correct answer: <MathText text={correctAnswer} className="font-semibold text-good-text" />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
