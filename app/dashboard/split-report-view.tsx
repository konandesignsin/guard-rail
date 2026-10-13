"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/app/components/logo";
import { RepoHeatMap, type HeatMapFile } from "@/app/dashboard/repo-heat-map";

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
}

interface SplitReportViewProps {
  score: number;
  repoName: string;
  subtitle?: string;
  findings: FindingReportItem[];
  files?: HeatMapFile[];
  passedChecks?: string[];
  backHref?: string;
}

export function SplitReportView({
  score,
  repoName,
  subtitle,
  findings,
  files = [],
  passedChecks = [],
  backHref = "/dashboard",
}: SplitReportViewProps) {
  const [selectedFindingId, setSelectedFindingId] = useState<string>(
    findings[0]?.id ?? ""
  );
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [fileFilter, setFileFilter] = useState<string | null>(null);
  const [mode, setMode] = useState<"simple" | "technical">("simple");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(true);

  // Requirement 4: Remember the choice in localStorage (wrapped in try/catch)
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("guardrail_report_mode");
      if (savedMode === "technical" || savedMode === "simple") {
        setMode(savedMode);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  function handleModeChange(newMode: "simple" | "technical") {
    setMode(newMode);
    try {
      localStorage.setItem("guardrail_report_mode", newMode);
    } catch {
      // Ignore localStorage write errors
    }
  }

  // Filtered findings based on severity and selected file from heat map
  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (fileFilter && f.file !== fileFilter) return false;
    return true;
  });

  const selectedFinding =
    filteredFindings.find((f) => f.id === selectedFindingId) ??
    filteredFindings[0] ??
    findings[0];

  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;

  const scoreColor =
    score >= 90
      ? "text-[var(--cleared-green)] border-[var(--cleared-green)]/30 bg-[var(--cleared-green-subtle)]"
      : score >= 70
      ? "text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30 bg-[var(--squiggle-amber-subtle)]"
      : "text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)]";

  // Prepare files with severity tags for Heat Map
  const heatMapFiles: HeatMapFile[] = (files.length > 0
    ? files
    : Array.from(new Set(findings.map((f) => f.file))).map((file) => ({
        path: file,
        bytes: 1200,
        findingCount: findings.filter((f) => f.file === file).length,
      }))
  ).map((file) => {
    const fileFindings = findings.filter((f) => f.file === file.path);
    let maxSeverity: "high" | "medium" | "low" | "none" = "none";
    if (fileFindings.some((f) => f.severity === "high")) maxSeverity = "high";
    else if (fileFindings.some((f) => f.severity === "medium")) maxSeverity = "medium";
    else if (fileFindings.some((f) => f.severity === "low")) maxSeverity = "low";
    return {
      ...file,
      maxSeverity,
    };
  });

  // Requirement 4: "Copy fix prompt" button
  function generatePromptForFinding(f: FindingReportItem) {
    return `In ${f.file} around line ${f.line}: ${f.title}. ${f.fix}. Make this change and explain what you changed.`;
  }

  function copyFindingPrompt(f: FindingReportItem) {
    const text = generatePromptForFinding(f);
    navigator.clipboard.writeText(text);
    setCopiedId(f.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyAllPrompts() {
    if (findings.length === 0) return;
    const text = findings
      .map((f, i) => `${i + 1}. ${generatePromptForFinding(f)}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted)] hover:text-[var(--fg)] transition-colors shrink-0"
          >
            <span aria-hidden="true">&larr;</span>
            <span>back</span>
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Logo size="sm" showWordmark={false} />
          <span className="font-mono text-xs text-[var(--fg)] truncate max-w-xs sm:max-w-md">
            {repoName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Copy all fix prompts */}
          <button
            type="button"
            onClick={copyAllPrompts}
            className="hidden sm:inline-flex items-center gap-1.5 rounded bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-2.5 py-1 text-xs font-mono text-[var(--fg)] transition-colors cursor-pointer"
            title="Copy prompt for all findings"
          >
            <span>{copiedAll ? "✓ Copied all prompts" : "Copy prompt for all findings"}</span>
          </button>

          {/* Simple / Technical Toggle */}
          <div className="flex items-center rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleModeChange("simple")}
              className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                mode === "simple"
                  ? "bg-[var(--surface)] text-[var(--fg)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("technical")}
              className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                mode === "technical"
                  ? "bg-[var(--surface)] text-[var(--fg)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              Technical
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[11px] font-mono text-[var(--muted)]">Score:</span>
            <span
              className={`flex h-6 px-2 items-center justify-center rounded border font-mono text-xs font-bold ${scoreColor}`}
            >
              {score}/100
            </span>
          </div>

          <Link
            href="/dashboard"
            className="rounded bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-2.5 py-1 text-xs font-mono text-[var(--fg)] transition-colors"
          >
            new scan
          </Link>
        </div>
      </header>

      {/* Optional Heat Map Section */}
      {heatMapFiles.length > 0 && showHeatMap && (
        <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)]/40 px-4 py-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-mono text-[var(--muted)]">
              Interactive File Heat Map (click any file block to filter findings)
            </span>
            <div className="flex items-center gap-2">
              {fileFilter && (
                <button
                  type="button"
                  onClick={() => setFileFilter(null)}
                  className="text-[11px] font-mono text-[var(--squiggle-amber)] underline hover:text-white cursor-pointer"
                >
                  Clear filter ({fileFilter})
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHeatMap(false)}
                className="text-[11px] font-mono text-[var(--muted-subtle)] hover:text-[var(--muted)] cursor-pointer"
              >
                hide map
              </button>
            </div>
          </div>
          <RepoHeatMap
            files={heatMapFiles}
            selectedFile={fileFilter ?? undefined}
            onSelectFile={(filePath) => {
              if (fileFilter === filePath) {
                setFileFilter(null);
              } else {
                setFileFilter(filePath);
                const matchingFinding = findings.find((f) => f.file === filePath);
                if (matchingFinding) {
                  setSelectedFindingId(matchingFinding.id);
                }
              }
            }}
          />
        </div>
      )}

      {/* Workspace Split Panes */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
        {/* Left Pane: Severity Groups, Counts, and Filters */}
        <section
          aria-label="Findings sidebar"
          className="w-full md:w-80 lg:w-96 flex flex-col bg-[var(--surface)] shrink-0 overflow-y-auto"
        >
          {/* Summary counters with clickable severity filter */}
          <div className="p-4 border-b border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--muted)]">Findings filter</span>
              <span className="text-[var(--fg)]">{filteredFindings.length} / {findings.length} total</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <button
                type="button"
                onClick={() => setSeverityFilter("all")}
                className={`rounded border p-1.5 transition-colors cursor-pointer ${
                  severityFilter === "all"
                    ? "border-[var(--fg)] bg-[var(--surface-hover)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)]"
                }`}
              >
                <p className="font-mono text-xs font-bold text-[var(--fg)]">{findings.length}</p>
                <p className="text-[9px] font-mono">all</p>
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter("high")}
                className={`rounded border p-1.5 transition-colors cursor-pointer ${
                  severityFilter === "high"
                    ? "border-[var(--squiggle-red)] bg-[var(--squiggle-red-subtle)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)]"
                }`}
              >
                <p className="font-mono text-xs font-bold text-[var(--squiggle-red)]">{highCount}</p>
                <p className="text-[9px] font-mono">high</p>
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter("medium")}
                className={`rounded border p-1.5 transition-colors cursor-pointer ${
                  severityFilter === "medium"
                    ? "border-[var(--squiggle-amber)] bg-[var(--squiggle-amber-subtle)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)]"
                }`}
              >
                <p className="font-mono text-xs font-bold text-[var(--squiggle-amber)]">{mediumCount}</p>
                <p className="text-[9px] font-mono">med</p>
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter("low")}
                className={`rounded border p-1.5 transition-colors cursor-pointer ${
                  severityFilter === "low"
                    ? "border-[var(--cleared-green)] bg-[var(--cleared-green-subtle)]"
                    : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)]"
                }`}
              >
                <p className="font-mono text-xs font-bold text-[var(--cleared-green)]">{lowCount}</p>
                <p className="text-[9px] font-mono">low</p>
              </button>
            </div>

            {subtitle && (
              <p className="text-[11px] text-[var(--muted-subtle)] leading-normal truncate">
                {subtitle}
              </p>
            )}

            {!showHeatMap && (
              <button
                type="button"
                onClick={() => setShowHeatMap(true)}
                className="text-[11px] font-mono text-[var(--muted)] underline hover:text-[var(--fg)] cursor-pointer"
              >
                Show repository heat map
              </button>
            )}
          </div>

          {/* Finding items list */}
          <div className="flex-1 divide-y divide-[var(--border-subtle)]">
            {filteredFindings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--muted)]">
                <span className="text-[var(--cleared-green)]">✓</span> No matching findings.
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = selectedFinding?.id === finding.id;
                const isHigh = finding.severity === "high";
                const isMedium = finding.severity === "medium";

                return (
                  <button
                    key={finding.id}
                    type="button"
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer outline-none focus-visible:bg-[var(--surface-hover)] ${
                      isSelected
                        ? "bg-[var(--surface-hover)] border-l-2 border-l-[var(--fg)]"
                        : "hover:bg-[var(--surface-hover)]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isHigh
                              ? "bg-[var(--squiggle-red)]"
                              : isMedium
                              ? "bg-[var(--squiggle-amber)]"
                              : "bg-[var(--muted)]"
                          }`}
                        />
                        <span className="font-mono text-xs font-medium text-[var(--fg)] truncate">
                          {finding.title}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-[var(--muted)]">
                      <span className="truncate max-w-[190px]">{finding.file}</span>
                      <span>:{finding.line}</span>
                    </div>
                  </button>
                );
              })
            )}

            {/* Passed checks section if available */}
            {passedChecks.length > 0 && (
              <div className="p-3.5 bg-[var(--surface-subtle)]/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--cleared-green)] mb-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--cleared-green)]" />
                  <span>Cleared checks ({passedChecks.length})</span>
                </div>
                <div className="space-y-1.5">
                  {passedChecks.map((item, idx) => (
                    <div key={idx} className="flex items-baseline gap-2 text-xs text-[var(--muted)]">
                      <span className="text-[var(--cleared-green)] text-[10px]">✓</span>
                      <span className="leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Pane: Finding Details (Title, file:line, explanation, fix) */}
        <section
          aria-label="Finding inspector details"
          className="flex-1 flex flex-col bg-[var(--bg)] overflow-y-auto"
        >
          {selectedFinding ? (
            <div className="p-6 md:p-8 max-w-4xl space-y-6">
              {/* Finding header */}
              <div className="space-y-3 pb-5 border-b border-[var(--border)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                        selectedFinding.severity === "high"
                          ? "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border border-[var(--squiggle-red)]/30"
                          : selectedFinding.severity === "medium"
                          ? "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border border-[var(--squiggle-amber)]/30"
                          : "bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--border)]"
                      }`}
                    >
                      {selectedFinding.severity} severity
                    </span>
                    <span className="font-mono text-xs text-[var(--fg)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded">
                      {selectedFinding.file}:{selectedFinding.line}
                    </span>
                    {mode === "technical" && selectedFinding.check && (
                      <span className="font-mono text-[11px] text-[var(--muted)] bg-[var(--surface-subtle)] border border-[var(--border)] px-2 py-0.5 rounded">
                        check: {selectedFinding.check}
                      </span>
                    )}
                  </div>

                  {/* Copy Fix Prompt Button on every finding */}
                  <button
                    type="button"
                    onClick={() => copyFindingPrompt(selectedFinding)}
                    className="flex items-center gap-1.5 rounded-md bg-[var(--fg)] hover:bg-white text-[var(--bg)] px-3 py-1 font-mono text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{copiedId === selectedFinding.id ? "✓ Copied prompt" : "Copy fix prompt"}</span>
                  </button>
                </div>

                <h1 className="font-display text-xl sm:text-2xl font-normal text-[var(--fg)]">
                  {selectedFinding.title}
                </h1>
              </div>

              {/* Real scans show file:line only, no code excerpt */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 flex items-center justify-between font-mono text-xs">
                <span className="text-[var(--muted)]">Target Location</span>
                <span className="text-[var(--fg)] font-medium">
                  {selectedFinding.file} : line {selectedFinding.line}
                </span>
              </div>

              {/* Mode-specific content: Simple vs. Technical */}
              {mode === "simple" ? (
                <>
                  {/* Simple Explanation */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">
                      What does this mean?
                    </h2>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed">
                        {selectedFinding.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Simple Fix */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--cleared-green)]">
                      How to fix it
                    </h2>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                      <p className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed font-sans">
                        {selectedFinding.fix}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Technical Breakdown */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">
                      Security Analysis & Reason
                    </h2>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3 font-mono text-xs">
                      <div>
                        <span className="text-[var(--muted-subtle)]">Rule: </span>
                        <span className="text-[var(--fg)]">{selectedFinding.check ?? "security-guardrail"}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-subtle)]">Severity Impact: </span>
                        <span className={selectedFinding.severity === "high" ? "text-[var(--squiggle-red)]" : "text-[var(--squiggle-amber)]"}>
                          {selectedFinding.severity.toUpperCase()} - {selectedFinding.severity === "high" ? "Critical privilege escalation or unauthenticated data leak" : "Misconfiguration or missing payload validation"}
                        </span>
                      </div>
                      <p className="text-[var(--fg)] leading-relaxed font-sans pt-1">
                        {selectedFinding.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Precise Technical Fix Steps */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--cleared-green)]">
                      Remediation & Patch Steps
                    </h2>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4 font-mono text-xs text-[var(--fg)] leading-relaxed whitespace-pre-wrap break-all">
                      {selectedFinding.fix}
                    </div>
                  </div>
                </>
              )}

              {/* Ready AI prompt preview */}
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-subtle)]/50 p-3.5 space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-subtle)]">
                  Ready-to-use AI Prompt
                </span>
                <p className="font-mono text-xs text-[var(--muted)] italic">
                  &quot;{generatePromptForFinding(selectedFinding)}&quot;
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-xs font-mono text-[var(--muted)]">
              Select a finding from the left pane to view details.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
