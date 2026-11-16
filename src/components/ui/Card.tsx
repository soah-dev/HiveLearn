import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Brand-tinted surface for the one thing on a page that deserves emphasis. */
  highlight?: boolean;
}

const paddings = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

/** The standard surface. Flat with a hairline border; shadows are for overlays only. */
export default function Card({ padding = 'md', highlight = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border',
        highlight ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface',
        paddings[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** A card whose children are rows separated by hairlines. */
export function ListCard({ className, children, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn('divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface', className)} {...rest}>
      {children}
    </ul>
  );
}

interface SectionHeaderProps {
  title: ReactNode;
  /** Shown next to the title in a quieter weight. */
  count?: number;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}

/** Heading row for a page section: title (+count) on the left, one action on the right. */
export function SectionHeader({ title, count, description, action, id, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-lg font-semibold text-ink">
          {title}
          {count !== undefined && <span className="ml-2 text-sm font-medium text-ink-subtle">{count}</span>}
        </h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="no-print shrink-0">{action}</div>}
    </div>
  );
}
