import Link from 'next/link';

interface AssignmentCardProps {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  status: string;
  score?: number | null;
  numQuestions: number;
  timeLimitMin?: number | null;
  createdAt: string;
  childName?: string;
  role: 'parent' | 'child';
  flaggedCount?: number;
}

const subjectIcons: Record<string, string> = {
  math: '🧮', reading: '📚', science: '🔬', history: '🏛️', english: '✍️',
  geography: '🌍', art: '🎨', music: '🎵', computer_science: '💻', foreign_languages: '🌐',
};

const subjectGradients: Record<string, string> = {
  math: 'from-blue-500 to-indigo-600',
  reading: 'from-amber-500 to-orange-600',
  science: 'from-emerald-500 to-teal-600',
  history: 'from-purple-500 to-violet-600',
  english: 'from-rose-500 to-pink-600',
  geography: 'from-green-500 to-emerald-600',
  art: 'from-fuchsia-500 to-purple-600',
  music: 'from-cyan-500 to-blue-600',
  computer_science: 'from-slate-500 to-gray-600',
  foreign_languages: 'from-teal-500 to-cyan-600',
};

const difficultyStyles: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  submitted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  reviewed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export default function AssignmentCard({
  id, subject, topic, difficulty, status, score, numQuestions, timeLimitMin, createdAt, childName, role, flaggedCount,
}: AssignmentCardProps) {
  const href = role === 'parent' ? `/parent/assignment/${id}` : `/child/assignment/${id}`;
  const gradient = subjectGradients[subject] || 'from-indigo-500 to-purple-600';

  return (
    <Link href={href} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden card-hover">
        {/* Colored top bar */}
        <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl group-hover:animate-wiggle transition-transform">{subjectIcons[subject] || '📝'}</span>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white capitalize">{subject.replace('_', ' ')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{topic}</p>
              </div>
            </div>
            {score !== null && score !== undefined && (
              <div className="text-right">
                <p className={`text-2xl font-extrabold ${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {score}%
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${difficultyStyles[difficulty]}`}>
              {difficulty}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyles[status]}`}>
              {status.replace('_', ' ')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {numQuestions}q
            </span>
            {timeLimitMin && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                {timeLimitMin}m
              </span>
            )}
            {flaggedCount !== undefined && flaggedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {flaggedCount} flagged
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            {childName && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{childName}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
