"use client";

import { useState } from "react";
import type { FindingReportItem } from "@/lib/report/types";
import type { ExplanationOutput } from "@/lib/ai/schema";

interface AiExplanationSectionProps {
  finding: FindingReportItem;
  scanId: string;
  isAiGlobalEnabled: boolean;
  userOptIn: boolean;
  onUserOptInChange: (optedIn: boolean) => void;
  aiProviderName: string;
}

export function AiExplanationSection({
  finding,
  scanId,
  isAiGlobalEnabled,
  userOptIn,
  onUserOptInChange,
  aiProviderName,
}: AiExplanationSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"up" | "down" | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [cacheKey, setCacheKey] = useState<string | null>(null);

  // If the AI kill-switch is active or the key is missing, the feature is hidden.
  // Checked after the hooks so the hook order never changes between renders.
  if (!isAiGlobalEnabled) {
    return null;
  }

  const fetchExplanation = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setDailyLimitHit(false);

    try {
      // Build ~10 lines of snippet around the finding
      let snippet = "";
      if (finding.snippetLines && finding.snippetLines.length > 0) {
        snippet = finding.snippetLines.map((l) => `${l.num}: ${l.code}`).join("\n");
      } else {
        snippet = `File: ${finding.file}\nLine: ${finding.line}\nIssue: ${finding.title}\nFix: ${finding.fix}`;
      }

      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          findingId: finding.id,
          snippet,
        }),
      });

      const data = await res.json();

      if (res.ok && data.explanation) {
        setExplanation(data.explanation);
        if (data.cacheKey) setCacheKey(data.cacheKey);
      } else if (data.dailyLimitHit) {
        setDailyLimitHit(true);
        setErrorMsg(data.error);
      } else {
        // Fallback: silently show message or fallback to existing static text
        setErrorMsg(data.error || "Unable to retrieve AI explanation. Showing static guidance.");
      }
    } catch {
      setErrorMsg("Unable to retrieve AI explanation. Showing static guidance.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainClick = () => {
    if (!userOptIn) {
      setShowOptInModal(true);
    } else {
      fetchExplanation();
    }
  };

  const handleConfirmOptIn = async () => {
    try {
      const res = await fetch("/api/ai/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      if (res.ok) {
        onUserOptInChange(true);
        setShowOptInModal(false);
        fetchExplanation();
      }
    } catch {
      setShowOptInModal(false);
    }
  };

  const handleFeedback = async (type: "up" | "down") => {
    setFeedbackState(type);
    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId: finding.id,
          cacheKey,
          feedback: type,
        }),
      });
    } catch {
      // Ignore feedback transmission errors silently
    }
  };

  const handleCopyFixedCode = () => {
    if (!explanation?.fixed_code) return;
    navigator.clipboard.writeText(explanation.fixed_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Verdict style & text: Likely real, Likely safe, Not sure
  const verdictConfig = (() => {
    if (!explanation) return null;
    switch (explanation.verdict) {
      case "likely_real":
        return {
          label: "Likely real",
          colorClass: "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30",
          dotColor: "bg-[var(--squiggle-red)]",
        };
      case "likely_safe":
        return {
          label: "Likely safe",
          colorClass: "bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border-[var(--cleared-green)]/30",
          dotColor: "bg-[var(--cleared-green)]",
        };
      case "unsure":
      default:
        return {
          label: "Not sure",
          colorClass: "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30",
          dotColor: "bg-[var(--squiggle-amber)]",
        };
    }
  })();

  return (
    <div className="space-y-4 pt-2 border-t border-[var(--border)]">
      {/* Header and Trigger button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fg)] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Explanation
          </span>
          <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">
            Advisory only
          </span>
        </div>

        {!explanation && (
          <button
            type="button"
            onClick={handleExplainClick}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Analyzing code...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Explain with AI</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/30 p-4 animate-pulse">
          <div className="h-4 bg-[var(--surface-subtle)] rounded w-1/4" />
          <div className="h-3 bg-[var(--surface-subtle)] rounded w-3/4" />
          <div className="h-3 bg-[var(--surface-subtle)] rounded w-2/3" />
          <div className="h-16 bg-[var(--surface-subtle)] rounded w-full" />
        </div>
      )}

      {/* Error / Daily limit notification */}
      {errorMsg && !isLoading && (
        <div className={`rounded-xl border p-3.5 text-xs ${dailyLimitHit ? "border-[var(--squiggle-amber)]/40 bg-[var(--squiggle-amber-subtle)] text-[var(--fg)]" : "border-[var(--border)] bg-[var(--surface-subtle)]/50 text-[var(--muted)]"}`}>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-[var(--fg)]">
              {dailyLimitHit ? "Daily Limit Reached:" : "Notice:"}
            </span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Validated AI Explanation Content */}
      {explanation && !isLoading && (
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/20 p-5">
          {/* Confidence Chip & Verdict */}
          {verdictConfig && (
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${verdictConfig.colorClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${verdictConfig.dotColor}`} />
                <span>{verdictConfig.label}</span>
              </span>
              <span className="text-xs font-mono text-[var(--muted)]">
                Confidence: {Math.round(explanation.confidence * 100)}%
              </span>
            </div>
          )}

          {/* Plain-text Summary */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Summary
            </h4>
            <p className="text-sm font-medium text-[var(--fg)] leading-relaxed">
              {explanation.summary}
            </p>
          </div>

          {/* Plain-text Why It Matters */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Why it matters
            </h4>
            <p className="text-xs sm:text-[13px] text-[var(--fg)] leading-relaxed">
              {explanation.why_it_matters}
            </p>
          </div>

          {/* Numbered Fix Steps */}
          {explanation.fix_steps && explanation.fix_steps.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--cleared-green)]">
                Suggested Fix Steps
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs text-[var(--fg)]">
                {explanation.fix_steps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Fixed Code Block with copy button */}
          {explanation.fixed_code && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Proposed Replacement
                </h4>
                <button
                  type="button"
                  onClick={handleCopyFixedCode}
                  className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedCode ? "✓ Copied" : "Copy code"}</span>
                </button>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs overflow-x-auto text-[var(--fg)] whitespace-pre-wrap break-words">
                {explanation.fixed_code}
              </div>
            </div>
          )}

          {/* Advisory Disclaimer label & Thumbs Up/Down feedback */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--muted)]">
            <span className="text-[11px] leading-tight">
              Generated by AI. It can be wrong. Check before you apply it.
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px]">Was this helpful?</span>
              <button
                type="button"
                onClick={() => handleFeedback("up")}
                className={`p-1 rounded hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${feedbackState === "up" ? "text-[var(--cleared-green)] font-bold" : "text-[var(--muted)]"}`}
                aria-label="Thumbs up"
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => handleFeedback("down")}
                className={`p-1 rounded hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${feedbackState === "down" ? "text-[var(--squiggle-red)] font-bold" : "text-[var(--muted)]"}`}
                aria-label="Thumbs down"
              >
                👎
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First Click Opt-in Notice Modal */}
      {showOptInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--fg)]">
              Enable AI Explanations
            </h3>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              This sends a redacted snippet of about 10 lines to {aiProviderName} to write the explanation. Nothing else leaves GuardRail.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOptInModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOptIn}
                className="px-4 py-2 rounded-lg bg-[var(--fg)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
