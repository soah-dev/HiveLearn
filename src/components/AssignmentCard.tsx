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
}

const subjectIcons: Record<string, string> = {
  math: '🧮', reading: '📚', science: '🔬', history: '🏛️', english: '✍️',
  geography: '🌍', art: '🎨', music: '🎵', computer_science: '💻', foreign_languages: '🌐',
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  submitted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  reviewed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function AssignmentCard({
  id, subject, topic, difficulty, status, score, numQuestions, timeLimitMin, createdAt, childName, role,
}: AssignmentCardProps) {
  const href = role === 'parent' ? `/parent/assignment/${id}` : `/child/assignment/${id}`;

  return (
    <Link href={href} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{subjectIcons[subject] || '📝'}</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{subject.replace('_', ' ')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{topic}</p>
            </div>
          </div>
          {score !== null && score !== undefined && (
            <div className="text-right">
              <p className={`text-2xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {score}%
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[difficulty]}`}>
            {difficulty}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {status.replace('_', ' ')}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {numQuestions} questions
          </span>
          {timeLimitMin && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              {timeLimitMin} min
            </span>
          )}
        </div>

        {childName && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Assigned to: {childName}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
