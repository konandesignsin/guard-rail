"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiChatPanel } from "@/app/dashboard/ai-chat-panel";
import { ScoreRing, getScoreRating } from "@/app/dashboard/score-ring";
import { AI_PROVIDER_NAME } from "@/lib/legal";
import { FindingDetail } from "./finding-detail";
import {
  SEVERITY_LABEL,
  SEVERITY_RANK,
  describeRule,
  sortFindings,
  staticAllFindingsPrompt,
  summarySentence,
} from "@/lib/report/rules";
import { exportFileName, toJson, toMarkdown } from "@/lib/report/export";
import type {
  Category,
  FindingStatus,
  ReportData,
  ReportFinding,
  Severity,
} from "@/lib/report/types";

type DiffTab = "all" | "new" | "open" | "fixed";
type SortMode = "severity" | "file" | "newest";
type ViewMode = "findings" | "files";

const STATUS_RANK: Record<FindingStatus, number> = { new: 0, open: 1, fixed: 2 };

const REPORT_STYLES = `
.report-rise {
  animation: report-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes report-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .report-rise {
    animation: none;
  }
}
@media print {
  .report-root .report-rise {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

@media print {
  .report-root {
    background: #ffffff !important;
    color: #111114 !important;
  }
  .report-root .print-hide {
    display: none !important;
  }
  .report-root .print-inline {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
    position: static !important;
  }
  .report-root .print-plain,
  .report-root .print-plain * {
    background: transparent !important;
    color: #111114 !important;
    border-color: #d6d6db !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
  .report-root .print-expand {
    display: block !important;
  }
  .report-root .print-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .report-root .print-white {
    background: #ffffff !important;
  }
  .report-root button[aria-label="Open AI chat assistant"] {
    display: none !important;
  }
}
`;

interface Row {
  key: string;
  severity: Severity;
  category: Category;
  label: string;
  items: ReportFinding[];
}

function severityDot(severity: Severity): string {
  if (severity === "high") return "bg-[var(--squiggle-red)]";
  if (severity === "medium") return "bg-[var(--squiggle-amber)]";
  return "bg-[var(--cleared-green)]";
}

function severityText(severity: Severity): string {
  if (severity === "high") return "text-[var(--squiggle-red)]";
  if (severity === "medium") return "text-[var(--squiggle-amber)]";
  return "text-[var(--cleared-green)]";
}

function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 8"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M1 4.5 Q6 1.5 11 4.5 T21 4.5 T31 4.5 T41 4.5 T51 4.5 T61 4.5 T71 4.5 T81 4.5 T91 4.5 T101 4.5 T111 4.5 T119 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--cleared-green)]/35 bg-[var(--cleared-green-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--cleared-green)]">
      New
    </span>
  );
}

export function ReportView({ data }: { data: ReportData }) {
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("findings");
  const [diff, setDiff] = useState<DiffTab>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("severity");
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Pagination is tied to the current filter signature, so changing a filter
  // starts again at 20 without needing an effect.
  const [page, setPage] = useState<{ key: string; count: number }>({ key: "", count: 20 });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const [selectedId, setSelectedId] = useState<string>(data.findings[0]?.id ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [devMode, setDevMode] = useState(false);
  const [showScoreTip, setShowScoreTip] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [copiedAll, setCopiedAll] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);

  const [userOptIn, setUserOptIn] = useState(data.initialUserOptIn);
  const [askRequest, setAskRequest] = useState<{ finding: ReportFinding; nonce: number } | null>(
    null,
  );

  const filterKey = `${view}|${diff}|${severityFilter}|${categoryFilter}|${query.trim()}|${sort}`;
  const visible = page.key === filterKey ? page.count : 20;

  const current = useMemo(() => sortFindings(data.findings.filter((f) => f.status !== "fixed")), [data.findings]);
  const fixed = useMemo(() => sortFindings(data.findings.filter((f) => f.status === "fixed")), [data.findings]);

  const base = diff === "fixed" ? fixed : diff === "new"
    ? current.filter((f) => f.status === "new")
    : diff === "open"
      ? current.filter((f) => f.status === "open")
      : current;

  const filtered = base.filter((finding) => {
    if (severityFilter !== "all" && finding.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && finding.category !== categoryFilter) return false;
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      const rule = describeRule(finding.check, finding.title);
      const haystack = `${finding.title} ${finding.file} ${rule.label} ${finding.category}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const ordered = (() => {
    if (sort === "file") {
      return [...filtered].sort(
        (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
      );
    }
    if (sort === "newest") {
      return [...filtered].sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
          a.file.localeCompare(b.file),
      );
    }
    return sortFindings(filtered);
  })();

  const rows: Row[] = (() => {
    const list: Row[] = [];
    const map = new Map<string, Row>();
    for (const finding of ordered) {
      const rule = describeRule(finding.check, finding.title);
      const key = `${finding.severity}|${rule.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(finding);
        continue;
      }
      const row: Row = {
        key,
        severity: finding.severity,
        category: finding.category,
        label: rule.label,
        items: [finding],
      };
      map.set(key, row);
      list.push(row);
    }
    return list;
  })();

  const visibleRows = rows.slice(0, visible);
  const firstToFix = current[0] ?? null;
  const activeFinding =
    data.findings.find((finding) => finding.id === selectedId) ??
    filtered[0] ??
    null;

  const justFixed = data.hasPrevious && data.counts.fixed > 0;
  const activeFilterCount =
    (severityFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0);

  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [exportOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const isPhone = window.matchMedia("(max-width: 1023px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (isPhone) document.body.style.overflow = "hidden";
    sheetRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen]);

  const select = (finding: ReportFinding) => {
    setSelectedId(finding.id);
    setSheetOpen(true);
  };

  const copyAllPrompt = async () => {
    if (current.length === 0) return;
    try {
      await navigator.clipboard.writeText(staticAllFindingsPrompt(current, data.repoName));
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 2200);
    } catch {
      setCopiedAll(false);
    }
  };

  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const rescan = async () => {
    if (!data.repoFullName) return;
    setRescanning(true);
    setRescanError(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: `https://github.com/${data.repoFullName}` }),
      });
      const body = await response.json();
      if (!response.ok || !body?.scanId) {
        setRescanError(body?.error ?? "Could not start the scan. Try again in a moment.");
        return;
      }
      router.push(`/dashboard/scans/${body.scanId}`);
    } catch {
      setRescanError("Network error. Try again in a moment.");
    } finally {
      setRescanning(false);
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (ordered.length === 0) return;
    const index = ordered.findIndex((finding) => finding.id === activeFinding?.id);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = ordered[(Math.max(index, -1) + 1) % ordered.length];
      setSelectedId(next.id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous = ordered[(index <= 0 ? ordered.length : index) - 1];
      setSelectedId(previous.id);
    } else if (event.key === "Enter" && activeFinding) {
      event.preventDefault();
      setSheetOpen(true);
    }
  };

  const filesWithFindings = useMemo(() => {
    const bySeverity: Record<Severity | "none", number> = { high: 0, medium: 1, low: 2, none: 3 };
    return data.files
      .filter((file) => file.findingCount > 0)
      .filter((file) =>
        query.trim() ? file.path.toLowerCase().includes(query.trim().toLowerCase()) : true,
      )
      .sort(
        (a, b) =>
          bySeverity[a.maxSeverity] - bySeverity[b.maxSeverity] ||
          b.findingCount - a.findingCount ||
          a.path.localeCompare(b.path),
      );
  }, [data.files, query]);

  const rating = getScoreRating(data.score);
  const tabs: { id: DiffTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: current.length },
    { id: "new", label: "New", count: data.counts.new },
    { id: "open", label: "Still open", count: data.counts.open },
    { id: "fixed", label: "Fixed", count: data.counts.fixed },
  ];

  return (
    <div className="report-root h-full overflow-y-auto bg-[var(--bg)] pb-20 font-sans text-[var(--fg)] [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_h4]:font-sans">
      <style>{REPORT_STYLES}</style>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------- header */}
        <header className="pt-5 sm:pt-8">
          <div className="print-hide">
            <Link
              href="/dashboard/scans"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
              </svg>
              All scans
            </Link>
          </div>

          <div className="mt-4 print-plain">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              Scan report
            </p>
            <h1 className="mt-2 max-w-full break-words font-sans text-[26px] font-semibold leading-tight tracking-tight text-[var(--fg)] sm:text-3xl">
              {data.repoName}
            </h1>
            <Squiggle className="mt-2 h-2 w-40 text-[var(--squiggle-red)]" />

            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--muted)]">
              <span>{data.scanDateLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{data.filesScanned} files scanned</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[12px]">scan {data.scanId.slice(0, 7)}</span>
            </p>
          </div>

          {/* score + verdict + one plain sentence */}
          <div className="report-rise mt-6 flex flex-wrap items-center gap-x-5 gap-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-4 sm:p-5 print-plain">
            <ScoreRing score={data.score} size={92} strokeWidth={7} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${rating.badgeClass}`}
                >
                  {rating.label}
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowScoreTip((open) => !open)}
                    onBlur={() => setShowScoreTip(false)}
                    aria-expanded={showScoreTip}
                    aria-label="How is this score calculated?"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:text-[var(--fg)] print-hide"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  {showScoreTip && (
                    <div
                      role="tooltip"
                      className="absolute left-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[13px] leading-6 text-[var(--muted)] shadow-xl"
                    >
                      <p className="mb-1 font-semibold text-[var(--fg)]">How the score works</p>
                      <p>
                        Start at 100. Each High finding costs 15 points, each Medium costs 5 and
                        each Low costs 1. The result never drops below 0.
                      </p>
                      <p className="mt-2 font-mono text-[12px] text-[var(--muted)]">
                        100 − 15×High − 5×Medium − 1×Low
                      </p>
                    </div>
                  )}
                </div>
                <span className="text-[12px] text-[var(--muted)]">out of 100</span>
              </div>

              <p className="mt-2 text-[17px] font-medium leading-7 text-[var(--fg)] sm:text-lg">
                {summarySentence(data.counts)}
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                {data.counts.security} security · {data.counts.quality} quality
              </p>
            </div>
          </div>

          {/* chips */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSeverityFilter("all");
                setCategoryFilter("all");
              }}
              aria-pressed={severityFilter === "all" && categoryFilter === "all"}
              className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                severityFilter === "all" && categoryFilter === "all"
                  ? "border-[var(--fg)]/40 bg-[var(--surface-hover)] text-[var(--fg)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              All {current.length}
            </button>
            {(["high", "medium", "low"] as const).map((severity) => {
              const count = severity === "high" ? data.counts.high : severity === "medium" ? data.counts.medium : data.counts.low;
              const active = severityFilter === severity;
              return (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setSeverityFilter(active ? "all" : severity)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? `border-current bg-[var(--surface-hover)] ${severityText(severity)}`
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${severityDot(severity)}`} aria-hidden="true" />
                  {SEVERITY_LABEL[severity]} {count}
                </button>
              );
            })}

            <span className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" aria-hidden="true" />

            {(["Security", "Quality"] as const).map((category) => {
              const count = category === "Security" ? data.counts.security : data.counts.quality;
              const active = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(active ? "all" : category)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? "border-[var(--fg)]/40 bg-[var(--surface-hover)] text-[var(--fg)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {category} {count}
                </button>
              );
            })}
          </div>

          {/* actions */}
          <div className="mt-4 flex flex-wrap items-stretch gap-2 print-hide">
            <button
              type="button"
              onClick={copyAllPrompt}
              disabled={current.length === 0}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--fg)] px-4 text-[14px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {copiedAll ? "Copied fix prompt" : "Copy fix prompt for all findings"}
            </button>

            {data.repoFullName && (
              <button
                type="button"
                onClick={rescan}
                disabled={rescanning}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
              >
                {rescanning ? "Starting…" : "Re-scan"}
              </button>
            )}

            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                aria-expanded={exportOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                Export
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {exportOpen && (
                <div
                  role="menu"
                  aria-label="Export report"
                  className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      download(exportFileName(data, "md"), toMarkdown(data), "text/markdown")
                    }
                    className="flex min-h-11 w-full items-center px-4 text-left text-[14px] text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    Download as Markdown
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      download(exportFileName(data, "json"), toJson(data), "application/json")
                    }
                    className="flex min-h-11 w-full items-center px-4 text-left text-[14px] text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    Download as JSON
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setExportOpen(false);
                      window.print();
                    }}
                    className="flex min-h-11 w-full items-center border-t border-[var(--border-subtle)] px-4 text-left text-[14px] text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    Print
                  </button>
                </div>
              )}
            </div>
          </div>

          {rescanError && (
            <p className="mt-2 text-[13px] text-[var(--squiggle-amber)]">{rescanError}</p>
          )}

          {justFixed && (
            <p className="mt-3 text-[13px] text-[var(--muted)]">
              {data.counts.fixed} finding{data.counts.fixed === 1 ? "" : "s"} fixed since the
              previous scan of this repo.
            </p>
          )}

          {firstToFix && (
            <section
              aria-labelledby="fix-this-first"
              className="report-rise mt-5 rounded-2xl border border-[var(--squiggle-red)]/25 bg-[var(--squiggle-red-subtle)]/40 p-4 print-block print-plain"
            >
              <h2
                id="fix-this-first"
                className="font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                Fix this first
              </h2>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${severityText(firstToFix.severity)}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${severityDot(firstToFix.severity)}`}
                      aria-hidden="true"
                    />
                    {SEVERITY_LABEL[firstToFix.severity]}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[16px] font-medium leading-snug text-[var(--fg)]">
                    {firstToFix.title}
                  </p>
                  <p className="mt-1 truncate font-mono text-[12px] text-[var(--muted)]">
                    {firstToFix.file}:{firstToFix.line}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 print-hide">
                  <button
                    type="button"
                    onClick={() => select(firstToFix)}
                    className="inline-flex min-h-11 items-center rounded-lg bg-[var(--fg)] px-4 text-[14px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
                  >
                    Open
                  </button>
                  {data.aiEnabled && userOptIn && (
                    <button
                      type="button"
                      onClick={() => setAskRequest({ finding: firstToFix, nonce: Date.now() })}
                      className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      Ask AI
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </header>

        {/* --------------------------------------------------- what we checked */}
        <details className="group mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 print-plain">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-medium text-[var(--fg)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-[var(--muted)] transition-transform group-open:rotate-90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
              </svg>
              What we checked
            </span>
            <span className="text-[13px] text-[var(--muted)]">{data.filesScanned} files</span>
          </summary>

          <div className="space-y-5 border-t border-[var(--border-subtle)] px-4 py-4">
            <div>
              <p className="text-[13px] uppercase tracking-[0.12em] text-[var(--muted)]">Checks that ran</p>
              <ul className="mt-2 space-y-1.5">
                {data.checkCounts.map((check) => (
                  <li key={check.check} className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="text-[var(--fg)]">{check.label}</span>
                    <span className="font-mono text-[13px] text-[var(--muted)]">
                      {check.count} finding{check.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] uppercase tracking-[0.12em] text-[var(--muted)]">Not scanned, and why</p>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-6 text-[var(--muted)]">
                <li>
                  <span className="font-mono text-[13px] text-[var(--fg)]">node_modules</span>,{" "}
                  <span className="font-mono text-[13px] text-[var(--fg)]">.git</span> and build
                  output (<span className="font-mono text-[13px]">dist</span>,{" "}
                  <span className="font-mono text-[13px]">build</span>,{" "}
                  <span className="font-mono text-[13px]">.next</span>) — third-party and generated
                  code, not yours.
                </li>
                <li>
                  Lockfiles — generated, and thousands of lines long.
                </li>
                <li>
                  Images, fonts, video and archives — not text, nothing to read.
                </li>
                <li>
                  Single files over 1 MB and repositories over 2,000 files — too large for one pass.
                </li>
              </ul>
              <p className="mt-2 text-[14px] leading-6 text-[var(--muted)]">
                <span className="font-mono text-[13px] text-[var(--fg)]">.env</span> files are read
                in memory to look for exposed keys. Their contents are never stored.
              </p>
            </div>

            <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/60 p-3 text-[14px] leading-6 text-[var(--fg)]">
              Automated checks can miss things and flag safe code. This is a first pass, not a
              full audit.
            </p>
          </div>
        </details>

        {/* ------------------------------------------------ compare with previous */}
        <section className="mt-6 print-block" aria-labelledby="compare-heading">
          <h2 id="compare-heading" className="font-sans text-lg font-semibold tracking-tight text-[var(--fg)]">
            Compare with the previous scan
          </h2>

          {data.hasPrevious ? (
            <>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                Matched by rule, file and message. Line numbers are ignored, so moving code does not
                count as a fix.
                {data.previousDateLabel ? ` Previous scan: ${data.previousDateLabel}.` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 print-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDiff(tab.id)}
                    aria-pressed={diff === tab.id}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                      diff === tab.id
                        ? "border-[var(--fg)]/40 bg-[var(--surface-hover)] text-[var(--fg)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {tab.label}
                    <span className="font-mono text-[12px] text-[var(--muted)]">{tab.count}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 p-4 text-[14px] leading-6 text-[var(--muted)]">
              <span className="font-medium text-[var(--fg)]">First scan.</span> Run this repository
              again and GuardRail will show what is new, what is still open and what you fixed.
            </p>
          )}
        </section>

        <Squiggle className="mt-6 h-1.5 w-full text-[var(--border)]" />

        {/* ----------------------------------------------------------- filters */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 print-hide">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5"
              role="group"
              aria-label="Report view"
            >
              {(["findings", "files"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={`inline-flex min-h-11 items-center rounded-md px-3 text-[13px] transition-colors ${
                    view === mode
                      ? "bg-[var(--surface-hover)] font-semibold text-[var(--fg)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {mode === "findings" ? "Findings" : "By file"}
                </button>
              ))}
            </div>

            {view === "findings" && (
              <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
                <span className="sr-only">Sort findings</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[13px] text-[var(--fg)]"
                >
                  <option value="severity">Sort: severity</option>
                  <option value="file">Sort: file</option>
                  <option value="newest">Sort: newest</option>
                </select>
              </label>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={view === "files" ? "Search file path" : "Search file, rule or message"}
                aria-label={view === "files" ? "Search files" : "Search findings"}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-[15px] text-[var(--fg)] placeholder:text-[var(--muted-subtle)] focus:border-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--fg)]/20"
              />
            </div>

            {view === "findings" && (
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--fg)] lg:hidden"
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--fg)] px-1 text-[11px] font-semibold text-[var(--bg)]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {view === "findings" && (
            <div className={`${filtersOpen ? "flex" : "hidden"} mt-2 flex-wrap items-center gap-1.5 lg:flex`}>
              <button
                type="button"
                onClick={() => setSeverityFilter("all")}
                aria-pressed={severityFilter === "all"}
                className={`inline-flex min-h-11 items-center rounded-lg border px-2.5 text-[13px] ${
                  severityFilter === "all"
                    ? "border-[var(--fg)]/40 bg-[var(--surface-hover)] text-[var(--fg)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                Any severity
              </button>
              {(["high", "medium", "low"] as const).map((severity) => (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setSeverityFilter(severityFilter === severity ? "all" : severity)}
                  aria-pressed={severityFilter === severity}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] ${
                    severityFilter === severity
                      ? "border-[var(--fg)]/40 bg-[var(--surface-hover)] text-[var(--fg)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${severityDot(severity)}`} aria-hidden="true" />
                  {SEVERITY_LABEL[severity]}
                </button>
              ))}

              <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />

              {(["Security", "Quality"] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === category ? "all" : category)}
                  aria-pressed={categoryFilter === category}
                  className={`inline-flex min-h-11 items-center rounded-lg border px-2.5 text-[13px] ${
                    categoryFilter === category
                      ? "border-[var(--fg)]/40 bg-[var(--surface-hover)] text-[var(--fg)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------- list + detail pane */}
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h2 className="sr-only">{view === "files" ? "Findings by file" : "Findings"}</h2>
            {current.length === 0 && fixed.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-6 text-center print-plain">
                <p className="text-[13px] uppercase tracking-[0.14em] text-[var(--cleared-green)]">
                  Clean
                </p>
                <h2 className="mt-2 font-sans text-xl font-semibold text-[var(--fg)]">
                  No issues found
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-[15px] leading-7 text-[var(--muted)]">
                  We checked {data.filesScanned} files with the Secrets, Database rules and Code
                  quality checks and found nothing to fix.
                </p>
                <Link
                  href="/dashboard/scans"
                  className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-[14px] text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)] print-hide"
                >
                  Back to all scans
                </Link>
              </div>
            ) : view === "files" ? (
              <div className="space-y-2">
                {filesWithFindings.length === 0 ? (
                  <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 text-[14px] text-[var(--muted)]">
                    No files match “{query}”.
                  </p>
                ) : (
                  filesWithFindings.map((file) => {
                    const fileFindings = base.filter((finding) => finding.file === file.path);
                    const open = !!expandedFiles[file.path];
                    return (
                      <div
                        key={file.path}
                        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 print-block"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedFiles((state) => ({ ...state, [file.path]: !open }))
                          }
                          aria-expanded={open}
                          className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <svg
                            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-90" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[var(--fg)]">
                            {file.path}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {fileFindings.slice(0, 5).map((finding) => (
                              <span
                                key={finding.id}
                                className={`h-2 w-2 rounded-full ${severityDot(finding.severity)}`}
                                aria-hidden="true"
                              />
                            ))}
                          </span>
                          <span className="shrink-0 font-mono text-[12px] text-[var(--muted)]">
                            {file.findingCount}
                          </span>
                        </button>

                        <ul hidden={!open} className="print-expand divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                          {fileFindings.map((finding) => (
                            <li key={finding.id}>
                              <button
                                type="button"
                                onClick={() => select(finding)}
                                className="flex min-h-12 w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${severityDot(finding.severity)}`} aria-hidden="true" />
                                <span className="min-w-0 flex-1 text-[14px] leading-6 text-[var(--fg)]">
                                  <span className={`mr-1.5 text-[11px] font-semibold uppercase tracking-wider ${severityText(finding.severity)}`}>
                                    {SEVERITY_LABEL[finding.severity]}
                                  </span>
                                  {finding.title}
                                </span>
                                <span className="shrink-0 font-mono text-[12px] text-[var(--muted)]">
                                  {finding.line}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}

                <details className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/50">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 text-[13px] text-[var(--muted)] [&::-webkit-details-marker]:hidden">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                    </svg>
                    All {data.files.length} files scanned
                  </summary>
                  <ul className="max-h-64 divide-y divide-[var(--border-subtle)] overflow-y-auto border-t border-[var(--border-subtle)]">
                    {data.files.map((file) => (
                      <li key={file.path} className="flex items-center gap-2 px-3 py-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            file.maxSeverity === "none" ? "bg-[var(--border)]" : severityDot(file.maxSeverity)
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--muted)]">
                          {file.path}
                        </span>
                        {file.findingCount > 0 && (
                          <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
                            {file.findingCount}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-6 text-center">
                <p className="text-[15px] font-medium text-[var(--fg)]">No matching findings</p>
                <p className="mt-1 text-[14px] text-[var(--muted)]">
                  Nothing matches this search and these filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSeverityFilter("all");
                    setCategoryFilter("all");
                    setDiff("all");
                  }}
                  className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-[14px] text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div
                tabIndex={0}
                onKeyDown={handleListKeyDown}
                role="group"
                aria-label="Findings list. Use the arrow keys to move between findings."
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 focus-visible:outline-none"
              >
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {visibleRows.map((row) => {
                    const grouped = row.items.length > 1;
                    const first = row.items[0];
                    const isActive = row.items.some((finding) => finding.id === activeFinding?.id);
                    const hasNew = row.items.some((finding) => finding.status === "new");
                    const rule = describeRule(first.check, first.title);

                    if (grouped) {
                      const open = !!expandedGroups[row.key];
                      return (
                        <li key={row.key}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGroups((state) => ({ ...state, [row.key]: !open }))
                            }
                            aria-expanded={open}
                            className={`flex min-h-16 w-full items-start gap-3 px-3 py-3 text-left transition-colors ${
                              isActive ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface-hover)]/60"
                            }`}
                          >
                            <span
                              className={`mt-1 inline-flex w-14 shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${severityText(row.severity)}`}
                            >
                              <span className={`h-2 w-2 rounded-full ${severityDot(row.severity)}`} aria-hidden="true" />
                              {SEVERITY_LABEL[row.severity]}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-[var(--fg)]">
                                {rule.groupLabel ?? rule.label}, {row.items.length}{" "}
                                {rule.groupUnit ?? "locations"}
                              </span>
                              <span className="mt-1 block truncate font-mono text-[12px] text-[var(--muted)]">
                                {row.items.length} locations · first at {first.file}:{first.line}
                              </span>
                            </span>

                            <span className="flex shrink-0 items-center gap-2">
                              {hasNew && <NewBadge />}
                              <svg
                                className={`h-4 w-4 text-[var(--muted)] transition-transform ${open ? "rotate-90" : ""}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </button>

                          <ul
                            hidden={!open}
                            className="print-expand divide-y divide-[var(--border-subtle)] bg-[var(--surface-subtle)]/40"
                          >
                            {row.items.map((finding) => (
                              <li key={finding.id}>
                                <button
                                  type="button"
                                  onClick={() => select(finding)}
                                  className={`flex min-h-12 w-full items-start gap-2 py-2 pl-16 pr-3 text-left transition-colors hover:bg-[var(--surface-hover)] ${
                                    finding.id === activeFinding?.id ? "bg-[var(--surface-hover)]" : ""
                                  }`}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 block text-[14px] leading-6 text-[var(--fg)]">
                                      {finding.title}
                                    </span>
                                    <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--muted)]">
                                      {finding.file}:{finding.line}
                                    </span>
                                  </span>
                                  {finding.status === "new" && <NewBadge />}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    }

                    return (
                      <li key={row.key}>
                        <button
                          type="button"
                          onClick={() => select(first)}
                          aria-current={isActive ? "true" : undefined}
                          className={`flex min-h-16 w-full items-start gap-3 px-3 py-3 text-left transition-colors ${
                            isActive
                              ? "bg-[var(--surface-hover)] shadow-[inset_2px_0_0_0_var(--squiggle-red)]"
                              : "hover:bg-[var(--surface-hover)]/60"
                          }`}
                        >
                          <span
                            className={`mt-1 inline-flex w-14 shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${severityText(row.severity)}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${severityDot(row.severity)}`} aria-hidden="true" />
                            {SEVERITY_LABEL[row.severity]}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-[var(--fg)]">
                              {first.title}
                            </span>
                            <span className="mt-1 block truncate font-mono text-[12px] text-[var(--muted)]">
                              {first.file}:{first.line}
                            </span>
                          </span>

                          {first.status === "new" && <NewBadge />}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {rows.length > visible && (
                  <div className="border-t border-[var(--border-subtle)] p-2 print-hide">
                    <button
                      type="button"
                      onClick={() => setPage({ key: filterKey, count: visible + 20 })}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg text-[14px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                    >
                      Show 20 more ({rows.length - visible} left)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* desktop detail pane */}
          <aside
            aria-label="Finding details"
            className="hidden min-w-0 lg:sticky lg:top-2 lg:block lg:max-h-[calc(100svh-4rem)] lg:self-start lg:overflow-y-auto print-inline"
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-5 print-plain xl:p-6">
              {activeFinding ? (
                <FindingDetail
                  finding={activeFinding}
                  scanId={data.scanId}
                  aiEnabled={data.aiEnabled}
                  userOptIn={userOptIn}
                  onUserOptInChange={setUserOptIn}
                  devMode={devMode}
                  onDevModeChange={setDevMode}
                  onAskAi={(finding) =>
                    setAskRequest({ finding, nonce: Date.now() })
                  }
                />
              ) : (
                <p className="text-[14px] text-[var(--muted)]">
                  Select a finding to read why it matters and how to fix it.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ------------------------------------------------- mobile bottom sheet */}
      {sheetOpen && activeFinding && (
        <div className="fixed inset-0 z-50 lg:hidden print-hide">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Finding: ${activeFinding.title}`}
            tabIndex={-1}
            style={{ transform: `translateY(${dragY}px)` }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col overflow-hidden rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl outline-none"
          >
            <div
              className="shrink-0 cursor-grab touch-none px-4 pb-1 pt-2.5"
              onPointerDown={(event) => {
                dragStart.current = event.clientY;
                (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (dragStart.current === null) return;
                setDragY(Math.max(0, event.clientY - dragStart.current));
              }}
              onPointerUp={() => {
                if (dragY > 96) {
                  setSheetOpen(false);
                }
                setDragY(0);
                dragStart.current = null;
              }}
              onPointerCancel={() => {
                setDragY(0);
                dragStart.current = null;
              }}
            >
              <span
                className="mx-auto block h-1.5 w-12 rounded-full bg-[var(--border)]"
                aria-hidden="true"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
              <FindingDetail
                finding={activeFinding}
                scanId={data.scanId}
                aiEnabled={data.aiEnabled}
                userOptIn={userOptIn}
                onUserOptInChange={setUserOptIn}
                devMode={devMode}
                onDevModeChange={setDevMode}
                onAskAi={(finding) => setAskRequest({ finding, nonce: Date.now() })}
                onClose={() => setSheetOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {data.aiEnabled && (
        <AiChatPanel
          key={askRequest ? `ask_${askRequest.nonce}` : "report-chat"}
          scanId={data.scanId}
          findings={data.findings}
          isAiGlobalEnabled={data.aiEnabled}
          initialUserOptIn={userOptIn}
          providerName={AI_PROVIDER_NAME}
          initialAsk={askRequest?.finding ?? null}
        />
      )}
    </div>
  );
}
