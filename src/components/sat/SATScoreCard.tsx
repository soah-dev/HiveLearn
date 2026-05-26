'use client';

interface SATScoreCardProps {
  compositeScore: number;
  rwScore: number;
  mathScore: number;
  pointsAwarded?: number;
}

export default function SATScoreCard({ compositeScore, rwScore, mathScore, pointsAwarded }: SATScoreCardProps) {
  const colorClass = compositeScore >= 1200
    ? 'from-green-500 to-emerald-600'
    : compositeScore >= 800
    ? 'from-amber-500 to-orange-600'
    : 'from-red-500 to-rose-600';

  const sectionColor = (score: number) =>
    score >= 600 ? 'text-green-600 dark:text-green-400' :
    score >= 400 ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 text-center">
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Composite Score</p>
      <div className={`inline-block bg-gradient-to-r ${colorClass} text-white text-5xl font-extrabold px-8 py-4 rounded-2xl shadow-lg mb-4`}>
        {compositeScore}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">out of 1600</p>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Reading & Writing</p>
          <p className={`text-3xl font-extrabold ${sectionColor(rwScore)}`}>{rwScore}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">200-800</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Math</p>
          <p className={`text-3xl font-extrabold ${sectionColor(mathScore)}`}>{mathScore}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">200-800</p>
        </div>
      </div>

      {pointsAwarded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">+{pointsAwarded} points earned!</p>
        </div>
      )}
    </div>
  );
}
