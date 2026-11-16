import { cn } from '@/lib/cn';
import { HEX_PATH } from './Hexagon';

const levels: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

/** Difficulty as one to three filled cells plus its name, instead of a coloured tag. */
export default function DifficultyMeter({ difficulty, className }: { difficulty: string; className?: string }) {
  const level = levels[difficulty] ?? 0;
  return (
    <span className={cn('inline-flex items-center gap-1.5 capitalize', className)}>
      <span className="inline-flex gap-px" aria-hidden="true">
        {[1, 2, 3].map(n => (
          <svg key={n} viewBox="0 0 100 100" className="h-2.5 w-2.5">
            <path d={HEX_PATH} className={n <= level ? 'fill-brand' : 'fill-line-strong'} />
          </svg>
        ))}
      </span>
      {difficulty}
    </span>
  );
}
