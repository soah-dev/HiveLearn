'use client';

import Pill from '@/components/ui/Pill';

interface SATModuleHeaderProps {
  section: 'rw' | 'math';
  moduleNumber: number;
  questionIndex: number;
  totalQuestions: number;
  difficulty?: string;
}

export default function SATModuleHeader({ section, moduleNumber, questionIndex, totalQuestions, difficulty }: SATModuleHeaderProps) {
  const sectionName = section === 'rw' ? 'Reading & Writing' : 'Math';

  return (
    <div className="min-w-0">
      <h2 className="font-display text-lg font-semibold text-ink">
        {sectionName} · Module {moduleNumber}
      </h2>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>Question {questionIndex + 1} of {totalQuestions}</span>
        {moduleNumber === 2 && difficulty && difficulty !== 'standard' && (
          <Pill tone={difficulty === 'hard' ? 'honey' : 'neutral'}>
            {difficulty === 'hard' ? 'Advanced' : 'Standard'} difficulty
          </Pill>
        )}
      </div>
    </div>
  );
}
