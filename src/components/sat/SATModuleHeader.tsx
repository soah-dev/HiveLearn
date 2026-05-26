'use client';

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
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {sectionName} - Module {moduleNumber}
        </h2>
        {moduleNumber === 2 && difficulty && difficulty !== 'standard' && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            difficulty === 'hard'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}>
            {difficulty === 'hard' ? 'Advanced' : 'Standard'} Difficulty
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        Question {questionIndex + 1} of {totalQuestions}
      </span>
    </div>
  );
}
