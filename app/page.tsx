import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { HeaderNav } from "@/app/components/header-nav";
import { ProofreadHero } from "@/app/components/proofread-hero";
import { SmoothScroll } from "@/app/components/smooth-scroll";
import { SiteFooter } from "@/app/components/site-footer";

// Lazy-load below-the-fold sections
const ScrollStory = dynamic(
  () => import("@/app/components/scroll-story").then((mod) => mod.ScrollStory),
  {
    loading: () => <div className="h-screen w-full bg-[var(--bg)] animate-pulse" />,
  }
);

const ProofreadChecks = dynamic(
  () => import("@/app/components/proofread-checks").then((mod) => mod.ProofreadChecks),
  {
    loading: () => <div className="h-96 w-full bg-[var(--bg)] animate-pulse" />,
  }
);

const BrowserScanner = dynamic(
  () => import("@/app/components/browser-scanner").then((mod) => mod.BrowserScanner),
  {
    loading: () => <div className="h-80 w-full bg-[var(--bg)] animate-pulse" />,
  }
);

const FaqSection = dynamic(
  () => import("@/app/components/faq-section").then((mod) => mod.FaqSection),
  {
    loading: () => <div className="h-64 w-full bg-[var(--bg)] animate-pulse" />,
  }
);

const ProofreadFinalCta = dynamic(
  () => import("@/app/components/proofread-final-cta").then((mod) => mod.ProofreadFinalCta),
  {
    loading: () => <div className="h-64 w-full bg-[var(--bg)] animate-pulse" />,
  }
);

export default function Home() {
  return (
    <div className="grain relative flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--squiggle-red-subtle)] selection:text-[var(--fg)]">
      {/* Smooth scroll powered by Lenis */}
      <SmoothScroll />

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
        {/* 1. HERO: Exactly one viewport tall (100svh), headline <= 3 lines, both buttons visible */}
        <ProofreadHero
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

        {/* 2. SCROLL STORY: Pinned section with 3-step transforming code block */}
        <ScrollStory />

        {/* 3. WHAT WE CHECK: Bento grid with mini-animations + slow marquee */}
        <ProofreadChecks />

        {/* 4. LIVE DEMO: In-browser scanner with proofreader styling */}
        <section id="demo" className="py-24 bg-[var(--surface-subtle)]/40 border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-6">
            <header className="max-w-2xl mb-12">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--squiggle-red)]">
                Interactive Proofreader
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold text-[var(--fg)]">
                Paste any snippet to test the engine
              </h2>
              <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
                The exact same static analysis rules run entirely inside your browser. No account, no uploads, zero latency.
              </p>
            </header>

            <BrowserScanner />
          </div>
        </section>

        {/* 5. FAQ SECTION */}
        <FaqSection />

        {/* 6. FINAL CTA: Big line where red squiggle morphs into green check */}
        <ProofreadFinalCta />
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
      className="inline-flex items-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--bg)] shadow-xl transition-all hover:bg-neutral-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none"
    >
      {user ? "Open dashboard" : "Scan my app"}
    </Link>
  );
}
