'use client';

import { cn } from '@/lib/cn';

interface SATQuestionNavProps {
  totalQuestions: number;
  currentIndex: number;
  answeredSet: Set<number>;
  markedSet: Set<number>;
  onJump: (index: number) => void;
}

// Shared with the legend on the session page
export const navStateClass = {
  current: 'bg-ink text-canvas',
  marked: 'bg-warn-soft text-warn-text ring-1 ring-inset ring-warn/50',
  answered: 'bg-honey-soft text-honey-text',
  unanswered: 'bg-muted text-ink-muted',
};

export default function SATQuestionNav({ totalQuestions, currentIndex, answeredSet, markedSet, onJump }: SATQuestionNavProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: totalQuestions }, (_, i) => {
        const isCurrent = i === currentIndex;
        const state = isCurrent ? 'current' : markedSet.has(i) ? 'marked' : answeredSet.has(i) ? 'answered' : 'unanswered';

        return (
          <button
            key={i}
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}, ${state}`}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn('h-8 w-8 rounded-lg text-xs font-semibold tabular-nums transition-opacity hover:opacity-80', navStateClass[state])}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
