'use client';

interface SATQuestionNavProps {
  totalQuestions: number;
  currentIndex: number;
  answeredSet: Set<number>;
  markedSet: Set<number>;
  onJump: (index: number) => void;
}

export default function SATQuestionNav({ totalQuestions, currentIndex, answeredSet, markedSet, onJump }: SATQuestionNavProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: totalQuestions }, (_, i) => {
        const isCurrent = i === currentIndex;
        const isAnswered = answeredSet.has(i);
        const isMarked = markedSet.has(i);

        let colorClass = 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
        if (isCurrent) colorClass = 'bg-indigo-600 text-white ring-2 ring-indigo-400';
        else if (isMarked) colorClass = 'bg-amber-400 dark:bg-amber-600 text-white';
        else if (isAnswered) colorClass = 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200';

        return (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${colorClass} hover:opacity-80`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
