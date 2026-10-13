import Link from "next/link";
import { HeroScanPanel } from "@/app/components/hero-scan-panel";

interface HeroSectionProps {
  authButtons?: React.ReactNode;
}

export function HeroSection({ authButtons }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Soft ambient glow behind the hero */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 h-[26rem] w-[38rem] -translate-x-1/2 -translate-y-1/3 glow-soft"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-10 pb-16 lg:grid-cols-12 lg:gap-10 lg:pt-16 lg:pb-24">
        {/* Left: the words */}
        <div className="flex flex-col items-start lg:col-span-6">
          <p className="rise inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1 text-[11px] text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--squiggle-red)]" aria-hidden="true" />
            For anyone shipping code written with AI
          </p>

          <h1
            className="rise mt-6 font-display text-[length:var(--step-4)] leading-[1.04] font-light tracking-tight text-balance text-[var(--fg)]"
            style={{ "--rise-delay": "60ms" } as React.CSSProperties}
          >
            Find the{" "}
            <span className="relative inline-block">
              leaked key
              <svg
                className="absolute inset-x-0 -bottom-[0.08em] h-[0.12em] w-full overflow-visible"
                viewBox="0 0 100 4"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 0 2 Q 10 0, 20 2 T 40 2 T 60 2 T 80 2 T 100 2"
                  stroke="var(--squiggle-red)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            before your users do.
          </h1>

          <p
            className="rise mt-6 max-w-[46ch] text-[length:var(--step-1)] leading-relaxed text-[var(--muted)]"
            style={{ "--rise-delay": "140ms" } as React.CSSProperties}
          >
            It reads your code and points at the exact line — in plain English, with the fix.
          </p>

          <div
            className="rise mt-8 flex flex-wrap items-center gap-3"
            style={{ "--rise-delay": "200ms" } as React.CSSProperties}
          >
            {authButtons ?? (
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-full bg-[var(--fg)] px-7 py-3 text-sm font-medium text-[var(--bg)] shadow-md shadow-black/20 transition-colors hover:bg-white"
              >
                Scan my app
              </Link>
            )}

            <Link
              href="#try-it"
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-transparent px-7 py-3 text-sm font-medium text-[var(--fg)] transition-colors hover:border-[var(--muted-subtle)] hover:bg-[var(--surface-subtle)]"
            >
              Try an example
            </Link>
          </div>

          <p
            className="rise mt-6 flex items-center gap-2 font-mono text-[11px] text-[var(--muted-subtle)]"
            style={{ "--rise-delay": "260ms" } as React.CSSProperties}
          >
            <span className="h-1 w-1 rounded-full bg-[var(--muted-subtle)]" aria-hidden="true" />
            The in-browser check needs no account.
          </p>
        </div>

        {/* Right: the scanned file */}
        <div className="w-full lg:col-span-6">
          <HeroScanPanel />
        </div>
      </div>
    </section>
  );
}
