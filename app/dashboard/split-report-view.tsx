"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { ScoreRing, getScoreRating } from "@/app/dashboard/score-ring";
import type { HeatMapFile } from "@/app/dashboard/repo-heat-map";
import { AiExplanationSection } from "@/app/dashboard/ai-explanation-section";
import { AiChatPanel } from "@/app/dashboard/ai-chat-panel";
import { AI_PROVIDER_NAME } from "@/lib/legal";

export interface FindingReportItem {
  id: string;
  severity: "high" | "medium" | "low";
  check?: string;
  title: string;
  file: string;
  line: number;
  snippetLines?: { num: number; code: string; isSquiggle?: boolean }[];
  explanation: string;
  fix: string;
  category?: "Security" | "Quality" | "Cleanup";
}

export interface SplitReportViewProps {
  scanId?: string;
  score: number;
  repoName: string;
  subtitle?: string;
  findings: FindingReportItem[];
  files?: HeatMapFile[];
  passedChecks?: string[];
  backHref?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isAiGlobalEnabled?: boolean;
  initialUserOptIn?: boolean;
}

// Helper to determine category
function getFindingCategory(f: FindingReportItem): "Security" | "Quality" | "Cleanup" {
  if (f.category) return f.category;
  const lowerTitle = f.title.toLowerCase();
  const lowerFix = f.fix.toLowerCase();
  const lowerFile = f.file.toLowerCase();

  if (
    lowerTitle.includes("never imported") ||
    lowerTitle.includes("unused dependenc") ||
    lowerFix.includes("npm uninstall") ||
    (lowerFile.endsWith("package.json") && lowerTitle.includes("is in both dependencies"))
  ) {
    return "Cleanup";
  }

  if (f.check === "quality") {
    return "Quality";
  }

  return "Security";
}

// Generate single prompt for finding
function generatePromptForFinding(f: FindingReportItem): string {
  return `In ${f.file} at line ${f.line}: ${f.title}. ${f.fix}. Please make this exact fix and explain the changes made.`;
}

// Group findings by pattern (e.g. unused dependencies or multiple console.logs)
interface GroupedFindingItem {
  id: string;
  key: string;
  title: string;
  isGroup: boolean;
  severity: "high" | "medium" | "low";
  category: "Security" | "Quality" | "Cleanup";
  file: string;
  line: number;
  explanation: string;
  fix: string;
  check?: string;
  snippetLines?: { num: number; code: string; isSquiggle?: boolean }[];
  items: FindingReportItem[];
}

export function SplitReportView({
  scanId,
  score,
  repoName,
  subtitle,
  findings,
  files = [],
  passedChecks = [],
  backHref = "/dashboard",
  isLoading = false,
  error = null,
  onRetry,
  isAiGlobalEnabled = false,
  initialUserOptIn = false,
}: SplitReportViewProps) {
  // Opt-in state
  const [userOptIn, setUserOptIn] = useState(initialUserOptIn);

  // Mode: "simple" (Plain English) or "technical" (Developer details)
  const [mode, setMode] = useState<"simple" | "technical">("simple");

  // Filters
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "Security" | "Quality" | "Cleanup">("all");

  // Selection & Grouping
  const [selectedId, setSelectedId] = useState<string>(findings[0]?.id ?? "");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});

  // Mobile detail view toggle
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Files scanned collapsible section
  const [filesSectionOpen, setFilesSectionOpen] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);

  // AI Prompt Collapsible in detail pane
  const [isAiPromptExpanded, setIsAiPromptExpanded] = useState(false);

  // Copy feedback states
  const [copiedFindingId, setCopiedFindingId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // All-findings AI prompt generation
  const [allPrompt, setAllPrompt] = useState<string | null>(null);
  const [allPromptTitle, setAllPromptTitle] = useState("");
  const [allPromptWarnings, setAllPromptWarnings] = useState<string[]>([]);
  const [allPromptLoading, setAllPromptLoading] = useState(false);
  const [allPromptError, setAllPromptError] = useState<string | null>(null);
  const [allPromptUsedAI, setAllPromptUsedAI] = useState(false);
  const [allPromptCopied, setAllPromptCopied] = useState(false);
  const [allPromptExpanded, setAllPromptExpanded] = useState(false);

  // Tooltip states for accessible toggles
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [showModeTooltip, setShowModeTooltip] = useState(false);

  // Normalize findings with category and unused-dependency fixes
  const normalizedFindings: FindingReportItem[] = findings.map((f) => {
    const isUnusedDep =
      f.title.toLowerCase().includes("never imported") ||
      f.title.toLowerCase().includes("unused dependenc");

    if (isUnusedDep) {
      return {
        ...f,
        severity: "low",
        category: "Cleanup",
      };
    }

    return {
      ...f,
      category: getFindingCategory(f),
    };
  });

  // Calculate high/medium/low counts
  const highCount = normalizedFindings.filter((f) => f.severity === "high").length;
  const mediumCount = normalizedFindings.filter((f) => f.severity === "medium").length;
  const lowCount = normalizedFindings.filter((f) => f.severity === "low").length;

  const securityCount = normalizedFindings.filter((f) => f.category === "Security").length;
  const qualityCount = normalizedFindings.filter((f) => f.category === "Quality").length;
  const cleanupCount = normalizedFindings.filter((f) => f.category === "Cleanup").length;

  // Plain English sentence summary
  const summarySentence = (() => {
    if (normalizedFindings.length === 0) {
      return "All security and quality checks passed cleanly. No issues detected.";
    }
    const criticalText =
      highCount > 0
        ? `${highCount} critical ${highCount === 1 ? "security vulnerability" : "security vulnerabilities"}`
        : "No critical issues";
    const mediumText =
      mediumCount > 0
        ? `${mediumCount} moderate ${mediumCount === 1 ? "warning" : "warnings"}`
        : null;
    const lowText =
      lowCount > 0
        ? `${lowCount} ${lowCount === 1 ? "suggestion" : "suggestions"} to clean up`
        : null;

    const tailParts = [mediumText, lowText].filter(Boolean);
    if (tailParts.length === 0) {
      return `${criticalText}. Good work!`;
    }
    return `${criticalText}. ${tailParts.join(" and ")}.`;
  })();

  // Filter findings by severity and category
  const filteredFindings = normalizedFindings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    return true;
  });

  // Group repeated findings of the same type (e.g. multiple unused dependencies or console.logs)
  const groupedList: GroupedFindingItem[] = [];
  const groupMap = new Map<string, FindingReportItem[]>();

  for (const item of filteredFindings) {
    let groupKey: string | null = null;
    const lowerTitle = item.title.toLowerCase();

    if (lowerTitle.includes("never imported in source code") || lowerTitle.includes("unused dependenc")) {
      groupKey = "unused-dependencies";
    } else if (lowerTitle.includes("console.log left in source code")) {
      groupKey = "console-logs";
    } else if (lowerTitle.includes("comment in source code")) {
      groupKey = "todo-comments";
    }

    if (groupKey) {
      const existing = groupMap.get(groupKey) ?? [];
      existing.push(item);
      groupMap.set(groupKey, existing);
    }
  }

  const processedGroupKeys = new Set<string>();

  for (const item of filteredFindings) {
    let groupKey: string | null = null;
    const lowerTitle = item.title.toLowerCase();

    if (lowerTitle.includes("never imported in source code") || lowerTitle.includes("unused dependenc")) {
      groupKey = "unused-dependencies";
    } else if (lowerTitle.includes("console.log left in source code")) {
      groupKey = "console-logs";
    } else if (lowerTitle.includes("comment in source code")) {
      groupKey = "todo-comments";
    }

    if (groupKey && (groupMap.get(groupKey)?.length ?? 0) > 1) {
      if (!processedGroupKeys.has(groupKey)) {
        processedGroupKeys.add(groupKey);
        const groupItems = groupMap.get(groupKey)!;
        const first = groupItems[0];
        let groupTitle = `${groupItems.length} unused dependencies in package.json`;
        if (groupKey === "console-logs") {
          groupTitle = `${groupItems.length} console.log statements left in source code`;
        } else if (groupKey === "todo-comments") {
          groupTitle = `${groupItems.length} TODO/FIXME markers in source code`;
        }

        groupedList.push({
          id: `group-${groupKey}`,
          key: groupKey,
          title: groupTitle,
          isGroup: true,
          severity: first.severity,
          category: first.category ?? "Cleanup",
          file: first.file,
          line: first.line,
          explanation: first.explanation,
          fix: first.fix,
          check: first.check,
          items: groupItems,
        });
      }
    } else {
      groupedList.push({
        id: item.id,
        key: item.id,
        title: item.title,
        isGroup: false,
        severity: item.severity,
        category: item.category ?? "Security",
        file: item.file,
        line: item.line,
        explanation: item.explanation,
        fix: item.fix,
        check: item.check,
        snippetLines: item.snippetLines,
        items: [item],
      });
    }
  }

  // Active finding resolution
  const activeSelected =
    normalizedFindings.find((f) => f.id === selectedId) ??
    filteredFindings[0] ??
    normalizedFindings[0];

  // Generate AI prompt for all findings
  const handleGenerateAllPrompt = async () => {
    if (normalizedFindings.length === 0 || !scanId) return;

    if (!isAiGlobalEnabled || !userOptIn) {
      const staticPrompt = [
        `Review and fix all ${normalizedFindings.length} findings for ${repoName}:`,
        "",
        ...normalizedFindings.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.file}:${f.line} - ${f.title}\n   Fix: ${f.fix}`),
        "",
        "Please apply these code fixes systematically and explain each change."
      ].join("\n");
      setAllPrompt(staticPrompt);
      setAllPromptTitle(`Fix all ${normalizedFindings.length} findings`);
      setAllPromptUsedAI(false);
      setAllPromptExpanded(true);
      return;
    }

    setAllPromptLoading(true);
    setAllPromptError(null);
    setAllPromptExpanded(true);

    try {
      const res = await fetch("/api/ai/fix-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          findingIds: normalizedFindings.map((f) => f.id),
          mode: "all",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAllPromptError(data.error || "Failed to generate prompt");
        const staticFallback = [
          `Review and fix all ${normalizedFindings.length} findings for ${repoName}:`,
          "",
          ...normalizedFindings.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.file}:${f.line} - ${f.title}\n   Fix: ${f.fix}`),
          "",
          "Please apply these code fixes systematically and explain each change."
        ].join("\n");
        setAllPrompt(staticFallback);
        setAllPromptTitle(`Fix all ${normalizedFindings.length} findings`);
        setAllPromptUsedAI(false);
        return;
      }

      setAllPrompt(data.prompt);
      setAllPromptTitle(data.title);
      setAllPromptWarnings(data.warnings || []);
      setAllPromptUsedAI(data.usedAI);
    } catch {
      setAllPromptError("Network error. Showing static prompt instead.");
      const staticFallback = [
        `Review and fix all ${normalizedFindings.length} findings for ${repoName}:`,
        "",
        ...normalizedFindings.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.file}:${f.line} - ${f.title}\n   Fix: ${f.fix}`),
        "",
        "Please apply these code fixes systematically and explain each change."
      ].join("\n");
      setAllPrompt(staticFallback);
      setAllPromptTitle(`Fix all ${normalizedFindings.length} findings`);
      setAllPromptUsedAI(false);
    } finally {
      setAllPromptLoading(false);
    }
  };

  const handleCopyAllPrompt = async () => {
    if (!allPrompt) return;
    try {
      await navigator.clipboard.writeText(allPrompt);
      setAllPromptCopied(true);
      setTimeout(() => setAllPromptCopied(false), 2200);
    } catch {
      // clipboard error
    }
  };

  // Copy single finding prompt
  const handleCopyFindingPrompt = (f: FindingReportItem) => {
    const text = generatePromptForFinding(f);
    navigator.clipboard.writeText(text);
    setCopiedFindingId(f.id);
    setTimeout(() => setCopiedFindingId(null), 2000);
  };

  // Copy snippet or fix
  const handleCopyFix = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Keyboard navigation up and down arrow in findings list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (filteredFindings.length === 0) return;
    const currentIndex = filteredFindings.findIndex((f) => f.id === activeSelected?.id);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % filteredFindings.length;
      setSelectedId(filteredFindings[nextIndex].id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + filteredFindings.length) % filteredFindings.length;
      setSelectedId(filteredFindings[prevIndex].id);
    }
  };

  // Files breakdown logic
  const filesWithFindingsCount = new Map<string, { count: number; maxSeverity: "high" | "medium" | "low" }>();
  for (const f of normalizedFindings) {
    const curr = filesWithFindingsCount.get(f.file) ?? { count: 0, maxSeverity: "low" };
    const sevPriority = { high: 3, medium: 2, low: 1 };
    const higher = sevPriority[f.severity] > sevPriority[curr.maxSeverity] ? f.severity : curr.maxSeverity;
    filesWithFindingsCount.set(f.file, {
      count: curr.count + 1,
      maxSeverity: higher,
    });
  }

  const allFilesList: { path: string; findingCount: number; maxSeverity: "high" | "medium" | "low" | "none" }[] = [];
  if (files.length > 0) {
    for (const file of files) {
      const stats = filesWithFindingsCount.get(file.path);
      allFilesList.push({
        path: file.path,
        findingCount: stats?.count ?? 0,
        maxSeverity: stats?.maxSeverity ?? "none",
      });
    }
  } else {
    for (const [path, stats] of filesWithFindingsCount.entries()) {
      allFilesList.push({
        path,
        findingCount: stats.count,
        maxSeverity: stats.maxSeverity,
      });
    }
  }

  // Sort files: files with findings first, then alphabetical
  allFilesList.sort((a, b) => {
    if (a.findingCount > 0 && b.findingCount === 0) return -1;
    if (a.findingCount === 0 && b.findingCount > 0) return 1;
    return a.path.localeCompare(b.path);
  });

  const filesWithFindings = allFilesList.filter((f) => f.findingCount > 0);
  const displayedFiles = showAllFiles ? allFilesList : filesWithFindings;

  // Rating badge for header
  const rating = getScoreRating(score);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-[var(--surface-subtle)] rounded-lg w-1/3" />
        <div className="h-32 bg-[var(--surface)] border border-[var(--border)] rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[600px]">
          <div className="md:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl" />
          <div className="md:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center space-y-4 shadow-lg">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border border-[var(--squiggle-red)]/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-[var(--fg)]">Scan could not be loaded</h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed">{error}</p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 bg-[var(--fg)] text-[var(--bg)] rounded-lg text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Try again
              </button>
            )}
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[var(--surface-subtle)] text-[var(--fg)] border border-[var(--border)] rounded-lg text-xs hover:bg-[var(--surface-hover)] transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col font-sans selection:bg-[var(--fg)] selection:text-[var(--bg)]">
      {/* SECTION 1: SUMMARY HEADER (top of page) */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {/* Top navigation row: back, title/repo name, and action buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
                aria-label="Back to dashboard"
              >
                <span aria-hidden="true">&larr;</span>
                <span>Dashboard</span>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--fg)] break-words leading-tight">
                  {repoName}
                </h1>
                {subtitle && (
                  <p className="text-xs text-[var(--muted)] mt-0.5 font-normal">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Actions: Primary, Secondary, and Switch */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Simple / Technical switch with tooltip */}
              <div className="relative inline-flex items-center">
                <div
                  className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5 text-xs font-medium"
                  role="group"
                  aria-label="Report detail level"
                >
                  <button
                    type="button"
                    onClick={() => setMode("simple")}
                    className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none ${
                      mode === "simple"
                        ? "bg-[var(--surface)] text-[var(--fg)] shadow-xs font-semibold"
                        : "text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                    aria-pressed={mode === "simple"}
                  >
                    Plain English
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("technical")}
                    className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none ${
                      mode === "technical"
                        ? "bg-[var(--surface)] text-[var(--fg)] shadow-xs font-semibold"
                        : "text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                    aria-pressed={mode === "technical"}
                  >
                    Developer details
                  </button>
                </div>
                <button
                  type="button"
                  onMouseEnter={() => setShowModeTooltip(true)}
                  onMouseLeave={() => setShowModeTooltip(false)}
                  onFocus={() => setShowModeTooltip(true)}
                  onBlur={() => setShowModeTooltip(false)}
                  className="ml-1.5 text-[var(--muted)] hover:text-[var(--fg)] p-1 rounded-full cursor-help focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
                  aria-label="About display modes"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {showModeTooltip && (
                  <div
                    role="tooltip"
                    className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--fg)] shadow-xl z-50 leading-relaxed"
                  >
                    <p className="font-semibold mb-1">Display Mode</p>
                    <p className="text-[var(--muted)]">
                      <strong className="text-[var(--fg)]">Plain English:</strong> Clear rationale and actionable solutions in conversational terms.<br />
                      <strong className="text-[var(--fg)]">Developer details:</strong> Rule identifiers, code lines, and technical impact.
                    </p>
                  </div>
                )}
              </div>

              {/* Secondary button: "New scan" */}
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] px-3.5 py-1.5 text-xs font-medium text-[var(--fg)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
              >
                New scan
              </Link>

              {/* Primary button: "Generate one prompt for all findings" (AI) */}
              {isAiGlobalEnabled && normalizedFindings.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateAllPrompt}
                  disabled={allPromptLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fg)] hover:opacity-90 disabled:opacity-50 text-[var(--bg)] px-4 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none"
                >
                  {allPromptLoading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--bg)] border-t-transparent" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Generate one prompt for all findings</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Lower summary row: Score Ring + Sentence + Category/Severity Chips */}
          <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Score Ring with label and calculation tooltip */}
              <div className="relative flex items-center gap-3">
                <ScoreRing score={score} size={64} strokeWidth={6} />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${rating.badgeClass}`}>
                      {rating.label}
                    </span>
                    <button
                      type="button"
                      onMouseEnter={() => setShowScoreTooltip(true)}
                      onMouseLeave={() => setShowScoreTooltip(false)}
                      onFocus={() => setShowScoreTooltip(true)}
                      onBlur={() => setShowScoreTooltip(false)}
                      className="text-[var(--muted)] hover:text-[var(--fg)] p-1 rounded-full cursor-help focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
                      aria-label="How score is calculated"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted)]">Overall Security & Quality</p>
                </div>

                {showScoreTooltip && (
                  <div
                    role="tooltip"
                    className="absolute left-0 top-full mt-2 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--fg)] shadow-xl z-50 leading-relaxed"
                  >
                    <p className="font-semibold mb-1">Score Calculation</p>
                    <p className="text-[var(--muted)] mb-2">
                      Starts at 100 points, then deductions are applied:
                    </p>
                    <ul className="space-y-1 font-mono text-[11px] text-[var(--muted)]">
                      <li className="flex justify-between text-[var(--squiggle-red)]">
                        <span>High severity:</span>
                        <span>-15 pts each</span>
                      </li>
                      <li className="flex justify-between text-[var(--squiggle-amber)]">
                        <span>Medium severity:</span>
                        <span>-5 pts each</span>
                      </li>
                      <li className="flex justify-between text-[var(--cleared-green)]">
                        <span>Low / Cleanup:</span>
                        <span>-1 pt each</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Plain English Sentence */}
              <div className="hidden sm:block border-l border-[var(--border)] pl-4 max-w-md">
                <p className="text-sm font-medium text-[var(--fg)] leading-snug">
                  {summarySentence}
                </p>
              </div>
            </div>

            {/* Severity and Category Chips Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--muted)] mr-1">Severity:</span>
              <button
                type="button"
                onClick={() => setSeverityFilter(severityFilter === "all" ? "all" : "all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none ${
                  severityFilter === "all"
                    ? "border-[var(--fg)] bg-[var(--surface-hover)] text-[var(--fg)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                All ({normalizedFindings.length})
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter(severityFilter === "high" ? "all" : "high")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--squiggle-red)] focus-visible:outline-none ${
                  severityFilter === "high"
                    ? "border-[var(--squiggle-red)] bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] font-semibold"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--squiggle-red)]" aria-hidden="true" />
                <span>High ({highCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter(severityFilter === "medium" ? "all" : "medium")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--squiggle-amber)] focus-visible:outline-none ${
                  severityFilter === "medium"
                    ? "border-[var(--squiggle-amber)] bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] font-semibold"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--squiggle-amber)]" aria-hidden="true" />
                <span>Medium ({mediumCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter(severityFilter === "low" ? "all" : "low")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--cleared-green)] focus-visible:outline-none ${
                  severityFilter === "low"
                    ? "border-[var(--cleared-green)] bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] font-semibold"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--cleared-green)]" aria-hidden="true" />
                <span>Low ({lowCount})</span>
              </button>

              <div className="h-4 w-[1px] bg-[var(--border)] mx-1 hidden sm:block" />

              <span className="text-xs text-[var(--muted)] mr-1 hidden sm:inline">Category:</span>
              <button
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === "Security" ? "all" : "Security")}
                className={`rounded-lg px-2 py-0.5 text-xs font-medium border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none ${
                  categoryFilter === "Security"
                    ? "border-[var(--fg)] bg-[var(--surface-hover)] text-[var(--fg)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                Security ({securityCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === "Quality" ? "all" : "Quality")}
                className={`rounded-lg px-2 py-0.5 text-xs font-medium border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none ${
                  categoryFilter === "Quality"
                    ? "border-[var(--fg)] bg-[var(--surface-hover)] text-[var(--fg)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                Quality ({qualityCount})
              </button>
              {cleanupCount > 0 && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === "Cleanup" ? "all" : "Cleanup")}
                  className={`rounded-lg px-2 py-0.5 text-xs font-medium border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none ${
                    categoryFilter === "Cleanup"
                      ? "border-[var(--fg)] bg-[var(--surface-hover)] text-[var(--fg)]"
                      : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Cleanup ({cleanupCount})
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* AI-generated all-findings prompt panel */}
      {allPromptExpanded && allPrompt && (
        <div className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-[var(--fg)]">{allPromptTitle}</h3>
                {allPromptUsedAI && (
                  <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-subtle)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                    AI-generated
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAllPromptExpanded(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            {allPromptWarnings.length > 0 && (
              <div className="rounded-lg border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-3">
                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-[var(--squiggle-red)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[var(--squiggle-red)]">Important warnings:</p>
                    <ul className="mt-1 space-y-1">
                      {allPromptWarnings.map((w, idx) => (
                        <li key={idx} className="text-xs text-[var(--squiggle-red)]">{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--fg)] leading-relaxed select-all">
                {allPrompt}
              </pre>
            </div>

            {allPromptError && (
              <p className="text-xs text-[var(--squiggle-amber)]">{allPromptError}</p>
            )}

            <div className="flex items-center justify-between">
              {allPromptUsedAI && (
                <span className="text-xs text-[var(--muted)]">Generated with {AI_PROVIDER_NAME}</span>
              )}
              <button
                type="button"
                onClick={handleCopyAllPrompt}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fg)] hover:opacity-90 text-[var(--bg)] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ml-auto focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{allPromptCopied ? "✓ Copied" : "Copy prompt"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: COMPACT FILES SCANNED SECTION */}
      <section className="border-b border-[var(--border)] bg-[var(--surface-subtle)]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setFilesSectionOpen(!filesSectionOpen)}
              className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none rounded py-1"
              aria-expanded={filesSectionOpen}
            >
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${filesSectionOpen ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Files scanned ({allFilesList.length})</span>
              {filesWithFindings.length > 0 && (
                <span className="text-[11px] text-[var(--squiggle-amber)]">
                  &bull; {filesWithFindings.length} with findings
                </span>
              )}
            </button>

            {filesSectionOpen && allFilesList.length > filesWithFindings.length && (
              <button
                type="button"
                onClick={() => setShowAllFiles(!showAllFiles)}
                className="text-xs text-[var(--muted)] hover:text-[var(--fg)] underline transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
              >
                {showAllFiles ? "Show only files with findings" : `Show all ${allFilesList.length} files`}
              </button>
            )}
          </div>

          {filesSectionOpen && (
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] max-h-52 overflow-y-auto space-y-1">
              {displayedFiles.length === 0 ? (
                <p className="text-xs text-[var(--muted)] py-2">No files recorded for this scan.</p>
              ) : (
                displayedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-[var(--surface-hover)] text-xs font-mono transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          file.maxSeverity === "high"
                            ? "bg-[var(--squiggle-red)]"
                            : file.maxSeverity === "medium"
                            ? "bg-[var(--squiggle-amber)]"
                            : file.maxSeverity === "low"
                            ? "bg-[var(--cleared-green)]"
                            : "bg-[var(--border)]"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-[var(--fg)] truncate">{file.path}</span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)] shrink-0 ml-4">
                      {file.findingCount > 0 ? `${file.findingCount} issue${file.findingCount > 1 ? "s" : ""}` : "clean"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: STATE 1 - CLEAN RESULT ("No issues found") */}
      {normalizedFindings.length === 0 ? (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border border-[var(--cleared-green)]/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--fg)]">No issues found</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              We scanned {allFilesList.length > 0 ? allFilesList.length : "all"} files across this repository. No security vulnerabilities or code quality red flags were detected.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-medium text-[var(--fg)] border border-[var(--border)] transition-colors"
              >
                Run another scan
              </Link>
            </div>
          </div>
        </main>
      ) : (
        /* SECTION 2: TWO-PANE LAYOUT (Left findings, Right detail) */
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6 min-h-0">
          {/* LEFT PANE: Findings list grouped by severity */}
          <section
            aria-label="Findings list"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            className={`w-full md:w-80 lg:w-96 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none ${
              showMobileDetail ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--surface-subtle)]/40 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Findings ({filteredFindings.length})
              </h2>
              <span className="text-[11px] text-[var(--muted)]">Arrow keys to navigate</span>
            </div>

            {/* Empty filter message */}
            {filteredFindings.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-medium text-[var(--fg)]">No matching findings</p>
                <p className="text-xs text-[var(--muted)]">
                  No issues match the selected severity and category filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSeverityFilter("all");
                    setCategoryFilter("all");
                  }}
                  className="mt-2 text-xs text-[var(--fg)] underline hover:opacity-80 cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]" role="listbox">
                {groupedList.map((item) => {
                  const isGroup = item.isGroup;
                  const isExpanded = !!expandedGroupKeys[item.key];
                  const isSelected = activeSelected && item.items.some((f) => f.id === activeSelected.id);

                  const sevBadge = {
                    high: { dot: "bg-[var(--squiggle-red)]", text: "text-[var(--squiggle-red)]", label: "High" },
                    medium: { dot: "bg-[var(--squiggle-amber)]", text: "text-[var(--squiggle-amber)]", label: "Medium" },
                    low: { dot: "bg-[var(--cleared-green)]", text: "text-[var(--cleared-green)]", label: "Low" },
                  }[item.severity];

                  if (isGroup) {
                    return (
                      <div key={item.id} className="transition-colors">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedGroupKeys((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }));
                            setSelectedId(item.items[0].id);
                            setShowMobileDetail(true);
                          }}
                          className={`w-full text-left p-3.5 transition-colors cursor-pointer focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none ${
                            isSelected
                              ? "bg-[var(--surface-hover)] border-l-2 border-l-[var(--fg)]"
                              : "hover:bg-[var(--surface-hover)]/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${sevBadge.dot}`} aria-hidden="true" />
                              <span className={`text-[11px] font-semibold uppercase tracking-wider ${sevBadge.text}`}>
                                {sevBadge.label}
                              </span>
                              <span className="text-[10px] text-[var(--muted)] font-mono bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                                {item.items.length} grouped
                              </span>
                            </div>
                            <span className="text-xs text-[var(--muted)]">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-[var(--fg)] line-clamp-2 leading-relaxed">
                            {item.title}
                          </p>

                          <div className="mt-2 font-mono text-[11px] text-[var(--muted)] truncate">
                            {item.file}
                          </div>
                        </button>

                        {/* Expandable grouped items list */}
                        {isExpanded && (
                          <div className="bg-[var(--surface-subtle)]/80 pl-4 border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                            {item.items.map((subItem) => {
                              const isSubSelected = activeSelected?.id === subItem.id;
                              return (
                                <button
                                  key={subItem.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedId(subItem.id);
                                    setShowMobileDetail(true);
                                  }}
                                  className={`w-full text-left p-2.5 transition-colors cursor-pointer text-xs focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none ${
                                    isSubSelected
                                      ? "bg-[var(--surface-hover)] font-medium text-[var(--fg)] border-l-2 border-l-[var(--fg)]"
                                      : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)]/50"
                                  }`}
                                >
                                  <div className="line-clamp-2 leading-snug">{subItem.title}</div>
                                  <div className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                                    line {subItem.line}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        setShowMobileDetail(true);
                      }}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none ${
                        isSelected
                          ? "bg-[var(--surface-hover)] border-l-2 border-l-[var(--fg)]"
                          : "hover:bg-[var(--surface-hover)]/70"
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {/* Severity Dot AND Text Label */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${sevBadge.dot}`} aria-hidden="true" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${sevBadge.text}`}>
                          {sevBadge.label}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] px-1.5 py-0.2 rounded border border-[var(--border-subtle)]">
                          {item.category}
                        </span>
                      </div>

                      {/* Title: wrapped to 2 lines with no truncation */}
                      <p className="text-xs sm:text-sm font-medium text-[var(--fg)] line-clamp-2 leading-snug">
                        {item.title}
                      </p>

                      {/* file:line in mono */}
                      <div className="mt-2 font-mono text-[11px] text-[var(--muted)] flex items-center justify-between">
                        <span className="truncate max-w-[200px]">{item.file}</span>
                        <span>:{item.line}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* RIGHT PANE: Detail panel with max reading width of ~720px */}
          <section
            aria-label="Finding detail panel"
            className={`flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8 overflow-y-auto ${
              !showMobileDetail ? "hidden md:block" : "block"
            }`}
          >
            {/* Mobile back button to list view */}
            <div className="md:hidden pb-4 mb-4 border-b border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowMobileDetail(false)}
                className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)] py-1.5 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]"
              >
                &larr; Back to findings list
              </button>
            </div>

            {activeSelected ? (
              <div className="max-w-[720px] mx-auto space-y-6">
                {/* Header details: Severity pill, Title, ONE location chip */}
                <div className="space-y-3 pb-5 border-b border-[var(--border)]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        activeSelected.severity === "high"
                          ? "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30"
                          : activeSelected.severity === "medium"
                          ? "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30"
                          : "bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border-[var(--cleared-green)]/30"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          activeSelected.severity === "high"
                            ? "bg-[var(--squiggle-red)]"
                            : activeSelected.severity === "medium"
                            ? "bg-[var(--squiggle-amber)]"
                            : "bg-[var(--cleared-green)]"
                        }`}
                        aria-hidden="true"
                      />
                      <span>{activeSelected.severity.toUpperCase()} SEVERITY</span>
                    </span>

                    {/* Location as ONE Chip */}
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-[var(--fg)] bg-[var(--surface-subtle)] border border-[var(--border)] px-2.5 py-0.5 rounded-full">
                      <span>{activeSelected.file}:{activeSelected.line}</span>
                    </span>

                    {/* Category pill */}
                    <span className="text-xs text-[var(--muted)] bg-[var(--surface-subtle)] border border-[var(--border)] px-2.5 py-0.5 rounded-full">
                      {activeSelected.category ?? "Security"}
                    </span>

                    {/* Developer mode rule ID */}
                    {mode === "technical" && activeSelected.check && (
                      <span className="font-mono text-xs text-[var(--muted)] bg-[var(--surface-subtle)] border border-[var(--border)] px-2.5 py-0.5 rounded-full">
                        rule: {activeSelected.check}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--fg)] leading-snug">
                    {activeSelected.title}
                  </h2>
                </div>

                {/* Developer Mode Code Snippet with offending line highlighted */}
                {mode === "technical" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Offending Code & Context
                      </h3>
                      <span className="font-mono text-xs text-[var(--muted)]">
                        {activeSelected.file}:{activeSelected.line}
                      </span>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs overflow-x-auto">
                      {activeSelected.snippetLines && activeSelected.snippetLines.length > 0 ? (
                        <table className="w-full border-collapse">
                          <tbody>
                            {activeSelected.snippetLines.map((line) => {
                              const isOffending = line.isSquiggle || line.num === activeSelected.line;
                              return (
                                <tr
                                  key={line.num}
                                  className={isOffending ? "bg-[var(--squiggle-red-subtle)] text-[var(--fg)] font-medium" : "text-[var(--muted)]"}
                                >
                                  <td className="pr-3 text-right select-none text-[var(--muted-subtle)] w-8">
                                    {line.num}
                                  </td>
                                  <td className="font-mono whitespace-pre">{line.code}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-3 bg-[var(--surface-subtle)]/50 rounded text-[var(--muted)] space-y-1">
                          <div className="text-[11px] text-[var(--muted)]">
                            File: <span className="text-[var(--fg)]">{activeSelected.file}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-full bg-[var(--squiggle-red)]" />
                            <span className="text-[var(--fg)] font-medium">Issue detected at line {activeSelected.line}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* "Why it matters" in plain words */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Why it matters
                  </h3>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/30 p-4">
                    <p className="text-[15px] text-[var(--fg)] leading-[1.6]">
                      {activeSelected.explanation}
                    </p>
                  </div>
                </div>

                {/* "How to fix" with a code block and ONE copy button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--cleared-green)]">
                      How to fix
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopyFix(activeSelected.fix)}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none rounded px-2 py-1"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{copiedSnippet ? "✓ Copied fix" : "Copy fix"}</span>
                    </button>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--fg)] leading-relaxed whitespace-pre-wrap break-words">
                    {activeSelected.fix}
                  </div>
                </div>

                {/* AI Explanation Section (on-demand) */}
                {scanId && (
                  <AiExplanationSection
                    key={activeSelected.id}
                    finding={activeSelected}
                    scanId={scanId}
                    isAiGlobalEnabled={isAiGlobalEnabled}
                    userOptIn={userOptIn}
                    onUserOptInChange={setUserOptIn}
                    aiProviderName={AI_PROVIDER_NAME}
                  />
                )}

                {/* Collapsed-by-default "AI fix prompt" with ONE copy button */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsAiPromptExpanded(!isAiPromptExpanded)}
                    className="w-full p-3.5 flex items-center justify-between text-left text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
                    aria-expanded={isAiPromptExpanded}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${isAiPromptExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>AI Fix Prompt</span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)]">
                      {isAiPromptExpanded ? "Click to collapse" : "Click to view prompt"}
                    </span>
                  </button>

                  {isAiPromptExpanded && (
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] space-y-3">
                      <p className="font-mono text-xs text-[var(--muted)] leading-relaxed bg-[var(--bg)] p-3 rounded-lg border border-[var(--border-subtle)] select-all">
                        &quot;{generatePromptForFinding(activeSelected)}&quot;
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyFindingPrompt(activeSelected)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fg)] hover:opacity-90 text-[var(--bg)] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>{copiedFindingId === activeSelected.id ? "✓ Copied prompt" : "Copy AI prompt"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-xs text-[var(--muted)]">
                Select a finding from the list to inspect details.
              </div>
            )}
          </section>
        </main>
      )}

      {/* AI Chat Panel */}
      {scanId && (
        <AiChatPanel
          scanId={scanId}
          findings={findings}
          isAiGlobalEnabled={isAiGlobalEnabled}
          initialUserOptIn={userOptIn}
          providerName={AI_PROVIDER_NAME}
        />
      )}
    </div>
  );
}
