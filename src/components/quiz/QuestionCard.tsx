import { ReactNode } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/cn';
import Hexagon from '@/components/ui/Hexagon';
import MathText from '@/components/MathText';

interface QuestionCardProps {
  number: number;
  question: string;
  /** Small label above the question, e.g. the question type. */
  meta?: ReactNode;
  /** Shown top-right: answered tick, correct/incorrect mark, flag status. */
  status?: ReactNode;
  /** Outline the card to show it has been flagged for a parent. */
  flagged?: boolean;
  children?: ReactNode;
}

/** A numbered question with its answer area. Shared by every quiz and review screen. */
export default function QuestionCard({ number, question, meta, status, flagged, children }: QuestionCardProps) {
  return (
    <div
      className={cn(
        'print-break-inside-avoid rounded-2xl border bg-surface p-4 sm:p-6',
        flagged ? 'border-warn/50' : 'border-line'
      )}
    >
      <div className="flex items-start gap-3">
        <Hexagon size={30} tone={flagged ? 'warn' : 'muted'} className="mt-px">
          <span className="text-xs font-bold tabular-nums">{number}</span>
        </Hexagon>
        <div className="min-w-0 flex-1">
          {meta && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{meta}</p>}
          <p className="pt-0.5 text-[15px] font-medium leading-relaxed text-ink sm:text-base">
            <MathText text={question} />
          </p>
        </div>
        {status && <div className="shrink-0 pt-0.5">{status}</div>}
      </div>
      {children && <div className="mt-4 sm:pl-[42px]">{children}</div>}
    </div>
  );
}

/** Correct / incorrect mark for a reviewed question. */
export function ResultMark({ correct }: { correct: boolean }) {
  return correct ? (
    <CircleCheck className="h-5 w-5 text-good-text" aria-label="Correct" />
  ) : (
    <CircleX className="h-5 w-5 text-bad-text" aria-label="Incorrect" />
  );
}

/** A tinted note under a question: explanation, parent comment, flag status. */
export function QuestionNote({ tone = 'neutral', label, children }: { tone?: 'neutral' | 'warn' | 'good'; label?: string; children: ReactNode }) {
  const tones = {
    neutral: 'bg-muted text-ink-muted',
    warn: 'bg-warn-soft text-warn-text',
    good: 'bg-good-soft text-good-text',
  };
  return (
    <div className={cn('rounded-xl px-3.5 py-3 text-sm', tones[tone])}>
      {label && <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>}
      {children}
    </div>
  );
}
