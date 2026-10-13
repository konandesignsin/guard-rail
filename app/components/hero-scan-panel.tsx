"use client";

import { useState } from "react";

type Severity = "high" | "medium";

interface Risk {
  /** Offending text inside the line; used to place the squiggle + ignition timing. */
  token: string;
  severity: Severity;
  label: string;
  note: string;
  fix: string;
}

interface ScanLine {
  code: string;
  risk?: Risk;
}

const LINES: ScanLine[] = [
  { code: 'import { createClient } from "@supabase/supabase-js";' },
  { code: "" },
  { code: "// Talks to the database straight from the browser" },
  { code: "export const supabase = createClient(" },
  { code: "  process.env.NEXT_PUBLIC_SUPABASE_URL!," },
  {
    code: '  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.8Kd2"',
    risk: {
      token: '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.8Kd2"',
      severity: "high",
      label: "Admin database key, shipped to the browser",
      note:
        "This is the master key for your database. It ignores every security rule you set. Anyone who opens your site can copy it and read, change, or delete everything.",
      fix: "Use the public anon key in the browser and keep this one on the server.",
    },
  },
  { code: ");" },
  { code: "" },
  {
    code: 'export const stripe = new Stripe("sk_live_51Q8hT4Lk93mNbZq0");',
    risk: {
      token: '"sk_live_51Q8hT4Lk93mNbZq0"',
      severity: "high",
      label: "Live payment key in your JavaScript",
      note:
        "Your real Stripe key is baked into the page. Someone can use it to issue refunds or read customer payment details without ever logging in.",
      fix: "Move it to a server-only environment variable and call Stripe from a route handler.",
    },
  },
  { code: "" },
  {
    code: '-- create policy "read_orders" on orders for all using (true);',
    risk: {
      token: "using (true)",
      severity: "medium",
      label: "Rule lets everyone read every row",
      note:
        "This rule says yes to every visitor. If that table holds customer data, anyone can read it. Fine for public data, risky for private data.",
      fix: "Scope it to the signed-in user: using (auth.uid() = user_id).",
    },
  },
  { code: "" },
  { code: "export async function refund(chargeId: string) {" },
  { code: "  return stripe.refunds.create({ charge: chargeId });" },
  { code: "}" },
];

/** Longest rendered line, used to convert a column into a beam-arrival delay. */
const LONGEST_LINE = LINES.reduce((longest, line) => Math.max(longest, line.code.length), 1);
const SWEEP_SECONDS = 1.6;

const RISKS = LINES.filter((line) => line.risk).map((line) => {
  const code = line.code;
  const risk = line.risk as Risk;
  const column = Math.max(0, code.indexOf(risk.token));
  const endColumn = column + risk.token.length;
  return {
    risk,
    /** Fraction of the panel width the beam travels before this line ignites. */
    arrival: Math.min(0.96, endColumn / LONGEST_LINE),
  };
});

/**
 * Faint code lines with one bright vertical beam that sweeps across once on load.
 * Red squiggles ignite as the beam passes; the note panel explains whichever
 * finding is hovered, focused, or tapped.
 *
 * The sweep is pure CSS (gated behind `prefers-reduced-motion: no-preference`),
 * so it starts with the first paint and needs no JS.
 */
export function HeroScanPanel() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const active = activeIndex === null ? null : RISKS[activeIndex].risk;
  const highCount = RISKS.filter((item) => item.risk.severity === "high").length;
  const mediumCount = RISKS.length - highCount;

  return (
    <div className="relative w-full">
      {/* Soft glow behind the card */}
      <div
        className="pointer-events-none absolute -inset-3 rounded-[1.75rem] glow-soft"
        aria-hidden="true"
      />

      <div className="hero-scan relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 shadow-2xl shadow-black/40 backdrop-blur-sm">
        {/* Window chrome */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
            </span>
            <span className="truncate font-mono text-[11px] text-[var(--muted)]">lib/supabase.ts</span>
          </div>
          <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--squiggle-red)_35%,transparent)] bg-[var(--squiggle-red-subtle)] px-2.5 py-0.5 font-sans text-[11px] font-medium text-[var(--squiggle-red)]">
            {highCount} high · {mediumCount} medium
          </span>
        </div>

        {/* Code body */}
        <div className="relative px-3 py-4 sm:px-4">
          <p className="sr-only">
            Example scan of a file with three findings: an exposed admin key on line 6, a live payment
            key on line 9, and an open database rule on line 11.
          </p>

          <div className="relative overflow-x-auto">
            <div className="relative min-w-[19rem] font-mono text-[11px] leading-[1.9] sm:text-[12.5px]">
              {LINES.map((line, index) => {
                const riskIndex = RISKS.findIndex((item) => item.risk === line.risk);
                const isRisk = riskIndex !== -1;

                return (
                  <div key={index} className="flex items-baseline whitespace-pre">
                    <span
                      className="w-6 shrink-0 pr-2 text-right text-[10px] text-[var(--muted-subtle)] select-none"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>

                    {isRisk ? (
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(riskIndex)}
                        onFocus={() => setActiveIndex(riskIndex)}
                        onClick={() => setActiveIndex(riskIndex)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onBlur={() => setActiveIndex(null)}
                        aria-describedby="hero-scan-note"
                        className={`relative inline-block cursor-pointer rounded-sm px-0.5 text-left transition-colors ${
                          line.risk?.severity === "high"
                            ? "text-[var(--fg)] hover:bg-[var(--squiggle-red-subtle)]"
                            : "text-[var(--fg)] hover:bg-[var(--squiggle-amber-subtle)]"
                        } ${activeIndex === riskIndex ? "bg-[var(--squiggle-red-subtle)]" : ""}`}
                      >
                        {line.code}
                        <span className="pointer-events-none absolute inset-x-0 -bottom-[3px] h-1.5" aria-hidden="true">
                          <svg
                            viewBox="0 0 100 6"
                            preserveAspectRatio="none"
                            fill="none"
                            className="h-full w-full overflow-visible"
                          >
                            <path
                              className="squiggle-path"
                              pathLength={1}
                              d="M 0 3 Q 5 0, 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3 T 70 3 T 80 3 T 90 3 T 100 3"
                              stroke={
                                line.risk?.severity === "high"
                                  ? "var(--squiggle-red)"
                                  : "var(--squiggle-amber)"
                              }
                              strokeWidth="2"
                              strokeLinecap="round"
                              style={
                                {
                                  "--draw-delay": `${(RISKS[riskIndex].arrival * SWEEP_SECONDS).toFixed(2)}s`,
                                } as React.CSSProperties
                              }
                            />
                          </svg>
                        </span>
                      </button>
                    ) : (
                      <span
                        className={
                          line.code.startsWith("//") || line.code.startsWith("--")
                            ? "px-0.5 text-[var(--muted-subtle)] opacity-60 italic"
                            : "px-0.5 text-[var(--muted)] opacity-60"
                        }
                      >
                        {line.code || "\u00A0"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* The single bright scan beam */}
          <div className="scan-beam pointer-events-none absolute inset-0 w-full" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 w-10 -translate-x-1/2 bg-[var(--squiggle-red)] opacity-25 blur-xl" />
            <span className="absolute inset-y-0 left-0 w-[2px] -translate-x-1/2 bg-[var(--squiggle-red)] shadow-[0_0_18px_4px_var(--squiggle-red-glow)]" />
          </div>
        </div>

        {/* Plain-English note panel (fixed height, so nothing above it ever shifts) */}
        <div
          id="hero-scan-note"
          aria-live="polite"
          className="flex min-h-[7.5rem] flex-col justify-center gap-1.5 border-t border-[var(--border)] bg-[var(--bg)]/70 px-4 py-3"
        >
          {active ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    active.severity === "high"
                      ? "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)]"
                      : "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)]"
                  }`}
                >
                  {active.severity}
                </span>
                <span className="font-sans text-xs font-semibold text-[var(--fg)]">{active.label}</span>
              </div>
              <p className="max-w-[52ch] text-[11px] leading-relaxed text-[var(--muted)]">{active.note}</p>
              <p className="font-mono text-[11px] leading-relaxed text-[var(--fg)]">
                <span className="font-sans font-semibold">Fix: </span>
                {active.fix}
              </p>
            </>
          ) : (
            <>
              <span className="font-mono text-[11px] text-[var(--muted)]">
                {RISKS.length} findings · plain English, no jargon
              </span>
              <p className="max-w-[46ch] text-[11px] leading-relaxed text-[var(--muted-subtle)]">
                Hover a red squiggle for what went wrong and the exact line to change.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
