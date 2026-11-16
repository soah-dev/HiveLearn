'use client';

import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Option<T> {
  value: T;
  label: ReactNode;
}

interface ChoiceProps<T> {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
}

interface SegmentedProps<T> extends ChoiceProps<T> {
  size?: 'sm' | 'md';
  /** Stretch across the container with equal-width segments. */
  block?: boolean;
}

/** Switch between views of the same thing (Family / Global, This week / All time). */
export function Segmented<T extends string | number>({ options, value, onChange, label, size = 'md', block, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('rounded-xl bg-muted p-1', block ? 'flex' : 'inline-flex', className)}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-lg font-semibold transition-colors',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
              block && 'flex-1',
              active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ChipsProps<T> extends ChoiceProps<T> {
  /** Equal-width chips in one row; otherwise chips size to their label and wrap. */
  block?: boolean;
}

/** Pick one value in a form (difficulty, question count, question type). */
export function Chips<T extends string | number>({ options, value, onChange, label, block, className }: ChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-2', !block && 'flex-wrap', className)}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors',
              // Equal-width chips get tighter padding so labels fit on phones
              block ? 'min-w-0 flex-1 px-2' : 'px-3.5',
              active
                ? 'border-brand bg-brand-soft text-ink'
                : 'border-line-strong bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink'
            )}
          >
            {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand-text" aria-hidden="true" />}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
