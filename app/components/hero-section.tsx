import Link from "next/link";
import { HeroScanPanel } from "@/app/components/hero-scan-panel";

interface HeroSectionProps {
  authButtons?: React.ReactNode;
}

export function HeroSection({ authButtons }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-var(--nav-h))] flex flex-col justify-between pt-24 pb-12">
      {/* Soft red glow behind the hero */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 h-[32rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 bg-[var(--squiggle-red)]/10 blur-[100px] rounded-full"
        aria-hidden="true"
      />

      {/* Main 2-column hero container vertically centered */}
      <div className="relative mx-auto my-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-12 lg:gap-12 w-full">
        {/* Left Column: The Words */}
        <div className="flex flex-col items-start lg:col-span-6 space-y-6">
          <div className="rise inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3.5 py-1 text-xs text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--squiggle-red)]" aria-hidden="true" />
            <span>For anyone shipping code written with AI</span>
          </div>

          <h1
            className="rise font-display font-semibold text-[var(--fg)] leading-[1.02] text-balance"
            style={{
              fontSize: "clamp(3.25rem, 7vw, 6.5rem)",
              letterSpacing: "-0.03em",
              fontWeight: 600,
              ["--rise-delay" as string]: "60ms",
            }}
          >
            Find the{" "}
            <span className="relative inline-block">
              leaked key
              <svg
                className="absolute inset-x-0 -bottom-[0.06em] h-[0.14em] w-full overflow-visible"
                viewBox="0 0 100 4"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 0 2 Q 10 0, 20 2 T 40 2 T 60 2 T 80 2 T 100 2"
                  stroke="var(--squiggle-red)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="hero-squiggle-draw"
                />
              </svg>
            </span>{" "}
            before your users do.
          </h1>

          <p
            className="rise text-[20px] leading-relaxed text-[var(--muted)] max-w-[46ch]"
            style={{ ["--rise-delay" as string]: "140ms" }}
          >
            It reads your code and points at the exact line — in plain English, with the fix.
          </p>

          <div
            className="rise flex flex-wrap items-center gap-3 pt-2"
            style={{ ["--rise-delay" as string]: "200ms" }}
          >
            {authButtons ?? (
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--bg)] shadow-md shadow-black/20 transition-all hover:bg-neutral-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none"
              >
                Scan my app
              </Link>
            )}

            <Link
              href="#try-it"
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-transparent px-8 py-3.5 text-sm font-medium text-[var(--fg)] transition-all hover:border-[var(--muted)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
            >
              Try an example
            </Link>
          </div>

          <p
            className="rise flex items-center gap-2 font-mono text-[14px] text-[var(--muted)]"
            style={{ ["--rise-delay" as string]: "260ms" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted-subtle)]" aria-hidden="true" />
            <span>The in-browser check needs no account.</span>
          </p>
        </div>

        {/* Right Column: Hero Card */}
        <div className="w-full lg:col-span-6 flex items-center justify-center">
          <HeroScanPanel />
        </div>
      </div>

      {/* Quiet scroll cue at the bottom */}
      <div className="mx-auto flex flex-col items-center gap-2 text-xs font-mono text-[var(--muted-subtle)] select-none pt-8">
        <span>scroll to explore</span>
        <svg className="h-4 w-4 animate-bounce text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
