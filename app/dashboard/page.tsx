import { Suspense } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { ScanBox } from "@/app/dashboard/scan-box";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* Slim Top Bar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] rounded"
            >
              guardrail
            </Link>
            <nav className="flex items-center gap-4 text-xs font-medium">
              <Link
                href="/dashboard"
                className="text-[var(--ink)] font-semibold"
              >
                Scan
              </Link>
              <a
                href="#history"
                className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                History
              </a>
              <Link
                href="/dashboard/preview-report"
                className="text-[var(--link-blue)] hover:underline"
              >
                Preview report
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 space-y-12">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-6 w-48 rounded bg-[var(--surface-subtle)]" />
              <div className="h-64 w-full rounded-xl bg-[var(--surface-subtle)]" />
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </main>
    </div>
  );
}

async function DashboardContent() {
  const user = await getOrCreateUser();

  return (
    <>
      {/* Intro greeting */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            Scan your app
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)] max-w-[65ch]">
            Inspect your AI-generated code for exposed keys and open database security rules.
          </p>
        </div>
        <p className="text-xs text-[var(--muted-light)]">
          Signed in as <span className="font-medium text-[var(--muted)]">{user.email}</span>
        </p>
      </div>

      {/* Big Scan Box */}
      <div className="mt-6">
        <ScanBox />
      </div>

      {/* Recent Scans Section */}
      <section id="history" className="pt-2">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <h2 className="font-display text-lg font-bold text-[var(--ink)]">
            Recent scans
          </h2>
          <span className="text-xs text-[var(--muted-light)]">0 completed scans</span>
        </div>

        {/* Friendly Empty State */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--muted)]">
            <svg
              className="h-5 w-5 text-[var(--muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--ink)]">
            No scans yet. Paste a GitHub link above to run your first one.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-md mx-auto">
            Once you scan a project from Lovable, Bolt, or GitHub, your audit summary and security score will appear here.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard/preview-report"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--link-blue)] hover:underline"
            >
              See what an audit report looks like &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
