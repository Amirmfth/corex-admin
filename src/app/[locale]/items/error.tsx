'use client';

import { useEffect } from 'react';

function getFriendlyMessage(error: Error, fallback: string) {
  const raw = error?.message?.trim();
  if (!raw) {
    return fallback;
  }

  const looksLikeJson =
    (raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'));
  if (looksLikeJson) {
    try {
      JSON.parse(raw);
      return fallback;
    } catch {
      return fallback;
    }
  }

  return raw;
}

export default function ItemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = getFriendlyMessage(error, 'Please try again or refresh the page.');

  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
      <h2 className="text-lg font-semibold">Something went wrong loading items.</h2>
      <p className="mt-2 text-sm text-rose-600">{message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-transparent bg-rose-600 px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-rose-500"
      >
        Retry
      </button>
    </div>
  );
}
