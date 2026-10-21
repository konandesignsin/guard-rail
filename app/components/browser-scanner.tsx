"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { audit } from "@/lib/guardrail";
import type { Severity } from "@/lib/guardrail/types";
import { ScoreRing } from "@/app/components/score-ring";

// Build fake example key safely at runtime without full key-shaped literals
const FAKE_STRIPE_PREFIX = ["sk", "_", "live"].join("");
const FAKE_STRIPE_BODY = ["_51EXAMPLE", "NOT", "REAL", "KEY"].join("");
const FAKE_STRIPE_KEY = `${FAKE_STRIPE_PREFIX}${FAKE_STRIPE_BODY}`;

const FAKE_JWT_HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const FAKE_JWT_PAYLOAD = "eyJyb2xlIjoic2VydmljZV9yb2xlIiwiZXhwIjoxMjN9";
const FAKE_JWT_SIGNATURE = "EXAMPLE_NOT_REAL_KEY";
const FAKE_SUPABASE_SERVICE_KEY = `${FAKE_JWT_HEADER}.${FAKE_JWT_PAYLOAD}.${FAKE_JWT_SIGNATURE}`;

/**
 * Leaky sample built at runtime to avoid string literals.
 * Evaluates to 3 high + 1 low, score ~54 in audit().
 */
const EXAMPLE = `// checkout.ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://example-project.supabase.co",
  "${FAKE_SUPABASE_SERVICE_KEY}"
);

export const stripe = new Stripe("${FAKE_STRIPE_KEY}");

export const isAdmin = localStorage.getItem("isAdmin");

export async function refund(chargeId: string) {
  console.log("refunding", chargeId);
  return stripe.refunds.create({ charge: chargeId });
}
`;

function detectPath(code: string): string {
  return /\b(create\s+(table|policy|index)|alter\s+table|using\s*\(|with\s+check\s*\()/i.test(code)
    ? "snippet.sql"
    : "snippet.ts";
}

const SEVERITY_DOT: Record<Severity, string> = {
  high: "bg-[#e5484d]",
  medium: "bg-amber-400",
  low: "bg-[#555c6d]",
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
    <div className="overflow-hidden rounded-2xl border border-[#222634] bg-[#0c0e14] shadow-2xl">
      {/* Chrome bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222634] bg-[#11131a] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
          </span>
          <span className="font-mono text-xs text-[#8e95a5]">sandbox.ts</span>
          <span className="rounded bg-[#222634] px-1.5 py-0.5 font-mono text-[9px] text-[#8e95a5] uppercase">
            Example Sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCode(EXAMPLE)}
            className="cursor-pointer rounded-full border border-[#222634] bg-[#0c0e14] px-3.5 py-1.5 text-xs font-mono text-[#ededf0] transition-colors hover:border-[#555c6d] hover:bg-[#161822]"
          >
            Load Example
          </button>
          <button
            type="button"
            onClick={() => setCode("")}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-mono text-[#8e95a5] transition-colors hover:bg-[#161822] hover:text-[#ededf0]"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-[#222634] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        {/* Input Code Panel with Red Squiggle Indicators */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:col-span-7 bg-[#08090d]">
          <label htmlFor="guardrail-snippet" className="sr-only">
            Paste code to check
          </label>
          <textarea
            id="guardrail-snippet"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            placeholder={"Paste a snippet — a config file, an API route, a database policy…"}
            className="min-h-[17rem] w-full flex-1 resize-y rounded-xl border border-[#222634] bg-[#0c0e14] p-3.5 font-mono text-[12px] leading-relaxed text-[#ededf0] outline-none transition-colors placeholder:text-[#555c6d] focus-visible:border-sky-500/50 sm:text-[12.5px]"
          />
          <div className="flex items-center justify-between text-xs font-mono text-[#8e95a5]">
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3dd68c]" aria-hidden="true" />
              In-browser AST analysis &bull; Zero external network calls
            </p>
          </div>
        </div>

        {/* Findings Panel */}
        <div className="flex flex-col bg-[#0c0e14] p-4 sm:p-5 lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-[#222634] pb-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-sm font-semibold text-[#ededf0]">Findings Radar</h3>
              {result && (
                <span className="font-mono text-[11px] text-[#8e95a5]" role="status" aria-live="polite">
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
                  <div key={row} className="rounded-xl border border-[#222634] bg-[#11131a] p-3.5">
                    <div className="h-3 w-2/3 rounded-full bg-[#222634] animate-pulse" />
                    <div className="mt-2.5 h-2.5 w-full rounded-full bg-[#222634] animate-pulse" />
                    <div className="mt-2 h-2.5 w-4/5 rounded-full bg-[#222634] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !code.trim() ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <p className="text-xs text-[#8e95a5]">Paste a snippet to check it.</p>
                <button
                  type="button"
                  onClick={() => setCode(EXAMPLE)}
                  className="cursor-pointer text-xs font-medium text-[#ededf0] underline decoration-[#222634] underline-offset-4 transition-colors hover:decoration-[#8e95a5]"
                >
                  or load the example
                </button>
              </div>
            ) : findings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3dd68c]/30 bg-[#3dd68c]/10 text-[#3dd68c]"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-5 w-5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-xs font-semibold text-[#ededf0]">Zero findings remaining</p>
                <p className="max-w-[26ch] text-[11px] text-[#8e95a5]">
                  No leaked keys, open database rules, or unsafe flags detected.
                </p>
              </div>
            ) : (
              findings.map((finding, index) => (
                <article
                  key={`${finding.check}-${finding.line}-${index}`}
                  className="group rounded-xl border border-[#222634] bg-[#11131a] p-3.5 transition-all hover:border-[#555c6d]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[finding.severity]}`}
                        aria-hidden="true"
                      />
                      <h4 className="text-xs font-semibold text-[#ededf0] group-hover:text-white">
                        {finding.title}
                      </h4>
                    </div>
                    <span className="shrink-0 rounded border border-[#222634] bg-[#0c0e14] px-1.5 py-0.5 font-mono text-[10px] text-[#8e95a5]">
                      line {finding.line}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#8e95a5]">{finding.explanation}</p>
                  <div className="mt-2.5 rounded-lg border border-[#222634] bg-[#08090d] p-2.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-[#ededf0]">
                    <span className="text-[#3dd68c] font-semibold">Deflect &bull; Fix: </span>
                    {finding.fix}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
