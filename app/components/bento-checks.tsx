import { RevealItem } from "@/app/components/reveal";
import { ScoreRing } from "@/app/components/score-ring";

const TILE =
  "group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--muted-subtle)] sm:p-7";

const EYEBROW = "font-mono text-[11px] tracking-wide text-[var(--muted)] uppercase";

/** Faint sheen that appears on hover. */
function Sheen() {
  return (
    <span
      className="pointer-events-none absolute -top-24 -right-16 h-48 w-48 glow-soft opacity-0 transition-opacity duration-500 group-hover:opacity-60"
      aria-hidden="true"
    />
  );
}

/**
 * "What we check" — uneven tiles, each with a small demo that animates once
 * when the tile scrolls into view. All demos are CSS + inline SVG; the resting
 * state of every one is its finished state.
 */
export function BentoChecks() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
      {/* 1. Leaked secrets — masked key */}
      <RevealItem className={`${TILE} lg:col-span-7`}>
        <Sheen />
        <span className={EYEBROW}>Secrets</span>
        <h3 className="mt-3 font-display text-lg font-medium text-[var(--fg)]">
          Keys that were never meant to ship
        </h3>
        <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-[var(--muted)]">
          Admin database keys, live payment secrets, and AI tokens get pasted straight into files the
          browser downloads. We find them and show the line.
        </p>

        <div className="relative mt-auto pt-6">
          <div className="mask-stack rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)]/60 px-3.5 py-2.5 font-mono text-[11px] sm:text-[12.5px]">
            <span className="mask-raw text-[var(--fg)]">
              sk_live_51Q8hT4Lk93mNbZq0Rh1p
            </span>
            <span className="mask-redacted">
              sk_live_••••••••••••••••
            </span>
          </div>
          <p className="mt-2.5 font-mono text-[11px] text-[var(--muted)]">
            exposed → masked
          </p>
        </div>
      </RevealItem>

      {/* 2. Open database rules — lock flips closed */}
      <RevealItem delay={80} className={`${TILE} lg:col-span-5`}>
        <Sheen />
        <span className={EYEBROW}>Database</span>
        <h3 className="mt-3 font-display text-lg font-medium text-[var(--fg)]">
          Rules anyone can walk through
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          A policy written as <code className="font-mono text-[11px]">using (true)</code> hands every
          row to every visitor.
        </p>

        <div className="relative mt-auto flex items-center gap-3.5 pt-6">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 shrink-0"
            fill="none"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <g className="lock-open-glyph" stroke="var(--squiggle-amber)">
              <path d="M8.5 10V7.5a3.5 3.5 0 0 1 6.6-1.7" />
              <rect x="5" y="10" width="14" height="10" rx="2.5" />
            </g>
            <g className="lock-locked-glyph" stroke="currentColor">
              <path className="lock-shackle" d="M8 10V7a4 4 0 0 1 8 0v3" />
              <rect className="lock-body" x="5" y="10" width="14" height="10" rx="2.5" fill="none" />
            </g>
          </svg>

          <div className="mask-stack font-mono text-[11px] sm:text-[12px]">
            <span className="mask-raw text-[var(--squiggle-amber)]">using (true)</span>
            <span className="text-[var(--fg)]">using (auth.uid() = user_id)</span>
          </div>
        </div>
      </RevealItem>

      {/* 3. Score — ring fills */}
      <RevealItem delay={120} className={`${TILE} lg:col-span-5`}>
        <Sheen />
        <span className={EYEBROW}>Score</span>
        <h3 className="mt-3 font-display text-lg font-medium text-[var(--fg)]">
          One number to work from
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Findings roll up into a score out of 100, so you know what to fix before you deploy.
        </p>

        <div className="relative mt-auto flex items-center gap-4 pt-6">
          <ScoreRing score={92} size={84} strokeWidth={7} />
          <p className="max-w-[18ch] text-[11px] leading-relaxed text-[var(--muted)]">
            Score after the flagged fixes are applied.
          </p>
        </div>
      </RevealItem>

      {/* 4. Messy code — squiggle draws in */}
      <RevealItem delay={160} className={`${TILE} lg:col-span-7`}>
        <Sheen />
        <span className={EYEBROW}>Code quality</span>
        <h3 className="mt-3 font-display text-lg font-medium text-[var(--fg)]">
          Loose ends nobody wants to ship
        </h3>
        <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-[var(--muted)]">
          Debug logs, forgotten TODO comments, orphan files, and heavier dependencies than the job
          needs — each one with a suggested fix.
        </p>

        <div className="relative mt-auto pt-6">
          <div className="flex items-baseline gap-2.5 font-mono text-[11px] sm:text-[12.5px]">
            <span className="w-4 shrink-0 text-right text-[10px] text-[var(--muted)] select-none" aria-hidden="true">
              14
            </span>
            <span className="relative inline-block px-0.5 text-[var(--fg)]">
              console.log(&quot;user&quot;, session)
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
                    stroke="var(--squiggle-red)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
          </div>
          <p className="mt-3 font-mono text-[11px] text-[var(--muted)]">
            Debug log left in a route handler
          </p>
        </div>
      </RevealItem>
    </ul>
  );
}
