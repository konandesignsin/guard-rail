"use client";

import Link from "next/link";

export default function ScanReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-6 sm:p-8">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          Scan report
        </p>
        <h1 className="mt-2 font-sans text-xl font-semibold tracking-tight text-[var(--fg)] sm:text-2xl">
          This report could not be loaded
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[var(--muted)]">
          Something went wrong while reading this scan. Your findings are still stored — try
          again, or open the list of scans.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[12px] text-[var(--muted-subtle)]">
            Reference {error.digest}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--fg)] px-4 text-[14px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/dashboard/scans"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            All scans
          </Link>
        </div>
      </div>
    </div>
  );
}
