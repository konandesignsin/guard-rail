"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AiExplanationSection } from "@/app/dashboard/ai-explanation-section";
import { AI_PROVIDER_NAME } from "@/lib/legal";
import { describeRule, SEVERITY_LABEL, staticFixPrompt } from "@/lib/report/rules";
import type { ReportFinding, Severity } from "@/lib/report/types";

const SEVERITY_STYLE: Record<Severity, { pill: string; dot: string }> = {
  high: {
    pill: "border-[var(--squiggle-red)]/35 bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)]",
    dot: "bg-[var(--squiggle-red)]",
  },
  medium: {
    pill: "border-[var(--squiggle-amber)]/35 bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)]",
    dot: "bg-[var(--squiggle-amber)]",
  },
  low: {
    pill: "border-[var(--cleared-green)]/35 bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)]",
    dot: "bg-[var(--cleared-green)]",
  },
};

interface FindingDetailProps {
  finding: ReportFinding;
  scanId: string;
  aiEnabled: boolean;
  userOptIn: boolean;
  onUserOptInChange: (value: boolean) => void;
  devMode: boolean;
  onDevModeChange: (value: boolean) => void;
  onAskAi: (finding: ReportFinding) => void;
  onClose?: () => void;
}

/**
 * Detail panel for a single finding. Everything it shows comes from the stored
 * rule, severity, category, location and message plus a rule-based template —
 * never from the user's source code.
 */
export function FindingDetail({
  finding,
  scanId,
  aiEnabled,
  userOptIn,
  onUserOptInChange,
  devMode,
  onDevModeChange,
  onAskAi,
  onClose,
}: FindingDetailProps) {
  const rule = describeRule(finding.check, finding.title);
  const style = SEVERITY_STYLE[finding.severity];
  const tooltipId = useId();
  // The same detail can be mounted twice (desktop pane + phone sheet), so every
  // label target needs its own id.
  const baseId = useId();
  const [showModeTip, setShowModeTip] = useState(false);
  const [copied, setCopied] = useState<"path" | "prompt" | "ai" | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const steps = rule.steps.length > 0 ? rule.steps : [finding.fix];
  const isFixed = finding.status === "fixed";
  const canUseAi = aiEnabled && userOptIn && !isFixed;

  const copy = async (text: string, what: "path" | "prompt" | "ai") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const generateAiPrompt = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiWarning([]);

    try {
      const res = await fetch("/api/ai/fix-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          findingIds: [finding.id],
          mode: "single",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setAiError("Your session expired. Refresh the page and try again.");
        } else if (data?.requiresOptIn) {
          setAiError("AI help is not enabled for your account yet.");
        } else if (data?.limitReached) {
          setAiError(data.error || "Daily AI limit reached. Try again tomorrow.");
        } else {
          setAiError(data?.error || "Could not generate the prompt. Try again.");
        }
        return;
      }

      setAiPrompt(data.prompt);
      setAiTitle(data.title ?? null);
      setAiWarning(Array.isArray(data.warnings) ? data.warnings : []);
    } catch {
      setAiError("Network error. The static prompt above still works.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${style.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
            {SEVERITY_LABEL[finding.severity]}
          </span>
          <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--border)] px-2.5 text-xs text-[var(--muted)]">
            {finding.category}
          </span>
          {finding.status === "new" && (
            <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--cleared-green)]/35 bg-[var(--cleared-green-subtle)] px-2.5 text-xs font-medium text-[var(--cleared-green)]">
              New since last scan
            </span>
          )}
          {isFixed && (
            <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 text-xs font-medium text-[var(--muted)]">
              Fixed since last scan
            </span>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
            aria-label="Close finding details"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-sans text-xl font-semibold leading-snug tracking-tight text-[var(--fg)] sm:text-2xl">
          {finding.title}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 font-mono text-[13px] text-[var(--fg)]">
            <span className="break-all">
              {finding.file}
              <span className="text-[var(--muted)]">:{finding.line}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => copy(`${finding.file}:${finding.line}`, "path")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
          >
            {copied === "path" ? "Copied" : "Copy path"}
          </button>
        </div>
      </div>

      {/* Plain English / Developer details */}
      <div className="flex flex-wrap items-center gap-2 border-y border-[var(--border-subtle)] py-3">
        <div
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5"
          role="group"
          aria-label="Detail level"
        >
          <button
            type="button"
            onClick={() => onDevModeChange(false)}
            aria-pressed={!devMode}
            className={`inline-flex min-h-11 items-center rounded-md px-3 text-[13px] transition-colors ${
              !devMode
                ? "bg-[var(--surface)] font-semibold text-[var(--fg)]"
                : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            Plain English
          </button>
          <button
            type="button"
            onClick={() => onDevModeChange(true)}
            aria-pressed={devMode}
            className={`inline-flex min-h-11 items-center rounded-md px-3 text-[13px] transition-colors ${
              devMode
                ? "bg-[var(--surface)] font-semibold text-[var(--fg)]"
                : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            Developer details
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModeTip((open) => !open)}
            onBlur={() => setShowModeTip(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            aria-label="What is the difference between the two detail levels?"
            aria-expanded={showModeTip}
            aria-describedby={tooltipId}
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
          <div
            id={tooltipId}
            role="tooltip"
            hidden={!showModeTip}
            className="absolute left-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--muted)] shadow-xl"
          >
            <span className="block font-semibold text-[var(--fg)]">Detail level</span>
            Plain English explains the risk and the fix in everyday words. Developer
            details add the rule id, the category and the fingerprint used to match
            findings between scans.
          </div>
        </div>
      </div>

      <section aria-labelledby={`${baseId}-why`} className="space-y-2">
        <h3
          id={`${baseId}-why`}
          className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
        >
          Why it matters
        </h3>
        <p className="text-[15px] leading-7 text-[var(--fg)]">{finding.explanation}</p>
      </section>

      <section aria-labelledby={`${baseId}-fix`} className="space-y-3">
        <h3
          id={`${baseId}-fix`}
          className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
        >
          How to fix it
        </h3>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-[15px] leading-7 text-[var(--fg)]">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] font-mono text-[11px] text-[var(--muted)]">
                {index + 1}
              </span>
              <span className="min-w-0 break-words">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby={`${baseId}-example`} className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id={`${baseId}-example`}
            className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
          >
            Example
          </h3>
          <span className="text-[11px] text-[var(--muted)]">
            Generic example, not your code
          </span>
        </div>

        {rule.rotateFirst && (
          <p className="rounded-lg border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-3 text-[14px] leading-6 text-[var(--fg)]">
            Rotate this key first, then remove it from the code and move it to an
            environment variable.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <p className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Before
            </p>
            <pre className="overflow-hidden whitespace-pre-wrap break-words px-3 py-3 font-mono text-[12px] leading-6 text-[var(--muted)]">
              {rule.example.before}
            </pre>
          </div>
          <div className="min-w-0 rounded-lg border border-[var(--cleared-green)]/25 bg-[var(--cleared-green-subtle)]/40">
            <p className="border-b border-[var(--cleared-green)]/20 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--cleared-green)]">
              After
            </p>
            <pre className="overflow-hidden whitespace-pre-wrap break-words px-3 py-3 font-mono text-[12px] leading-6 text-[var(--fg)]">
              {rule.example.after}
            </pre>
          </div>
        </div>
      </section>

      <section aria-labelledby={`${baseId}-false`} className="space-y-2">
        <h3
          id={`${baseId}-false`}
          className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
        >
          Could this be a false positive?
        </h3>
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/60 p-3 text-[14px] leading-6 text-[var(--fg)]">
          {rule.falsePositive}
        </p>
      </section>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => copy(staticFixPrompt(finding), "prompt")}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--fg)] px-4 text-[14px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {copied === "prompt" ? "Copied" : "Copy fix prompt"}
        </button>

        {canUseAi && (
          <>
            <button
              type="button"
              onClick={generateAiPrompt}
              disabled={aiLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
            >
              {aiLoading ? "Generating…" : "Generate AI fix prompt"}
            </button>
            <button
              type="button"
              onClick={() => onAskAi(finding)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              Ask GuardRail about this
            </button>
          </>
        )}

        {aiEnabled && !userOptIn && !isFixed && (
          <p className="w-full text-[13px] leading-6 text-[var(--muted)]">
            AI help is off for your account. Enable it in{" "}
            <Link
              href="/dashboard/settings"
              className="underline decoration-[var(--muted-subtle)] underline-offset-2 hover:text-[var(--fg)]"
            >
              Settings
            </Link>{" "}
            to generate AI fix prompts or ask questions about this finding.
          </p>
        )}
      </div>

      {aiError && (
        <p className="rounded-lg border border-[var(--squiggle-amber)]/35 bg-[var(--squiggle-amber-subtle)] p-3 text-[13px] leading-6 text-[var(--fg)]">
          {aiError}
        </p>
      )}

      {aiPrompt && (
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {aiTitle ?? "AI fix prompt"}
            </h3>
            <span className="text-[11px] text-[var(--muted)]">
              Generated with {AI_PROVIDER_NAME}
            </span>
          </div>
          {aiWarning.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-3">
              {aiWarning.map((warning) => (
                <li key={warning} className="text-[13px] leading-6 text-[var(--fg)]">
                  {warning}
                </li>
              ))}
            </ul>
          )}
          <pre className="overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-[12px] leading-6 text-[var(--fg)]">
            {aiPrompt}
          </pre>
          <button
            type="button"
            onClick={() => copy(aiPrompt, "ai")}
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-[14px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            {copied === "ai" ? "Copied" : "Copy AI prompt"}
          </button>
        </div>
      )}

      {canUseAi && (
        <AiExplanationSection
          key={finding.id}
          finding={finding}
          scanId={scanId}
          isAiGlobalEnabled={aiEnabled}
          userOptIn={userOptIn}
          onUserOptInChange={onUserOptInChange}
          aiProviderName={AI_PROVIDER_NAME}
        />
      )}

      {devMode && (
        <section
          aria-labelledby={`${baseId}-dev`}
          className="space-y-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)]/40 p-4"
        >
          <h3
            id={`${baseId}-dev`}
            className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
          >
            Developer details
          </h3>
          <dl className="grid gap-x-4 gap-y-2 text-[13px] sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            <dt className="text-[var(--muted)]">Rule id</dt>
            <dd className="break-all font-mono text-[var(--fg)]">{rule.id}</dd>
            <dt className="text-[var(--muted)]">Category</dt>
            <dd className="text-[var(--fg)]">{finding.category}</dd>
            <dt className="text-[var(--muted)]">Check</dt>
            <dd className="font-mono text-[var(--fg)]">{finding.check ?? "unknown"}</dd>
            <dt className="text-[var(--muted)]">Fingerprint</dt>
            <dd className="break-all font-mono text-[var(--fg)]">{finding.fingerprint}</dd>
            {rule.reference && (
              <>
                <dt className="text-[var(--muted)]">Reference</dt>
                <dd className="text-[var(--fg)]">{rule.reference}</dd>
              </>
            )}
            <dt className="text-[var(--muted)]">Scanner detail</dt>
            <dd className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-[var(--muted)]">
              {finding.fix}
            </dd>
          </dl>
        </section>
      )}
    </div>
  );
}
