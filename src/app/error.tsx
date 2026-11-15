'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import Hexagon from '@/components/ui/Hexagon';
import Button, { buttonClass } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <Hexagon size={56} tone="warn" className="mb-4">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </Hexagon>
        <h1 className="font-display text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The page hit an unexpected error. You can try again, or head back to your dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className={buttonClass({ variant: 'secondary' })}>Home</Link>
        </div>
      </div>
    </main>
  );
}
