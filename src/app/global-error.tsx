"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-rose-50">
        <div className="mx-auto mt-24 max-w-lg rounded-3xl border border-rose-200 bg-[var(--surface)] p-8 text-rose-700 shadow-lg">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-rose-600">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-transparent bg-rose-600 px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-rose-500"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
