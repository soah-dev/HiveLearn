import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons/links rendered on the right on wide screens and below the title on phones. */
  actions?: ReactNode;
  /** Optional "back" control above the title: a link, or a button when given onClick. */
  back?: { href: string; label: string } | { onClick: () => void; label: string };
  /** Extra content under the title/subtitle. */
  children?: ReactNode;
  className?: string;
}

const backClass = 'no-print mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink';

/**
 * Standard page title row. Stacks the title and actions vertically on narrow
 * screens so long titles and multiple buttons never overflow.
 */
export default function PageHeader({ title, subtitle, actions, back, children, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 lg:mb-8', className)}>
      {back && ('href' in back ? (
        <Link href={back.href} className={backClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
        </Link>
      ) : (
        <button type="button" onClick={back.onClick} className={backClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
        </button>
      ))}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-bold tracking-tight text-ink sm:text-[28px] sm:leading-9">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
          {children}
        </div>
        {actions && (
          <div className="no-print flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
