import { Timer } from 'lucide-react';
import { cn } from '@/lib/cn';

interface QuizProgressProps {
  answered: number;
  total: number;
  /** Seconds remaining on a timed quiz; omit for untimed. */
  timeLeft?: number | null;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/** Countdown chip that turns red in the final minute. */
export function Countdown({ seconds, className }: { seconds: number; className?: string }) {
  const urgent = seconds < 60;
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 font-mono text-base font-semibold tabular-nums',
        urgent ? 'bg-bad-soft text-bad-text' : 'bg-muted text-ink',
        className
      )}
      role="timer"
      aria-live="off"
      aria-label="Time remaining"
    >
      <Timer className="h-4 w-4" aria-hidden="true" />
      {formatTime(seconds)}
    </div>
  );
}

/** Answered-count progress bar with an optional countdown, for quiz action bars. */
export default function QuizProgress({ answered, total, timeLeft }: QuizProgressProps) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-muted">
          <span>{answered} of {total} answered</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          aria-label="Questions answered"
        >
          <div className="h-full rounded-full bg-honey transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {timeLeft !== null && timeLeft !== undefined && <Countdown seconds={timeLeft} className="shrink-0" />}
    </div>
  );
}
