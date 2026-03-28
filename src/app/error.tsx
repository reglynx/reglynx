'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500 mt-2">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Go home
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-400 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
