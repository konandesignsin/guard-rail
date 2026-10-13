"use client";

import { useState, useEffect } from "react";

interface SquiggleFinding {
  id: "key" | "policy";
  line: number;
  label: string;
  note: string;
  fix: string;
}

const findingsMap: Record<"key" | "policy", SquiggleFinding> = {
  key: {
    id: "key",
    line: 5,
    label: "Leaked service role key",
    note: "This administrative key bypasses database security rules. If exposed in frontend code, anyone can read, change, or delete your entire database.",
    fix: "Replace with process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY and use service_role on backend server routes only.",
  },
  policy: {
    id: "policy",
    line: 9,
    label: "Open database table rule",
    note: "This table policy evaluates to true for every visitor. Anyone on the internet can read or erase customer records without logging in.",
    fix: "Use using (auth.uid() = user_id) so visitors can only touch their own data.",
  },
};

export function HeroCodeEditor() {
  const [activeFinding, setActiveFinding] = useState<SquiggleFinding | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    // Sweep takes 1.8s, then squiggles appear and beam stops
    const timer = setTimeout(() => {
      setHasScanned(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
      {/* Editor top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#272B36]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#272B36]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#272B36]" aria-hidden="true" />
          <span className="ml-2 font-mono text-xs text-[var(--muted)]">
            src/lib/supabase.ts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] text-[var(--muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${hasScanned ? "bg-[var(--cleared-green)]" : "bg-[var(--squiggle-amber)] animate-pulse"}`} />
            {hasScanned ? "scan complete" : "scanning..."}
          </span>
        </div>
      </div>

      {/* Code window with scan beam */}
      <div className="relative p-5 sm:p-6 font-mono text-xs sm:text-[13px] leading-relaxed overflow-hidden">
        {/* The Memorable Scan Beam: sweeps once across on load */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-12 -translate-x-full animate-scan-beam"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(229,72,77,0.12) 60%, rgba(229,72,77,0.85) 96%, #ffffff 100%)",
            boxShadow: "0 0 24px 3px rgba(229,72,77,0.6)",
          }}
        />

        {/* Code Lines */}
        <div className="space-y-1">
          {/* Line 1 */}
          <div className="flex items-baseline">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">1</span>
            <span className="text-[var(--muted)]">import</span>
            <span className="text-[var(--fg)]">&nbsp;&#123;&nbsp;createClient&nbsp;&#125;&nbsp;</span>
            <span className="text-[var(--muted)]">from</span>
            <span className="text-[#89DDFF]">&nbsp;&quot;@supabase/supabase-js&quot;;</span>
          </div>

          {/* Line 2 */}
          <div className="flex items-baseline">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">2</span>
            <span className="text-[var(--muted-subtle)] italic">// Client setup for frontend</span>
          </div>

          {/* Line 3 */}
          <div className="flex items-baseline">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">3</span>
            <span className="text-[var(--muted)]">export const</span>
            <span className="text-[var(--fg)]">&nbsp;supabase =&nbsp;</span>
            <span className="text-[var(--muted)]">createClient(</span>
          </div>

          {/* Line 4 */}
          <div className="flex items-baseline">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">4</span>
            <span className="text-[#89DDFF]">&nbsp;&nbsp;&quot;https://app-xyz.supabase.co&quot;,</span>
          </div>

          {/* Line 5: Leaked secret with red squiggle underline appearing after sweep */}
          <div className="flex items-baseline group relative">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">5</span>
            <div className="inline-block relative">
              <span
                onMouseEnter={() => setActiveFinding(findingsMap.key)}
                onFocus={() => setActiveFinding(findingsMap.key)}
                tabIndex={0}
                className="cursor-pointer outline-none rounded focus-visible:ring-1 focus-visible:ring-[var(--squiggle-red)] transition-colors hover:bg-[var(--squiggle-red-subtle)]"
              >
                <span className="text-[#89DDFF]">&nbsp;&nbsp;&quot;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role_key_f83a&quot;</span>
              </span>

              {/* Red squiggle underline */}
              <div
                className={`absolute left-3 right-1 -bottom-1 pointer-events-none transition-opacity duration-300 ${
                  hasScanned ? "opacity-100" : "opacity-0"
                } animate-squiggles-reveal`}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 340 6"
                  className="w-full h-1.5 overflow-visible"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 3 Q 10 0.5, 20 3 T 40 3 T 60 3 T 80 3 T 100 3 T 120 3 T 140 3 T 160 3 T 180 3 T 200 3 T 220 3 T 240 3 T 260 3 T 280 3 T 300 3 T 320 3 T 340 3"
                    stroke="#E5484D"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Line 6 */}
          <div className="flex items-baseline">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">6</span>
            <span className="text-[var(--muted)]">);</span>
          </div>

          {/* Line 7 */}
          <div className="flex items-baseline">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">7</span>
            <span>&nbsp;</span>
          </div>

          {/* Line 8 */}
          <div className="flex items-baseline">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">8</span>
            <span className="text-[var(--muted-subtle)] italic">-- Row-Level Security policy</span>
          </div>

          {/* Line 9: Open policy with red squiggle */}
          <div className="flex items-baseline group relative">
            <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-subtle)] select-none">9</span>
            <div className="inline-block relative">
              <span className="text-[var(--muted-subtle)]">--&nbsp;create policy &quot;public_profiles&quot;&nbsp;</span>
              <span
                onMouseEnter={() => setActiveFinding(findingsMap.policy)}
                onFocus={() => setActiveFinding(findingsMap.policy)}
                tabIndex={0}
                className="cursor-pointer outline-none rounded focus-visible:ring-1 focus-visible:ring-[var(--squiggle-red)] transition-colors hover:bg-[var(--squiggle-red-subtle)]"
              >
                <span className="text-[var(--fg)]">for all using (true) with check (true);</span>
              </span>

              {/* Red squiggle underline */}
              <div
                className={`absolute right-0 w-64 -bottom-1 pointer-events-none transition-opacity duration-300 ${
                  hasScanned ? "opacity-100" : "opacity-0"
                } animate-squiggles-reveal`}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 260 6"
                  className="w-full h-1.5 overflow-visible"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 3 Q 10 0.5, 20 3 T 40 3 T 60 3 T 80 3 T 100 3 T 120 3 T 140 3 T 160 3 T 180 3 T 200 3 T 220 3 T 240 3 T 260 3"
                    stroke="#E5484D"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note card shown on hover / focus */}
      <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3.5 transition-all">
        {activeFinding ? (
          <div className="space-y-1.5 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--squiggle-red)]" />
                <span className="font-semibold text-[var(--fg)] font-sans">
                  {activeFinding.label}
                </span>
                <span className="font-mono text-[var(--muted)]">line {activeFinding.line}</span>
              </div>
              <span className="text-[11px] text-[var(--muted)] font-sans">
                Hover or tap to inspect
              </span>
            </div>
            <p className="font-sans text-[var(--muted)] leading-relaxed">
              {activeFinding.note}
            </p>
            <div className="pt-1 font-mono text-[11px] text-[var(--fg)]">
              <span className="text-[var(--muted)] font-sans">Fix:&nbsp;</span>
              <span className="text-[#EDEDF0]">{activeFinding.fix}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <div className="flex items-center gap-2 font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--squiggle-red)]" />
              <span>Hover any red squiggly line to read the plain-English note and fix.</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveFinding(findingsMap.key)}
                className="font-mono text-[11px] text-[var(--muted)] hover:text-[var(--fg)] underline decoration-[var(--border)]"
              >
                key (line 5)
              </button>
              <button
                type="button"
                onClick={() => setActiveFinding(findingsMap.policy)}
                className="font-mono text-[11px] text-[var(--muted)] hover:text-[var(--fg)] underline decoration-[var(--border)]"
              >
                policy (line 9)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
