import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'honey' | 'good' | 'warn' | 'bad' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-ink-muted',
  honey: 'bg-honey-soft text-honey-text',
  good: 'bg-good-soft text-good-text',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad-text',
  info: 'bg-info-soft text-info-text',
};

/** Small status label. Tone carries meaning, so default to neutral. */
export default function Pill({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}

/** Score thresholds used everywhere a percentage is coloured. */
export function scoreTone(score: number): 'good' | 'warn' | 'bad' {
  return score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad';
}

const toneText = { good: 'text-good-text', warn: 'text-warn-text', bad: 'text-bad-text' };

/** Text colour class for a tone, for coloured figures outside a pill. */
export function toneTextClass(tone: 'good' | 'warn' | 'bad'): string {
  return toneText[tone];
}

/** A percentage coloured by how good it is. */
export function Score({ value, className }: { value: number; className?: string }) {
  return <span className={cn('font-semibold tabular-nums', toneText[scoreTone(value)], className)}>{value}%</span>;
}
