"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { audit } from "@/lib/guardrail";
import type { Severity } from "@/lib/guardrail/types";
import { ScoreRing } from "@/app/components/score-ring";

/**
 * Leaky sample. The JWT payload is base64url without "=" padding so the
 * engine's service_role detector recognises it — verified against
 * `audit()` from lib/guardrail: 3 high + 1 low, score 54.
 */
const EXAMPLE = `// checkout.ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://example-project.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiZXhwIjoxMjN9.EXAMPLE_NOT_REAL_KEY"
);

export const stripe = new Stripe("sk_live_EXAMPLE_NOT_REAL_STRIPE_KEY");

export const isAdmin = localStorage.getItem("isAdmin");

export async function refund(chargeId: string) {
  console.log("refunding", chargeId);
  return stripe.refunds.create({ charge: chargeId });
}
`;

/**
 * The engine picks its checks from the file extension, so decide whether the
 * snippet reads as SQL or as TypeScript before auditing it.
 */
function detectPath(code: string): string {
  return /\b(create\s+(table|policy|index)|alter\s+table|using\s*\(|with\s+check\s*\()/i.test(code)
    ? "snippet.sql"
    : "snippet.ts";
}

const SEVERITY_DOT: Record<Severity, string> = {
  high: "bg-[var(--squiggle-red)]",
  medium: "bg-[var(--squiggle-amber)]",
  low: "bg-[var(--muted-subtle)]",
};

export function BrowserScanner() {
  const [code, setCode] = useState(EXAMPLE);
  const deferredCode = useDeferredValue(code);
  const isChecking = deferredCode !== code;

  // Runs the real static engine locally. No fetch, no server, no login.
  const result = useMemo(() => {
    if (!deferredCode.trim()) return null;
    return audit([{ path: detectPath(deferredCode), content: deferredCode }]);
  }, [deferredCode]);

  const findings = result?.findings ?? [];
  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;
  const low = findings.filter((finding) => finding.severity === "low").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/30">
      {/* Chrome bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
          </span>
          <span className="font-mono text-[11px] text-[var(--muted)]">sandbox.ts</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCode(EXAMPLE)}
            className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--fg)] transition-colors hover:border-[var(--muted-subtle)] hover:bg-[var(--surface-hover)]"
          >
            Load an example
          </button>
          <button
            type="button"
            onClick={() => setCode("")}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-[var(--border)] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        {/* Input */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:col-span-7">
          <label htmlFor="guardrail-snippet" className="sr-only">
            Paste code to check
          </label>
          <textarea
            id="guardrail-snippet"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            placeholder={"Paste a snippet — a config file, an API route, a database policy…"}
            className="min-h-[15rem] w-full flex-1 resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-3.5 font-mono text-[12px] leading-relaxed text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--muted-subtle)] focus-visible:border-[var(--muted-subtle)] sm:text-[12.5px]"
          />
          <p className="flex items-center gap-2 font-mono text-[11px] text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cleared-green)]" aria-hidden="true" />
            Your code never leaves your browser.
          </p>
        </div>

        {/* Findings */}
        <div className="flex flex-col bg-[var(--bg)]/40 p-4 sm:p-5 lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-sm font-medium text-[var(--fg)]">Findings</h3>
              {result && (
                <span className="font-mono text-[11px] text-[var(--muted)]" role="status" aria-live="polite">
                  {findings.length === 0
                    ? "all clear"
                    : `${high} high · ${medium} medium · ${low} low`}
                </span>
              )}
            </div>
            {result && <ScoreRing score={result.score} size={54} strokeWidth={5} />}
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-[26rem]">
            {isChecking ? (
              <div className="space-y-3" aria-hidden="true">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                    <div className="skeleton h-3 w-2/3 rounded-full" />
                    <div className="skeleton mt-2.5 h-2.5 w-full rounded-full" />
                    <div className="skeleton mt-2 h-2.5 w-4/5 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !code.trim() ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <p className="text-xs text-[var(--muted)]">Paste a snippet to check it.</p>
                <button
                  type="button"
                  onClick={() => setCode(EXAMPLE)}
                  className="cursor-pointer text-xs font-medium text-[var(--fg)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:decoration-[var(--muted)]"
                >
                  or load the example
                </button>
              </div>
            ) : findings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cleared-green)_35%,transparent)] bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)]"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-xs font-semibold text-[var(--fg)]">Nothing risky in this snippet</p>
                <p className="max-w-[26ch] text-[11px] text-[var(--muted)]">
                  No leaked keys, open database rules, or unsafe flags found.
                </p>
              </div>
            ) : (
              findings.map((finding, index) => (
                <article
                  key={`${finding.check}-${finding.line}-${index}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-colors hover:border-[var(--muted-subtle)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[finding.severity]}`}
                        aria-hidden="true"
                      />
                      <h4 className="text-xs font-semibold text-[var(--fg)]">{finding.title}</h4>
                    </div>
                    <span className="shrink-0 rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                      line {finding.line}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{finding.explanation}</p>
                  <p className="mt-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-[var(--fg)]">
                    <span className="font-sans font-semibold">Fix: </span>
                    {finding.fix}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
