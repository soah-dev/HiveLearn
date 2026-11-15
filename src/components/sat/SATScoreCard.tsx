'use client';

import Card from '@/components/ui/Card';
import Pill, { toneTextClass } from '@/components/ui/Pill';

interface SATScoreCardProps {
  compositeScore: number;
  rwScore: number;
  mathScore: number;
  pointsAwarded?: number;
}

export default function SATScoreCard({ compositeScore, rwScore, mathScore, pointsAwarded }: SATScoreCardProps) {
  const compositeTone = compositeScore >= 1200 ? 'good' : compositeScore >= 800 ? 'warn' : 'bad';
  const sectionTone = (score: number) => (score >= 600 ? 'good' : score >= 400 ? 'warn' : 'bad');

  const sections = [
    { label: 'Reading & Writing', score: rwScore },
    { label: 'Math', score: mathScore },
  ];

  return (
    <Card padding="lg" className="text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Composite score</p>
      <p className={`mt-2 text-6xl font-semibold leading-none tracking-tight ${toneTextClass(compositeTone)}`}>{compositeScore}</p>
      <p className="mt-2 text-sm text-ink-subtle">out of 1600</p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {sections.map(s => (
          <div key={s.label} className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{s.label}</p>
            <p className={`mt-1 text-3xl font-semibold tracking-tight ${toneTextClass(sectionTone(s.score))}`}>{s.score}</p>
            <p className="text-xs text-ink-subtle">200–800</p>
          </div>
        ))}
      </div>

      {pointsAwarded ? <Pill tone="honey" className="mt-5">+{pointsAwarded} points earned</Pill> : null}
    </Card>
  );
}
