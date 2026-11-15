import { ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type AlertTone = 'bad' | 'good' | 'warn' | 'info';

const tones: Record<AlertTone, string> = {
  bad: 'border-bad/25 bg-bad-soft text-bad-text',
  good: 'border-good/25 bg-good-soft text-good-text',
  warn: 'border-warn/25 bg-warn-soft text-warn-text',
  info: 'border-info/25 bg-info-soft text-info-text',
};

const icons = { bad: TriangleAlert, good: CircleCheck, warn: TriangleAlert, info: Info };

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/** Inline message for errors, confirmations and notes. */
export default function Alert({ tone = 'bad', title, children, onDismiss, className }: AlertProps) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm', tones[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
