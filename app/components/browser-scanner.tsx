"use client";

import { useState } from "react";
import { scan, audit } from "@/lib/guardrail";
import type { Finding } from "@/lib/guardrail/types";

const LEAKY_SAMPLE = `// Example app configuration exported from a prototype
import { createClient } from "@supabase/supabase-js";

// Supabase client initialization
export const supabase = createClient(
  "https://myproject.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role_secret_key_81a"
);

// Database security policy
-- create policy "allow_everyone" on users for all using (true) with check (true);

// OpenAI client
export const OPENAI_API_KEY = "sk-live-0982348912389123489124891234";
`;

export function BrowserScanner() {
  const [code, setCode] = useState(LEAKY_SAMPLE);
  const [findings, setFindings] = useState<Finding[]>(() => {
    return scan([{ path: "sample.ts", content: LEAKY_SAMPLE }]);
  });
  const [auditResult, setAuditResult] = useState(() => {
    return audit([{ path: "sample.ts", content: LEAKY_SAMPLE }]);
  });

  function handleScan(newCode: string) {
    setCode(newCode);
    const files = [{ path: "snippet.ts", content: newCode }];
    const res = scan(files);
    setFindings(res);
    setAuditResult(audit(files));
  }

  function handleLoadExample() {
    handleScan(LEAKY_SAMPLE);
  }

  function handleClear() {
    handleScan("");
  }

  return (
    <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xl">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[var(--muted)]">input.ts</span>
          <span className="text-[var(--border)]">|</span>
          <span className="font-mono text-xs text-[var(--fg)]">
            Score: <span className={auditResult.score < 70 ? "text-[var(--squiggle-red)] font-bold" : "text-[var(--cleared-green)] font-bold"}>{auditResult.score}/100</span>
          </span>
          <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 text-[11px] font-mono text-[var(--muted)]">
            {findings.length} finding{findings.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadExample}
            className="rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-1 font-sans text-xs text-[var(--fg)] transition-colors cursor-pointer"
          >
            Load an example
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full hover:bg-[var(--surface-hover)] px-2.5 py-1 font-sans text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Code Editor and Live Findings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        {/* Code Input Area */}
        <div className="lg:col-span-7 flex flex-col p-4">
          <label htmlFor="browser-code-input" className="sr-only">
            Paste code to scan in browser
          </label>
          <textarea
            id="browser-code-input"
            value={code}
            onChange={(e) => handleScan(e.target.value)}
            placeholder="Paste any TypeScript, JavaScript, SQL, or config snippet here to scan..."
            rows={12}
            spellCheck={false}
            className="w-full flex-1 resize-y bg-transparent font-mono text-xs sm:text-[13px] text-[var(--fg)] placeholder:text-[var(--muted-subtle)] focus:outline-none leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5 font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cleared-green)]" />
              Runs the real engine in your browser.
            </span>
            <span className="font-mono">{code.split("\n").length} lines</span>
          </div>
        </div>

        {/* Live Findings View */}
        <div className="lg:col-span-5 flex flex-col bg-[var(--bg)]/50 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-medium font-sans text-[var(--fg)]">
              Instant Findings
            </span>
            {findings.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-sans text-[var(--cleared-green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cleared-green)]" />
                Passed all checks
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-sans text-[var(--squiggle-red)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--squiggle-red)]" />
                {findings.length} issue{findings.length === 1 ? "" : "s"} detected
              </span>
            )}
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto max-h-[320px] pr-1">
            {findings.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cleared-green-subtle)] border border-[var(--cleared-green)]/30 text-[var(--cleared-green)]">
                  ✓
                </span>
                <p className="mt-3 text-xs font-medium text-[var(--fg)]">
                  No issues found
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted)] max-w-[24ch]">
                  Your snippet does not contain leaked keys or open policies.
                </p>
              </div>
            ) : (
              findings.map((item, idx) => {
                const isHigh = item.severity === "high";
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs transition-colors hover:border-[var(--border-subtle)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isHigh ? "bg-[var(--squiggle-red)]" : "bg-[var(--squiggle-amber)]"
                          }`}
                        />
                        <span className="font-medium text-[var(--fg)] text-xs">
                          {item.title}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--muted)] shrink-0">
                        line {item.line}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] text-[var(--muted)] leading-relaxed">
                      {item.explanation}
                    </p>

                    <div className="mt-2 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] p-2 font-mono text-[11px] text-[var(--fg)] leading-normal break-all">
                      <span className="text-[var(--muted)] font-sans">Fix:&nbsp;</span>
                      {item.fix}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Privacy badge */}
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-2.5">
            <p className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
              <svg className="h-3 w-3 text-[var(--cleared-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Your code never leaves your browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
