'use client';

import { useEffect, useState, useRef } from 'react';

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
    <div className={`font-mono text-lg font-bold px-4 py-2 rounded-xl ${
      isWarning
        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }`}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}
