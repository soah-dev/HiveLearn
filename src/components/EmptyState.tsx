import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import Hexagon from '@/components/ui/Hexagon';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** A button or link shown under the description. */
  action?: ReactNode;
  /** Smaller padding for inline sections. */
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-line-strong text-center', compact ? 'px-6 py-7' : 'px-6 py-10')}>
      <Hexagon size={compact ? 44 : 56} tone="muted" className="mb-3">
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true" />
      </Hexagon>
      <p className="font-display font-semibold text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
