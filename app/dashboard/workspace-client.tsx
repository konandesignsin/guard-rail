"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/app/components/logo";
import { ScanBox } from "@/app/dashboard/scan-box";

export interface ScanItem {
  id: string;
  repoName: string | null;
  score: number | null;
  createdAt: string;
}

interface WorkspaceLayoutProps {
  userEmail?: string;
  scans: ScanItem[];
}

export function WorkspaceClient({ userEmail, scans }: WorkspaceLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard shortcut to focus the command-bar input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex h-12 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 z-30 fixed top-0 left-0">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded p-1 text-[var(--muted)] hover:text-[var(--fg)]"
            aria-label="Toggle navigation menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
          <UserButton />
        </div>
      </div>

      {/* Left Sidebar (Cursor-Style) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0 pt-12 md:pt-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Workspace Brand / Header */}
        <div className="flex h-12 items-center justify-between border-b border-[var(--border)] px-4">
          <Logo size="sm" />
          <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
            workspace
          </span>
        </div>

        {/* Sidebar Quick Action: New Scan */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              inputRef.current?.focus();
              setMobileMenuOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-md bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--fg)] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New scan</span>
            </span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
              /
            </kbd>
          </button>
        </div>

        {/* Sidebar Nav & History List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-subtle)]">
              <span>History</span>
              <span className="text-[10px]">{scans.length}</span>
            </div>

            {scans.length === 0 ? (
              <p className="px-2 py-2 text-xs text-[var(--muted-subtle)]">
                No past scans yet.
              </p>
            ) : (
              <div className="mt-1 space-y-0.5">
                {scans.map((s) => {
                  const score = s.score ?? 0;
                  const scoreColor =
                    score >= 90
                      ? "text-[var(--cleared-green)]"
                      : score >= 70
                      ? "text-[var(--squiggle-amber)]"
                      : "text-[var(--squiggle-red)]";

                  return (
                    <Link
                      key={s.id}
                      href={`/dashboard/scans/${s.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-mono text-[11px] font-bold ${scoreColor}`}>
                          {score}
                        </span>
                        <span className="truncate max-w-[130px]">
                          {s.repoName ?? "Scan"}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--muted-subtle)] group-hover:text-[var(--muted)]">
                        {new Date(s.createdAt).toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-subtle)]">
              Shortcuts
            </div>
            <div className="mt-1 space-y-1 px-2 text-xs text-[var(--muted)]">
              <Link
                href="/dashboard/preview-report"
                className="flex items-center justify-between py-1 hover:text-[var(--fg)] transition-colors"
              >
                <span>Sample report</span>
                <span className="font-mono text-[10px] text-[var(--muted-subtle)]">demo</span>
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between py-1 hover:text-[var(--fg)] transition-colors"
              >
                <span>Documentation</span>
                <span className="font-mono text-[10px] text-[var(--muted-subtle)]">ext</span>
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Clerk UserButton */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2 min-w-0">
            <UserButton />
            {userEmail && (
              <span className="truncate text-xs text-[var(--muted)]">
                {userEmail}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Area (Cursor-Style Split View / Center Console) */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pt-12 md:pt-0">
        {/* Top Command Bar / Breadcrumb */}
        <header className="hidden md:flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
          <div className="flex items-center gap-3 text-xs font-mono text-[var(--muted)]">
            <span className="text-[var(--fg)] font-medium">dashboard</span>
            <span>/</span>
            <span>scanner</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/preview-report"
              className="text-xs font-mono text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            >
              preview report &rarr;
            </Link>
          </div>
        </header>

        {/* Workspace Central Content */}
        <div className="flex-1 max-w-4xl w-full mx-auto px-5 py-8 md:py-10 space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-display text-2xl font-normal tracking-tight text-[var(--fg)]">
              Command Scanner
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Analyze public repositories for leaked API secrets, open databases, and security risks.
            </p>
          </div>

          {/* Command-Bar Style Scan Input */}
          <ScanBox inputRef={inputRef} />

          {/* Recent Scans Overview */}
          <section className="space-y-3 pt-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs font-mono">
              <span className="text-[var(--fg)] font-medium">Recent audits</span>
              <span className="text-[var(--muted)]">{scans.length} total</span>
            </div>

            {scans.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-xs">
                <p className="font-medium text-[var(--fg)]">No scans recorded</p>
                <p className="mt-1 text-[var(--muted)] max-w-xs mx-auto">
                  Type or paste a repository URL into the command input above to start.
                </p>
                <div className="mt-4">
                  <Link
                    href="/dashboard/preview-report"
                    className="font-mono text-xs text-[var(--fg)] underline hover:text-white"
                  >
                    View demo audit report &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg bg-[var(--surface)] overflow-hidden">
                {scans.map((scan) => {
                  const score = scan.score ?? 0;
                  const scoreColor =
                    score >= 90
                      ? "text-[var(--cleared-green)] border-[var(--cleared-green)]/30"
                      : score >= 70
                      ? "text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30"
                      : "text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30";

                  return (
                    <Link
                      key={scan.id}
                      href={`/dashboard/scans/${scan.id}`}
                      className="group flex items-center justify-between px-4 py-3 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded border font-mono text-xs font-bold ${scoreColor}`}
                        >
                          {score}
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-medium text-[var(--fg)] truncate">
                            {scan.repoName ?? "Repository"}
                          </p>
                          <p className="text-[11px] text-[var(--muted)]">
                            {new Date(scan.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono text-[11px] text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors">
                        open &rarr;
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
