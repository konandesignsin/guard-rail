"use client";

import { useState } from "react";

type FindingId = "key" | "policy";

interface FindingInfo {
  id: FindingId;
  label: string;
  badge: string;
  line: number;
  snippet: string;
  note: string;
  fix: string;
}

const findings: Record<FindingId, FindingInfo> = {
  key: {
    id: "key",
    label: "Leaked service role key",
    badge: "High severity",
    line: 5,
    snippet: `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role"`,
    note: "This key lets anyone use your account. Move it to an environment variable.",
    fix: "Use NEXT_PUBLIC_SUPABASE_ANON_KEY for client-side queries, and keep service_role secrets on a server route only.",
  },
  policy: {
    id: "policy",
    label: "Open Supabase table policy",
    badge: "High severity",
    line: 9,
    snippet: `using (true) with check (true);`,
    note: "This policy allows anyone on the internet to view, overwrite, or delete all user records without logging in.",
    fix: "Replace using (true) with using (auth.uid() = user_id) so users can only touch their own data.",
  },
};

export function HeroCodeEditor() {
  const [activeId, setActiveId] = useState<FindingId>("key");
  const activeFinding = findings[activeId];

  return (
    <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" aria-hidden="true" />
          <span className="ml-2 font-mono text-xs font-medium text-[var(--muted)]">
            src/lib/supabase.ts
          </span>
        </div>
        <span className="font-mono text-xs text-[var(--muted-light)]">
          Exported from Lovable
        </span>
      </div>

      {/* Editor Code Area */}
      <div className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-[var(--ink)]">
        {/* Line 1 */}
        <div className="flex items-baseline">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">1</span>
          <span className="text-[var(--muted)]">import</span>
          <span className="text-[var(--ink)]">&nbsp;&#123;&nbsp;createClient&nbsp;&#125;&nbsp;</span>
          <span className="text-[var(--muted)]">from</span>
          <span className="text-[var(--muted-light)]">&nbsp;&quot;@supabase/supabase-js&quot;;</span>
        </div>

        {/* Line 2 */}
        <div className="flex items-baseline">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">2</span>
          <span className="text-[var(--muted-light)] italic">// Client setup for frontend</span>
        </div>

        {/* Line 3 */}
        <div className="flex items-baseline">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">3</span>
          <span className="text-[var(--muted)]">export const</span>
          <span className="text-[var(--ink)]">&nbsp;supabase =&nbsp;</span>
          <span className="text-[var(--muted)]">createClient(</span>
        </div>

        {/* Line 4 */}
        <div className="flex items-baseline">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">4</span>
          <span className="text-[var(--muted-light)]">&nbsp;&nbsp;&quot;https://app-xyz.supabase.co&quot;,</span>
        </div>

        {/* Line 5 (Leaked secret with squiggle) */}
        <div className="flex items-baseline group relative">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">5</span>
          <div className="inline-block relative">
            <button
              type="button"
              onClick={() => setActiveId("key")}
              onMouseEnter={() => setActiveId("key")}
              onFocus={() => setActiveId("key")}
              aria-label="Inspect leaked service role key finding"
              className={`text-left font-mono rounded px-1 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] ${
                activeId === "key"
                  ? "bg-[var(--squiggle-red-subtle)] text-[var(--ink)] font-medium"
                  : "hover:bg-[var(--surface-subtle)] text-[var(--ink)]"
              }`}
            >
              <span>&nbsp;&nbsp;&quot;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role_key_f83a&quot;</span>
            </button>

            {/* Squiggle underline SVG */}
            <div className="absolute left-3 right-1 -bottom-1 pointer-events-none" aria-hidden="true">
              <svg
                viewBox="0 0 340 8"
                className="w-full h-2 overflow-visible"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 4 Q 10 0, 20 4 T 40 4 T 60 4 T 80 4 T 100 4 T 120 4 T 140 4 T 160 4 T 180 4 T 200 4 T 220 4 T 240 4 T 260 4 T 280 4 T 300 4 T 320 4 T 340 4"
                  stroke="var(--squiggle-red)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className={activeId === "key" ? "animate-draw-squiggle" : ""}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Line 6 */}
        <div className="flex items-baseline">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">6</span>
          <span className="text-[var(--muted)]">);</span>
        </div>

        {/* Line 7 */}
        <div className="flex items-baseline">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">7</span>
          <span>&nbsp;</span>
        </div>

        {/* Line 8 */}
        <div className="flex items-baseline">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">8</span>
          <span className="text-[var(--muted-light)] italic">-- Database row security policy</span>
        </div>

        {/* Line 9 (Open policy with squiggle) */}
        <div className="flex items-baseline group relative">
          <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">9</span>
          <div className="inline-block relative">
            <span className="text-[var(--muted)]">--&nbsp;create policy &quot;public_profiles&quot; on profiles&nbsp;</span>
            <button
              type="button"
              onClick={() => setActiveId("policy")}
              onMouseEnter={() => setActiveId("policy")}
              onFocus={() => setActiveId("policy")}
              aria-label="Inspect open Supabase policy finding"
              className={`text-left font-mono rounded px-1 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] ${
                activeId === "policy"
                  ? "bg-[var(--squiggle-red-subtle)] text-[var(--ink)] font-medium"
                  : "hover:bg-[var(--surface-subtle)] text-[var(--ink)]"
              }`}
            >
              <span>for all using (true) with check (true);</span>
            </button>

            {/* Squiggle underline SVG */}
            <div className="absolute right-0 left-auto w-64 -bottom-1 pointer-events-none" aria-hidden="true">
              <svg
                viewBox="0 0 260 8"
                className="w-full h-2 overflow-visible"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 4 Q 10 0, 20 4 T 40 4 T 60 4 T 80 4 T 100 4 T 120 4 T 140 4 T 160 4 T 180 4 T 200 4 T 220 4 T 240 4 T 260 4"
                  stroke="var(--squiggle-red)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className={activeId === "policy" ? "animate-draw-squiggle" : ""}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Orchestrated Plain-English Note Panel */}
      <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full bg-[var(--squiggle-red)]"
              aria-hidden="true"
            />
            <span className="font-sans text-xs font-semibold text-[var(--ink)]">
              {activeFinding.label}
            </span>
            <span className="font-mono text-xs text-[var(--muted-light)]">
              line {activeFinding.line}
            </span>
          </div>

          {/* Interactive toggle switchers between findings */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveId("key")}
              className={`px-2 py-0.5 text-xs font-sans rounded transition-colors ${
                activeId === "key"
                  ? "bg-[var(--surface)] text-[var(--ink)] font-medium border border-[var(--border)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              Secret key
            </button>
            <button
              type="button"
              onClick={() => setActiveId("policy")}
              className={`px-2 py-0.5 text-xs font-sans rounded transition-colors ${
                activeId === "policy"
                  ? "bg-[var(--surface)] text-[var(--ink)] font-medium border border-[var(--border)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              Open policy
            </button>
          </div>
        </div>

        {/* Note Text with orchestration animation on mount */}
        <div className="animate-note-appear space-y-2">
          <p className="font-sans text-sm text-[var(--ink)] leading-snug">
            {activeFinding.note}
          </p>
          <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-2.5 text-xs text-[var(--muted)]">
            <span className="font-medium text-[var(--ink)]">How to fix:&nbsp;</span>
            <span>{activeFinding.fix}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
