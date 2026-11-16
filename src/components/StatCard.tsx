import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StatGridProps {
  /** Grid column classes. The tiles are divided by hairlines, so fill every row. */
  cols?: string;
  className?: string;
  children: ReactNode;
}

/** A row of stat tiles sharing one outline, divided by hairlines. */
export function StatGrid({ cols = 'grid-cols-2 lg:grid-cols-4', className, children }: StatGridProps) {
  return (
    <dl className={cn('grid gap-px overflow-hidden rounded-2xl border border-line bg-line', cols, className)}>
      {children}
    </dl>
  );
}

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Tint the icon for the one stat a view wants to call out: honey for a reward (streak), brand otherwise. */
  accent?: 'brand' | 'honey' | false;
  className?: string;
}

/** One headline number. Use inside a StatGrid. */
export default function StatCard({ title, value, subtitle, icon: Icon, accent, className }: StatCardProps) {
  return (
    <div className={cn('min-w-0 bg-surface p-4 sm:p-5', className)}>
      <dt className="flex items-center gap-1.5 text-sm text-ink-muted">
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', accent === 'honey' ? 'text-honey-text' : accent ? 'text-brand-text' : 'text-ink-subtle')} aria-hidden="true" />}
        <span className="truncate">{title}</span>
      </dt>
      <dd className="mt-2 break-words text-2xl font-semibold leading-none tracking-tight text-ink sm:text-[28px]">{value}</dd>
      {subtitle && <dd className="mt-1.5 text-xs text-ink-subtle">{subtitle}</dd>}
    </div>
  );
}
