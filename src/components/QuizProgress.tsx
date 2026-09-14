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

/** Countdown pill that turns red and pulses in the final minute. */
export function Countdown({ seconds, className = '' }: { seconds: number; className?: string }) {
  const urgent = seconds < 60;
  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-xl font-mono text-lg font-extrabold tabular-nums ${
        urgent
          ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 animate-pulse-soft'
          : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
      } ${className}`}
      role="timer"
      aria-live="off"
      aria-label="Time remaining"
    >
      ⏱ {formatTime(seconds)}
    </div>
  );
}

/** Answered-count progress bar with an optional countdown, for quiz action bars. */
export default function QuizProgress({ answered, total, timeLeft }: QuizProgressProps) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
          <span>{answered} of {total} answered</span>
          <span>{pct}%</span>
        </div>
        <div
          className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          aria-label="Questions answered"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {timeLeft !== null && timeLeft !== undefined && <Countdown seconds={timeLeft} className="flex-shrink-0" />}
    </div>
  );
}
