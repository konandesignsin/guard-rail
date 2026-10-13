import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { HeaderNav } from "@/app/components/header-nav";
import { HeroSection } from "@/app/components/hero-section";
import { SquiggleDivider } from "@/app/components/squiggle";
import { SiteFooter } from "@/app/components/site-footer";

// Lazy-load below-the-fold components for performance
const BrowserScanner = dynamic(
  () => import("@/app/components/browser-scanner").then((mod) => mod.BrowserScanner),
  {
    loading: () => <div className="skeleton h-80 rounded-2xl w-full" aria-hidden="true" />,
  }
);

const BentoChecks = dynamic(
  () => import("@/app/components/bento-checks").then((mod) => mod.BentoChecks),
  {
    loading: () => <div className="skeleton h-96 rounded-2xl w-full" aria-hidden="true" />,
  }
);

const BeforeAfter = dynamic(
  () => import("@/app/components/before-after").then((mod) => mod.BeforeAfter),
  {
    loading: () => <div className="skeleton h-96 rounded-2xl w-full" aria-hidden="true" />,
  }
);

const FaqSection = dynamic(
  () => import("@/app/components/faq-section").then((mod) => mod.FaqSection),
  {
    loading: () => <div className="skeleton h-64 rounded-2xl w-full" aria-hidden="true" />,
  }
);

const ClosingCta = dynamic(
  () => import("@/app/components/closing-cta").then((mod) => mod.ClosingCta),
  {
    loading: () => <div className="skeleton h-48 rounded-2xl w-full" aria-hidden="true" />,
  }
);

export default function Home() {
  return (
    <div className="grain relative flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--squiggle-red-subtle)] selection:text-[var(--fg)]">
      <HeaderNav
        authSlot={
          <Suspense
            fallback={
              <div className="skeleton h-7 w-28 rounded-full" aria-hidden="true" />
            }
          >
            <NavAuthButtons />
          </Suspense>
        }
      />

      <main className="relative z-10 flex-1">
        <HeroSection
          authButtons={
            <Suspense
              fallback={
                <div className="skeleton h-11 w-36 rounded-full" aria-hidden="true" />
              }
            >
              <HeroAuthButtons />
            </Suspense>
          }
        />

        {/* Subtle Squiggle Divider */}
        <SquiggleDivider className="opacity-40" />

        {/* Try it now — runs the real engine in the browser */}
        <section id="try-it" className="py-[var(--section-y)]">
          <div className="mx-auto max-w-6xl px-6">
            <header className="max-w-2xl">
              <p className="font-mono text-[11px] tracking-wide text-[var(--squiggle-red)] uppercase">
                Try it now
              </p>
              <h2 className="mt-3 font-display text-[length:var(--step-3)] font-light tracking-tight text-balance text-[var(--fg)]">
                Paste a snippet and read the findings
              </h2>
              <p className="mt-3 max-w-[58ch] text-[length:var(--step-0)] leading-relaxed text-[var(--muted)]">
                The same checks a full scan runs, straight from the code in the box. No account, no
                upload, no waiting.
              </p>
            </header>

            <div className="mt-10">
              <BrowserScanner />
            </div>
          </div>
        </section>

        {/* Subtle Squiggle Divider */}
        <SquiggleDivider className="opacity-40" />

        {/* What we check */}
        <section id="checks" className="py-[var(--section-y)]">
          <div className="mx-auto max-w-6xl px-6">
            <header className="max-w-2xl">
              <p className="font-mono text-[11px] tracking-wide text-[var(--muted)] uppercase">
                Coverage
              </p>
              <h2 className="mt-3 font-display text-[length:var(--step-3)] font-light tracking-tight text-balance text-[var(--fg)]">
                What we check
              </h2>
              <p className="mt-3 max-w-[58ch] text-[length:var(--step-0)] leading-relaxed text-[var(--muted)]">
                The four mistakes that turn a fast build into a bad week: exposed secrets, open
                database rules, an unreadable score, and code nobody tidied up.
              </p>
            </header>

            <div className="mt-12">
              <BentoChecks />
            </div>
          </div>
        </section>

        {/* Subtle Squiggle Divider */}
        <SquiggleDivider className="opacity-40" />

        {/* Before / after */}
        <section id="before-after" className="py-[var(--section-y)]">
          <div className="mx-auto max-w-6xl px-6">
            <header className="max-w-2xl">
              <p className="font-mono text-[11px] tracking-wide text-[var(--muted)] uppercase">
                Before / after
              </p>
              <h2 className="mt-3 font-display text-[length:var(--step-3)] font-light tracking-tight text-balance text-[var(--fg)]">
                See what the fix looks like
              </h2>
              <p className="mt-3 max-w-[58ch] text-[length:var(--step-0)] leading-relaxed text-[var(--muted)]">
                Drag the handle — or focus it and use the arrow keys — to compare the leaking version
                with the fixed one.
              </p>
            </header>

            <div className="mt-10">
              <BeforeAfter />
            </div>
          </div>
        </section>

        <FaqSection />
        <ClosingCta />
      </main>

      <SiteFooter />
    </div>
  );
}

async function NavAuthButtons() {
  const user = await currentUser();

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-1.5 text-xs font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/sign-in"
        className="px-2 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-full bg-[var(--fg)] px-4 py-1.5 text-xs font-medium text-[var(--bg)] shadow-sm transition-colors hover:bg-white"
      >
        Get started
      </Link>
    </div>
  );
}

async function HeroAuthButtons() {
  const user = await currentUser();

  return (
    <Link
      href={user ? "/dashboard" : "/sign-up"}
      className="inline-flex items-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--bg)] shadow-md shadow-black/20 transition-all hover:bg-neutral-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none"
    >
      {user ? "Open dashboard" : "Scan my app"}
    </Link>
  );
}
