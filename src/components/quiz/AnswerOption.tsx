import { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * idle: can be picked · selected: the student's current pick ·
 * correct / wrong: revealed after review · dim: revealed, neither picked nor correct
 */
export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

const box: Record<AnswerState, string> = {
  idle: 'border-line-strong bg-surface text-ink',
  selected: 'border-honey bg-honey-soft text-ink',
  correct: 'border-good bg-good-soft text-ink',
  wrong: 'border-bad bg-bad-soft text-ink',
  dim: 'border-line bg-surface text-ink-muted',
};

const chip: Record<AnswerState, string> = {
  idle: 'border-line-strong text-ink-muted',
  selected: 'border-honey bg-honey text-honey-ink',
  correct: 'border-good bg-good text-canvas',
  wrong: 'border-bad bg-bad text-canvas',
  dim: 'border-line text-ink-subtle',
};

interface AnswerOptionProps {
  /** Letter shown in the chip (A–D). Omit for True/False. */
  letter?: string;
  state?: AnswerState;
  /** Omit to render a static (non-interactive) option, e.g. in a parent's review. */
  onSelect?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

/** One answer choice. The same component is used while answering and when reviewing. */
export default function AnswerOption({ letter, state = 'idle', onSelect, disabled, children, className }: AnswerOptionProps) {
  const interactive = !!onSelect && !disabled;
  const classes = cn(
    'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] transition-colors',
    box[state],
    interactive && state === 'idle' && 'hover:border-ink-subtle hover:bg-muted/60',
    !letter && 'justify-center font-semibold',
    className
  );

  const content = (
    <>
      {letter && (
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold', chip[state])}>
          {letter}
        </span>
      )}
      <span className={cn('min-w-0', letter && 'flex-1 pt-0.5')}>{children}</span>
      {state === 'correct' && <Check className="mt-1 h-4 w-4 shrink-0 text-good-text" aria-label="Correct answer" />}
      {state === 'wrong' && <X className="mt-1 h-4 w-4 shrink-0 text-bad-text" aria-label="Incorrect" />}
    </>
  );

  if (!onSelect) return <div className={classes}>{content}</div>;

  return (
    <button type="button" onClick={onSelect} disabled={disabled} aria-pressed={state === 'selected'} className={classes}>
      {content}
    </button>
  );
}
