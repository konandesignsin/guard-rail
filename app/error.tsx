"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/app/components/logo";

export default function Error({
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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--bg)] text-[var(--fg)] p-6">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <Logo size="xl" variant="full" />
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Something went wrong</h1>
          <p className="text-sm text-[var(--muted)]">
            An unexpected error occurred while processing this page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-full bg-[var(--fg)] px-5 py-2 text-xs font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-[var(--border)] px-5 py-2 text-xs font-semibold text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
