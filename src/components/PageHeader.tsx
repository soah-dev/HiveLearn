import Link from 'next/link';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons/links rendered on the right on wide screens and below the title on phones. */
  actions?: ReactNode;
  /** Optional "back" link rendered above the title. */
  back?: { href: string; label: string };
  /** Extra content under the title/subtitle (e.g. a streak pill). */
  children?: ReactNode;
  className?: string;
}

/**
 * Standard page title row. Stacks the title and actions vertically on narrow
 * screens so long titles and multiple buttons never overflow.
 */
export default function PageHeader({ title, subtitle, actions, back, children, className = '' }: PageHeaderProps) {
  return (
    <header className={`mb-8 animate-slide-up ${className}`}>
      {back && (
        <Link
          href={back.href}
          className="no-print inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline mb-3"
        >
          <span aria-hidden="true">&larr;</span> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight break-words">{title}</h1>
          {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          {children}
        </div>
        {actions && (
          <div className="no-print flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-shrink-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
