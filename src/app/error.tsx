'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8">
        <p className="text-5xl mb-4">😵</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          The page hit an unexpected error. You can try again, or head back to your dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            Try again
          </button>
          <Link href="/" className="px-5 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
