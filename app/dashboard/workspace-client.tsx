"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ScoreRing } from "@/app/dashboard/score-ring";
import { CommandPalette, type CommandItem } from "@/app/dashboard/command-palette";
import { HeroChat } from "@/app/dashboard/hero-chat";

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

interface OnboardingState {
  dismissed: boolean;
  steps: {
    addedCodeOrRepo: boolean;
    ranFirstScan: boolean;
    reviewedFindings: boolean;
  };
}

interface WorkspaceLayoutProps {
  userEmail?: string;
  scans: ScanItem[];
  stats?: DashboardStats;
  isAiEnabled?: boolean;
  userOptIn?: boolean;
  onboarding: OnboardingState;
}

export function WorkspaceClient({ userEmail, scans, stats, isAiEnabled, userOptIn, onboarding }: WorkspaceLayoutProps) {
  const router = useRouter();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isStartingExample, setIsStartingExample] = useState(false);
  const [exampleError, setExampleError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(!onboarding.dismissed);
  const [isDismissingOnboarding, setIsDismissingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");
  const [scanError, setScanError] = useState("");

  const showPreviewRoutes = process.env.NEXT_PUBLIC_SHOW_PREVIEW_ROUTES === "true";

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
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleRunExample() {
    setIsStartingExample(true);
    setExampleError("");
    try {
      const res = await fetch("/api/scan/example", { method: "POST" });
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

  async function handleDismissOnboarding() {
    setIsDismissingOnboarding(true);
    setOnboardingError("");
    try {
      const response = await fetch("/api/onboarding/dismiss", { method: "POST" });
      if (!response.ok) {
        setOnboardingError("Could not dismiss onboarding. Please try again.");
        return;
      }
      setShowOnboarding(false);
    } catch {
      setOnboardingError("Could not dismiss onboarding. Please try again.");
    } finally {
      setIsDismissingOnboarding(false);
    }
  }

  async function handleRepoScan(repoUrl: string) {
    setScanError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error ?? "Could not scan repository. Please verify the URL is public.");
        return;
      }
      router.push(`/dashboard/scans/${data.scanId}`);
    } catch {
      setScanError("Could not reach the scan service. Please check your connection.");
    }
  }

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

  const commandItems: CommandItem[] = [
    {
      id: "cmd-new-scan",
      title: "New scan",
      subtitle: "Scroll to scanner",
      category: "Actions",
      shortcut: "/",
      onSelect: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
    {
      id: "cmd-try-example",
      title: "Try an example",
      subtitle: "Run audit on leaky sample project",
      category: "Actions",
      onSelect: () => handleRunExample(),
    },
    {
      id: "cmd-nav-scans",
      title: "View all scans",
      subtitle: "Navigate to scans history",
      category: "Actions",
      onSelect: () => router.push("/dashboard/scans"),
    },
    {
      id: "cmd-nav-projects",
      title: "View projects",
      subtitle: "Navigate to projects overview",
      category: "Actions",
      onSelect: () => router.push("/dashboard/projects"),
    },
    {
      id: "cmd-nav-settings",
      title: "Settings",
      subtitle: "Manage account and AI preferences",
      category: "Actions",
      onSelect: () => router.push("/dashboard/settings"),
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

  scans.slice(0, 8).forEach((scan) => {
    commandItems.push({
      id: `scan-${scan.id}`,
      title: scan.repoName ?? "Repository scan",
      subtitle: `Score: ${scan.score ?? 0} • ${formatTimeAgo(scan.createdAt)}`,
      category: "Recent Scans",
      onSelect: () => router.push(`/dashboard/scans/${scan.id}`),
    });
  });

  const onboardingSteps = [
    { label: "Add your code or connect a repo", done: onboarding.steps.addedCodeOrRepo },
    { label: "Run your first scan", done: onboarding.steps.ranFirstScan },
    { label: "Review the findings and fixes", done: onboarding.steps.reviewedFindings },
  ];
  const completedOnboardingSteps = onboardingSteps.filter((step) => step.done).length;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-8">
        {/* Hero: 3D space scene + glassmorphism chat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <HeroChat
            isAiEnabled={isAiEnabled ?? false}
            userOptIn={userOptIn ?? false}
            onRepoScan={handleRepoScan}
          />
        </motion.div>

        {scanError && (
          <div className="rounded-lg border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-4 text-sm text-[var(--squiggle-red)]">
            {scanError}
            <button
              type="button"
              onClick={() => setScanError("")}
              className="ml-2 underline hover:text-[var(--squiggle-red)]/80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Onboarding card */}
        {showOnboarding && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-[var(--fg)]">Getting started</h2>
                  <span className="font-mono text-xs text-[var(--muted-subtle)]">
                    {completedOnboardingSteps}/3
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Complete your first security review in three steps.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissOnboarding}
                disabled={isDismissingOnboarding}
                aria-label="Dismiss onboarding"
                className="rounded-md p-1.5 text-[var(--muted-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)] disabled:opacity-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {onboardingSteps.map((step, index) => (
                <li
                  key={step.label}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${
                      step.done
                        ? "border-[var(--cleared-green)]/40 bg-[var(--cleared-green)]/10 text-[var(--cleared-green)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {step.done ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className={`text-sm ${step.done ? "text-[var(--muted)] line-through" : "text-[var(--fg)]"}`}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>

            {onboardingError && (
              <p className="mt-4 text-sm text-[var(--squiggle-red)]">{onboardingError}</p>
            )}
          </motion.section>
        )}

        {/* Onboarding card */}

        {exampleError && (
          <div className="rounded-lg border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-4 text-sm text-[var(--squiggle-red)]">
            {exampleError}
          </div>
        )}

        {/* Empty state */}
        {scans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-6 pt-4"
          >
            <p className="text-center text-sm text-[var(--muted)]">
              No scans yet. Add a repository above or run the example to create your first report.
            </p>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                  <h2 className="font-display text-xl text-[var(--fg)] font-medium">
                    Try a sample audit
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Test Guardrail instantly against a small built-in leaky sample project.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunExample}
                  disabled={isStartingExample}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--fg)] hover:bg-white text-[var(--bg)] px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
                >
                  {isStartingExample ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg)] border-t-transparent" />
                      <span>Running sample audit...</span>
                    </>
                  ) : (
                    <>
                      <span>Try an example</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted-subtle)]">
                  Example finding preview
                </span>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="rounded bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border border-[var(--squiggle-red)]/30 px-2 py-1 text-xs font-bold">
                      HIGH SEVERITY
                    </span>
                    <span className="text-[var(--muted)]">src/lib/supabase.ts : line 5</span>
                  </div>

                  <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg)] p-4 font-mono text-xs">
                    <p className="text-[var(--muted-subtle)] select-none">3  export const supabase = createClient(</p>
                    <p className="text-[var(--muted-subtle)] select-none">4    process.env.NEXT_PUBLIC_SUPABASE_URL,</p>
                    <p className="text-[var(--fg)] font-medium pl-3">
                      <span className="squiggle-red">
                        &quot;eyJhbGciOiJIUzI1NiIsInR5cCI6...service_role_secret_key&quot;
                      </span>
                    </p>
                    <p className="text-[var(--muted-subtle)] select-none">6  );</p>
                  </div>

                  <p className="text-sm text-[var(--fg)] leading-relaxed">
                    Plain note: Administrative service_role keys bypass database Row-Level Security. Exposing them in frontend bundles allows any visitor to read or delete all customer data.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Dashboard content with stats and charts */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-8 pt-4"
          >
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Projects"
                value={stats?.totalScans ?? scans.length}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Open high risks"
                value={stats?.highCount ?? 0}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
                valueColor="text-[var(--squiggle-red)]"
              />
              <StatCard
                label="Average score"
                value={stats?.latestScore ?? 0}
                suffix="/100"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              <StatCard
                label="Fixed since last scan"
                value={stats?.trendDelta && stats.trendDelta > 0 ? stats.trendDelta : 0}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                }
                valueColor="text-[var(--cleared-green)]"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ScoreTrendChart scans={scans} />
              <SeverityBreakdownChart stats={stats} />
            </div>

            {/* Project grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-[var(--fg)]">Recent projects</h2>
                <Link
                  href="/dashboard/projects"
                  className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                >
                  View all &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scans.slice(0, 6).map((scan) => (
                  <ProjectCard key={scan.id} scan={scan} formatTimeAgo={formatTimeAgo} />
                ))}
              </div>
            </div>

            {/* Recent activity timeline */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-[var(--fg)]">Recent activity</h2>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                {scans.slice(0, 5).map((scan, index) => (
                  <TimelineItem
                    key={scan.id}
                    scan={scan}
                    formatTimeAgo={formatTimeAgo}
                    isLast={index === Math.min(4, scans.length - 1)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commandItems}
      />
    </>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  valueColor = "text-[var(--fg)]",
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <span className="text-[var(--muted)]">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold font-mono tabular-nums ${valueColor}`}>
          {value}
        </span>
        {suffix && <span className="text-sm text-[var(--muted)]">{suffix}</span>}
      </div>
    </motion.div>
  );
}

function ScoreTrendChart({ scans }: { scans: ScanItem[] }) {
  const recentScans = scans.slice(0, 10).reverse();
  const maxScore = 100;
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = 40;

  const points = recentScans.map((scan, index) => {
    const x = padding + (index / Math.max(recentScans.length - 1, 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((scan.score ?? 0) / maxScore) * (chartHeight - 2 * padding);
    return { x, y, scan };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-[var(--fg)]">Score trend</h3>
        <span className="text-xs text-[var(--muted)]">Last {recentScans.length} scans</span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((score) => {
          const y = chartHeight - padding - (score / maxScore) * (chartHeight - 2 * padding);
          return (
            <g key={score}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray={score === 0 ? "0" : "4 4"}
              />
              <text
                x={padding - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[var(--muted-subtle)] text-xs"
                style={{ fontSize: "10px" }}
              >
                {score}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--squiggle-red)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="var(--squiggle-red)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}
      </svg>
    </motion.div>
  );
}

function SeverityBreakdownChart({ stats }: { stats?: DashboardStats }) {
  const high = stats?.highCount ?? 0;
  const medium = stats?.mediumCount ?? 0;
  const low = stats?.lowCount ?? 0;
  const total = high + medium + low;

  const segments = [
    { label: "High", value: high, color: "var(--squiggle-red)" },
    { label: "Medium", value: medium, color: "var(--squiggle-amber)" },
    { label: "Low", value: low, color: "var(--cleared-green)" },
  ];

  let cumulativePercent = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-[var(--fg)]">Severity breakdown</h3>
        <span className="text-xs text-[var(--muted)]">{total} total findings</span>
      </div>
      <div className="flex items-center justify-center py-4">
        <svg viewBox="0 0 100 100" className="w-48 h-48">
          {total === 0 ? (
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="12" />
          ) : (
            segments.map((segment) => {
              const percent = (segment.value / total) * 100;
              const startPercent = cumulativePercent;
              cumulativePercent += percent;

              const startAngle = (startPercent / 100) * 360 - 90;
              const endAngle = ((startPercent + percent) / 100) * 360 - 90;

              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 50 + 40 * Math.cos(startRad);
              const y1 = 50 + 40 * Math.sin(startRad);
              const x2 = 50 + 40 * Math.cos(endRad);
              const y2 = 50 + 40 * Math.sin(endRad);

              const largeArcFlag = percent > 50 ? 1 : 0;

              const d = `M ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`;

              return (
                <path
                  key={segment.label}
                  d={d}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="12"
                  strokeLinecap="butt"
                />
              );
            })
          )}
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--fg)] font-bold"
            style={{ fontSize: "16px" }}
          >
            {total}
          </text>
        </svg>
      </div>
      <div className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: segment.color }} />
              <span className="text-[var(--muted)]">{segment.label}</span>
            </div>
            <span className="font-mono font-medium text-[var(--fg)]">{segment.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ProjectCard({ scan, formatTimeAgo }: { scan: ScanItem; formatTimeAgo: (iso: string) => string }) {
  const score = scan.score ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 cursor-pointer hover:border-[var(--border-subtle)] transition-colors"
    >
      <Link href={`/dashboard/scans/${scan.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[var(--fg)] truncate">
              {scan.repoName ?? "Repository"}
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">{formatTimeAgo(scan.createdAt)}</p>
          </div>
          <ScoreRing score={score} size={48} strokeWidth={4} />
        </div>

        {scan.findingCounts && (
          <div className="flex items-center gap-2 pt-2">
            {scan.findingCounts.high > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--squiggle-red-subtle)] px-2 py-1 text-xs font-medium text-[var(--squiggle-red)]">
                {scan.findingCounts.high} high
              </span>
            )}
            {scan.findingCounts.medium > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--squiggle-amber-subtle)] px-2 py-1 text-xs font-medium text-[var(--squiggle-amber)]">
                {scan.findingCounts.medium} med
              </span>
            )}
            {scan.findingCounts.low > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--cleared-green-subtle)] px-2 py-1 text-xs font-medium text-[var(--cleared-green)]">
                {scan.findingCounts.low} low
              </span>
            )}
          </div>
        )}

        <div className="pt-2">
          <span className="text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors">
            View report &rarr;
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function TimelineItem({
  scan,
  formatTimeAgo,
  isLast,
}: {
  scan: ScanItem;
  formatTimeAgo: (iso: string) => string;
  isLast: boolean;
}) {
  const score = scan.score ?? 0;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subtle)] border border-[var(--border)]">
          <svg className="h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        {!isLast && <div className="w-px flex-1 bg-[var(--border)] mt-2" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--fg)] truncate">
              {scan.repoName ?? "Repository scan"}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">{formatTimeAgo(scan.createdAt)}</p>
          </div>
          <span className="font-mono text-sm font-bold text-[var(--fg)]">{score}</span>
        </div>
        {scan.findingCounts && scan.findingCounts.total > 0 && (
          <p className="text-xs text-[var(--muted)] mt-2">
            {scan.findingCounts.total} findings ({scan.findingCounts.high}h / {scan.findingCounts.medium}m / {scan.findingCounts.low}l)
          </p>
        )}
      </div>
    </div>
  );
}
