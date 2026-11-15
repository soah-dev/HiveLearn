'use client';

import { useEffect, useState, useRef } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SATTimerProps {
  startedAt: string;
  timeLimitMin: number;
  onExpiry: () => void;
}

export default function SATTimer({ startedAt, timeLimitMin, onExpiry }: SATTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
    return Math.max(0, Math.floor(timeLimitMin * 60 - elapsed));
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpiry();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [onExpiry]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft < 300; // < 5 min

  return (
    <div
      role="timer"
      aria-label="Time remaining"
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 font-mono text-base font-semibold tabular-nums',
        isWarning ? 'bg-bad-soft text-bad-text' : 'bg-muted text-ink'
      )}
    >
      <Timer className="h-4 w-4" aria-hidden="true" />
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}
