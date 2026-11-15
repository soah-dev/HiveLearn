import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import LoadingSpinner from '@/components/LoadingSpinner';

const widths = {
  narrow: 'max-w-3xl',
  medium: 'max-w-4xl',
  wide: 'max-w-6xl',
};

interface PageProps {
  /** narrow: forms and reading; medium: single lists; wide: dashboards. */
  width?: keyof typeof widths;
  className?: string;
  children: ReactNode;
}

/** The <main> of every signed-in page: one set of gutters and three widths. */
export default function Page({ width = 'wide', className, children }: PageProps) {
  return (
    <main className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10', widths[width], className)}>
      {children}
    </main>
  );
}

/** Full-height spinner shown while a page's data loads. */
export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/** Centered one-line message for "not found" and load-failure states. */
export function PageMessage({ tone = 'neutral', children }: { tone?: 'neutral' | 'bad'; children: ReactNode }) {
  return (
    <div className={cn('flex min-h-[40vh] items-center justify-center p-8 text-center', tone === 'bad' ? 'text-bad-text' : 'text-ink-muted')}>
      {children}
    </div>
  );
}
