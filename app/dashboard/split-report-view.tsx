"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/app/components/logo";

export interface FindingReportItem {
  id: string;
  severity: "high" | "medium" | "low";
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
  passedChecks?: string[];
  backHref?: string;
}

export function SplitReportView({
  score,
  repoName,
  subtitle,
  findings,
  passedChecks = [],
  backHref = "/dashboard",
}: SplitReportViewProps) {
  const [selectedFindingId, setSelectedFindingId] = useState<string>(
    findings[0]?.id ?? ""
  );

  const selectedFinding =
    findings.find((f) => f.id === selectedFindingId) ?? findings[0];

  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;

  const scoreColor =
    score >= 90
      ? "text-[var(--cleared-green)] border-[var(--cleared-green)]/30 bg-[var(--cleared-green-subtle)]"
      : score >= 70
      ? "text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30 bg-[var(--squiggle-amber-subtle)]"
      : "text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)]";

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--muted)]">Audit score:</span>
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

      {/* Workspace Split Panes */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
        {/* Left Pane: Severity Groups and Findings List */}
        <section
          aria-label="Findings sidebar"
          className="w-full md:w-80 lg:w-96 flex flex-col bg-[var(--surface)] shrink-0 overflow-y-auto"
        >
          {/* Summary counters */}
          <div className="p-4 border-b border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--muted)]">Overview</span>
              <span className="text-[var(--fg)]">{findings.length} findings</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
                <p className="font-mono text-xs font-bold text-[var(--squiggle-red)]">
                  {highCount}
                </p>
                <p className="text-[10px] text-[var(--muted)] font-mono">high</p>
              </div>
              <div className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
                <p className="font-mono text-xs font-bold text-[var(--squiggle-amber)]">
                  {mediumCount}
                </p>
                <p className="text-[10px] text-[var(--muted)] font-mono">medium</p>
              </div>
              <div className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
                <p className="font-mono text-xs font-bold text-[var(--cleared-green)]">
                  {passedChecks.length > 0 ? passedChecks.length : "Pass"}
                </p>
                <p className="text-[10px] text-[var(--muted)] font-mono">clean</p>
              </div>
            </div>
            {subtitle && (
              <p className="text-[11px] text-[var(--muted-subtle)] leading-normal truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Finding items list */}
          <div className="flex-1 divide-y divide-[var(--border-subtle)]">
            {findings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--muted)]">
                <span className="text-[var(--cleared-green)]">✓</span> No problems detected.
              </div>
            ) : (
              findings.map((finding) => {
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

        {/* Right Pane: Code excerpt with squiggles, explanation, and fix */}
        <section
          aria-label="Finding inspector details"
          className="flex-1 flex flex-col bg-[var(--bg)] overflow-y-auto"
        >
          {selectedFinding ? (
            <div className="p-6 md:p-8 max-w-4xl space-y-6">
              {/* Finding header */}
              <div className="space-y-2 pb-5 border-b border-[var(--border)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                      selectedFinding.severity === "high"
                        ? "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border border-[var(--squiggle-red)]/30"
                        : "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border border-[var(--squiggle-amber)]/30"
                    }`}
                  >
                    {selectedFinding.severity} severity
                  </span>
                  <span className="font-mono text-xs text-[var(--fg)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded">
                    {selectedFinding.file}:{selectedFinding.line}
                  </span>
                </div>

                <h1 className="font-display text-xl sm:text-2xl font-normal text-[var(--fg)]">
                  {selectedFinding.title}
                </h1>
              </div>

              {/* Code Excerpt with Squiggle Underline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--muted)]">
                  <span>Code excerpt</span>
                  <span>{selectedFinding.file}</span>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-[var(--fg)]">
                  {selectedFinding.snippetLines && selectedFinding.snippetLines.length > 0 ? (
                    selectedFinding.snippetLines.map((line) => (
                      <div key={line.num} className="flex items-baseline">
                        <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">
                          {line.num}
                        </span>
                        {line.isSquiggle ? (
                          <span
                            className={
                              selectedFinding.severity === "high"
                                ? "squiggle-red text-[var(--fg)] font-medium"
                                : "squiggle-amber text-[var(--fg)] font-medium"
                            }
                          >
                            {line.code}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">{line.code}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-baseline">
                      <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">
                        {selectedFinding.line}
                      </span>
                      <span
                        className={
                          selectedFinding.severity === "high"
                            ? "squiggle-red text-[var(--fg)] font-medium"
                            : "squiggle-amber text-[var(--fg)] font-medium"
                        }
                      >
                        Line flagged by security audit rule
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plain English Explanation */}
              <div className="space-y-2">
                <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">
                  Plain-English explanation
                </h2>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed">
                    {selectedFinding.explanation}
                  </p>
                </div>
              </div>

              {/* Fix recommendation */}
              <div className="space-y-2">
                <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--cleared-green)]">
                  How to fix it
                </h2>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                  <pre className="font-mono text-xs text-[var(--fg)] leading-relaxed whitespace-pre-wrap break-all">
                    {selectedFinding.fix}
                  </pre>
                </div>
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
