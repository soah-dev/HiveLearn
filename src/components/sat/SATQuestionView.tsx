'use client';

import MathText from '@/components/MathText';

interface SATQuestionViewProps {
  questionType: string;
  passage: string | null;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  selectedAnswer: string | null;
  isMarked: boolean;
  onAnswer: (answer: string) => void;
  onToggleMark: () => void;
  showCorrect?: boolean;
  correctAnswer?: string;
  section: 'rw' | 'math';
}

export default function SATQuestionView({
  questionType,
  passage,
  questionText,
  optionA,
  optionB,
  optionC,
  optionD,
  selectedAnswer,
  isMarked,
  onAnswer,
  onToggleMark,
  showCorrect,
  correctAnswer,
  section,
}: SATQuestionViewProps) {
  const options = [
    { label: 'A', text: optionA },
    { label: 'B', text: optionB },
    { label: 'C', text: optionC },
    { label: 'D', text: optionD },
  ].filter(o => o.text);

  const isMath = section === 'math';

  return (
    <div className="space-y-4">
      {/* Passage for R&W */}
      {passage && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-60 overflow-y-auto">
          <MathText text={passage} />
        </div>
      )}

      {/* Question text */}
      <div className="text-gray-900 dark:text-white font-medium">
        <MathText text={questionText} />
      </div>

      {/* Mark for Review */}
      <button
        onClick={onToggleMark}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
          isMarked
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        }`}
      >
        {isMarked ? 'Marked for Review' : 'Mark for Review'}
      </button>

      {/* Multiple choice options */}
      {questionType === 'multiple_choice' && options.length > 0 && (
        <div className="space-y-2">
          {options.map(opt => {
            const isSelected = selectedAnswer === opt.label;
            const isCorrectOption = showCorrect && correctAnswer === opt.label;
            const isWrong = showCorrect && isSelected && correctAnswer !== opt.label;

            let optClass = 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600';
            if (isCorrectOption) optClass = 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600';
            else if (isWrong) optClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600';
            else if (isSelected) optClass = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600';

            return (
              <button
                key={opt.label}
                onClick={() => !showCorrect && onAnswer(opt.label)}
                disabled={!!showCorrect}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${optClass} ${showCorrect ? 'cursor-default' : ''}`}
              >
                <span className="font-bold text-gray-500 dark:text-gray-400 mr-3">{opt.label}.</span>
                <MathText text={opt.text!} className="text-gray-800 dark:text-gray-200" />
              </button>
            );
          })}
        </div>
      )}

      {/* Student produced (grid-in) input */}
      {questionType === 'student_produced' && (
        <div>
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Your Answer</label>
          <input
            type="text"
            value={selectedAnswer || ''}
            onChange={e => !showCorrect && onAnswer(e.target.value)}
            disabled={!!showCorrect}
            placeholder="Enter a numeric value (e.g., 42, 3.5, 7/2)"
            className={`w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
              showCorrect
                ? selectedAnswer?.trim() === correctAnswer?.trim()
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          />
          {showCorrect && correctAnswer && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Correct answer: <MathText text={correctAnswer} className="font-bold" />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
