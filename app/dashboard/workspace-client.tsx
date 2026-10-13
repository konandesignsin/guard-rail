"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/app/components/logo";
import { ScanBox } from "@/app/dashboard/scan-box";
import { ScoreRing } from "@/app/dashboard/score-ring";
import { CommandPalette, type CommandItem } from "@/app/dashboard/command-palette";

export interface ScanItem {
  id: string;
  repoName: string | null;
  score: number | null;
  createdAt: string;
  findingCounts?: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

export interface DashboardStats {
  latestScore: number | null;
  totalScans: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  trendDelta: number | null;
}

interface WorkspaceLayoutProps {
  userEmail?: string;
  scans: ScanItem[];
  stats?: DashboardStats;
}

export function WorkspaceClient({ userEmail, scans, stats }: WorkspaceLayoutProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isStartingExample, setIsStartingExample] = useState(false);
  const [exampleError, setExampleError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showPreviewRoutes = process.env.NEXT_PUBLIC_SHOW_PREVIEW_ROUTES === "true";

  // Global keyboard shortcuts:
  // - '/' focuses the command-bar input
  // - Ctrl+K / Cmd+K opens the Command Palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleRunExample() {
    setIsStartingExample(true);
    setExampleError("");
    try {
      const res = await fetch("/api/scan/example", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setExampleError(data.error || "Failed to start example scan.");
        setIsStartingExample(false);
        return;
      }
      router.push(`/dashboard/scans/${data.scanId}`);
    } catch {
      setExampleError("Connection error while loading example scan.");
      setIsStartingExample(false);
    }
  }

  // Format relative time helper
  function formatTimeAgo(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Build command palette items
  const commandItems: CommandItem[] = [
    {
      id: "cmd-new-scan",
      title: "New scan",
      subtitle: "Focus repository scanner input",
      category: "Actions",
      shortcut: "/",
      onSelect: () => inputRef.current?.focus(),
    },
    {
      id: "cmd-try-example",
      title: "Try an example",
      subtitle: "Run audit on leaky sample project",
      category: "Actions",
      onSelect: () => handleRunExample(),
    },
  ];

  if (showPreviewRoutes) {
    commandItems.push({
      id: "cmd-sample-report",
      title: "Sample report",
      subtitle: "View demo audit report",
      category: "Actions",
      onSelect: () => router.push("/dashboard/preview-report"),
    });
  }

  // Add recent scans to command palette
  scans.slice(0, 8).forEach((scan) => {
    commandItems.push({
      id: `scan-${scan.id}`,
      title: scan.repoName ?? "Repository scan",
      subtitle: `Score: ${scan.score ?? 0} • ${formatTimeAgo(scan.createdAt)}`,
      category: "Recent Scans",
      onSelect: () => router.push(`/dashboard/scans/${scan.id}`),
    });
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex h-12 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 z-30 fixed top-0 left-0">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="rounded p-1.5 text-[var(--muted)] hover:text-[var(--fg)]"
            aria-label="Open command palette"
          >
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
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

      {/* Left Sidebar */}
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

        {/* Sidebar Actions: New Scan + Command Palette */}
        <div className="p-3 space-y-1.5">
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

          <button
            type="button"
            onClick={() => {
              setCommandPaletteOpen(true);
              setMobileMenuOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Command Palette</span>
            </span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-subtle)]">
              ⌘K
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
                        {formatTimeAgo(s.createdAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-subtle)]">
              Quick actions
            </div>
            <div className="mt-1 space-y-1 px-2 text-xs text-[var(--muted)]">
              <button
                type="button"
                onClick={handleRunExample}
                disabled={isStartingExample}
                className="w-full text-left flex items-center justify-between py-1 hover:text-[var(--fg)] transition-colors cursor-pointer"
              >
                <span>Try an example</span>
                <span className="font-mono text-[10px] text-[var(--squiggle-red)]">leaky</span>
              </button>

              {showPreviewRoutes && (
                <Link
                  href="/dashboard/preview-report"
                  className="flex items-center justify-between py-1 hover:text-[var(--fg)] transition-colors"
                >
                  <span>Sample report</span>
                  <span className="font-mono text-[10px] text-[var(--muted-subtle)]">demo</span>
                </Link>
              )}
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

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pt-12 md:pt-0">
        {/* Top Command Bar */}
        <header className="hidden md:flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
          <div className="flex items-center gap-3 text-xs font-mono text-[var(--muted)]">
            <span className="text-[var(--fg)] font-medium">dashboard</span>
            <span>/</span>
            <span>scanner</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-mono text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              <span>Search commands</span>
              <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.2 text-[10px] text-[var(--muted-subtle)]">
                Ctrl+K
              </kbd>
            </button>

            {showPreviewRoutes && (
              <Link
                href="/dashboard/preview-report"
                className="text-xs font-mono text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
              >
                preview report &rarr;
              </Link>
            )}
          </div>
        </header>

        {/* Workspace Central Content */}
        <div className="flex-1 max-w-4xl w-full mx-auto px-5 py-8 md:py-10 space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-normal tracking-tight text-[var(--fg)]">
              What do you want to check?
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--muted)]">
              Paste a repository URL or select an existing project. We check your files in memory and never store your code.
            </p>
          </div>

          {/* Command-Bar Style Scan Input */}
          <ScanBox inputRef={inputRef} />

          {exampleError && (
            <div className="rounded-md border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-3 text-xs text-[var(--squiggle-red)]">
              {exampleError}
            </div>
          )}

          {/* FIRST RUN EMPTY STATE: When user has 0 scans */}
          {scans.length === 0 ? (
            <div className="space-y-6 pt-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                  <div>
                    <h2 className="font-display text-lg text-[var(--fg)] font-medium">
                      Try a sample audit
                    </h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Test Guardrail instantly against a small built-in leaky sample project.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunExample}
                    disabled={isStartingExample}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--fg)] hover:bg-white text-[var(--bg)] px-4 py-2 font-mono text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
                  >
                    {isStartingExample ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--bg)] border-t-transparent" />
                        <span>Running sample audit...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Try an example</span>
                        <span className="font-normal text-[11px] opacity-75">&rarr;</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sample finding preview with squiggle and note in the empty area */}
                <div className="space-y-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted-subtle)]">
                    Example finding preview
                  </span>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="rounded bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border border-[var(--squiggle-red)]/30 px-2 py-0.5 text-[10px] font-bold">
                        HIGH SEVERITY
                      </span>
                      <span className="text-[var(--muted)]">src/lib/supabase.ts : line 5</span>
                    </div>

                    <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg)] p-3 font-mono text-xs">
                      <p className="text-[var(--muted-subtle)] select-none">3  export const supabase = createClient(</p>
                      <p className="text-[var(--muted-subtle)] select-none">4    process.env.NEXT_PUBLIC_SUPABASE_URL,</p>
                      <p className="text-[var(--fg)] font-medium pl-3">
                        <span className="squiggle-red">
                          &quot;eyJhbGciOiJIUzI1NiIsInR5cCI6...service_role_secret_key&quot;
                        </span>
                      </p>
                      <p className="text-[var(--muted-subtle)] select-none">6  );</p>
                    </div>

                    <p className="text-xs text-[var(--fg)] leading-relaxed">
                      Plain note: Administrative service_role keys bypass database Row-Level Security. Exposing them in frontend bundles allows any visitor to read or delete all customer data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SUMMARY AND LIST: When user has 1+ scans */
            <div className="space-y-8 pt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Card 1: Latest score ring */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                      Latest Score
                    </span>
                    <p className="text-xs text-[var(--muted-subtle)]">
                      Most recent scan
                    </p>
                    {stats?.trendDelta != null && (
                      <div className="pt-1 flex items-center gap-1 font-mono text-[11px]">
                        <span
                          className={
                            stats.trendDelta > 0
                              ? "text-[var(--cleared-green)]"
                              : stats.trendDelta < 0
                              ? "text-[var(--squiggle-red)]"
                              : "text-[var(--muted)]"
                          }
                        >
                          {stats.trendDelta > 0
                            ? `+${stats.trendDelta}`
                            : stats.trendDelta}{" "}
                          vs previous
                        </span>
                      </div>
                    )}
                  </div>
                  {stats?.latestScore != null && (
                    <ScoreRing score={stats.latestScore} size={64} strokeWidth={6} />
                  )}
                </div>

                {/* Card 2: High Severity Count */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                    High Risks
                  </span>
                  <div className="my-2">
                    <span className="font-mono text-2xl font-bold text-[var(--squiggle-red)]">
                      {stats?.highCount ?? 0}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted-subtle)] font-mono">
                    Critical leaks & bypasses
                  </span>
                </div>

                {/* Card 3: Medium & Low Counts */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                    Med / Low Risks
                  </span>
                  <div className="my-2 flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-bold text-[var(--squiggle-amber)]">
                      {stats?.mediumCount ?? 0}
                    </span>
                    <span className="text-xs text-[var(--muted-subtle)]">/</span>
                    <span className="text-lg text-[var(--cleared-green)]">
                      {stats?.lowCount ?? 0}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted-subtle)] font-mono">
                    Medium and low notices
                  </span>
                </div>

                {/* Card 4: Total Scans */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                    Total Audits
                  </span>
                  <div className="my-2">
                    <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                      {stats?.totalScans ?? scans.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted-subtle)] font-mono">
                    Completed repository scans
                  </span>
                </div>
              </div>

              {/* Recent audits clean list */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs font-mono">
                  <span className="text-[var(--fg)] font-medium">Recent audits</span>
                  <span className="text-[var(--muted)]">{scans.length} total</span>
                </div>

                <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg bg-[var(--surface)] overflow-hidden shadow-xs">
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
                            className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-xs font-bold ${scoreColor}`}
                          >
                            {score}
                          </span>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-medium text-[var(--fg)] truncate">
                              {scan.repoName ?? "Repository"}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                              <span>{formatTimeAgo(scan.createdAt)}</span>
                              {scan.findingCounts && (
                                <span className="font-mono text-[10px] text-[var(--muted-subtle)]">
                                  {scan.findingCounts.total} findings (
                                  <span className="text-[var(--squiggle-red)]">{scan.findingCounts.high}h</span>/
                                  <span className="text-[var(--squiggle-amber)]">{scan.findingCounts.medium}m</span>
                                  )
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="font-mono text-[11px] text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors flex items-center gap-1">
                          <span>Open report</span>
                          <span>&rarr;</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Accessible Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commandItems}
      />
    </div>
  );
}
