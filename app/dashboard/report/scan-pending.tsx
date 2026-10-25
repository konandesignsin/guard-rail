"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ScanPendingProps {
  repoName: string;
  scanDateLabel: string;
  status: "queued" | "running" | "failed" | "done";
  error: string | null;
}

/**
 * Shown while a scan has not finished yet, and when it failed. Refreshing the
 * server component is enough — no polling endpoint is involved.
 */
export function ScanPending({ repoName, scanDateLabel, status, error }: ScanPendingProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const failed = status === "failed";

  useEffect(() => {
    if (failed) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [failed, router]);

  const checkAgain = () => {
    setChecking(true);
    router.refresh();
    window.setTimeout(() => setChecking(false), 1200);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
              failed
                ? "border-[var(--squiggle-red)]/35 bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)]"
                : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)]"
            }`}
            aria-hidden="true"
          >
            {failed ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v5m0 3.5h.01M10.29 3.86L2.82 17a1.5 1.5 0 001.3 2.25h15.76A1.5 1.5 0 0021.18 17L13.71 3.86a1.5 1.5 0 00-2.6 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeOpacity="0.25" strokeWidth="2.5" />
                <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
            )}
          </span>

          <div className="min-w-0">
            <p className="break-words font-mono text-[13px] text-[var(--muted)]">{repoName}</p>
            <h1 className="mt-1 font-sans text-xl font-semibold tracking-tight text-[var(--fg)] sm:text-2xl">
              {failed ? "This scan could not finish" : "This scan is still running"}
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-[var(--muted)]">
              {failed
                ? error || "The scanner stopped before it produced a report. Running it again usually works."
                : `Started ${scanDateLabel}. Large repositories take a little longer — this page checks again on its own.`}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={checkAgain}
                disabled={checking}
                className="inline-flex min-h-11 items-center rounded-lg bg-[var(--fg)] px-4 text-[14px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {checking ? "Checking…" : "Check again"}
              </button>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                {failed ? "Run a new scan" : "Back to dashboard"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
