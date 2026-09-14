import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: ReactNode;
  /** A button or link shown under the description. */
  action?: ReactNode;
  /** Smaller padding for inline sections. */
  compact?: boolean;
}

export default function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center ${
        compact ? 'p-6' : 'p-10'
      }`}
    >
      <p className={`${compact ? 'text-4xl' : 'text-5xl'} mb-3 animate-float`} aria-hidden="true">{icon}</p>
      <p className="font-bold text-gray-900 dark:text-white">{title}</p>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
