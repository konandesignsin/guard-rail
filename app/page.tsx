import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { HeaderNav } from "@/app/components/header-nav";
import { HeroSection } from "@/app/components/hero-section";
import { BrowserScanner } from "@/app/components/browser-scanner";
import { BentoChecks } from "@/app/components/bento-checks";
import { BeforeAfter } from "@/app/components/before-after";
import { FaqSection } from "@/app/components/faq-section";
import { ClosingCta } from "@/app/components/closing-cta";
import { SiteFooter } from "@/app/components/site-footer";

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

        {/* Try it now — runs the real engine in the browser */}
        <section id="try-it" className="border-t border-[var(--border)] py-[var(--section-y)]">
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

        {/* What we check */}
        <section id="checks" className="border-t border-[var(--border)] py-[var(--section-y)]">
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

        {/* Before / after */}
        <section id="before-after" className="border-t border-[var(--border)] py-[var(--section-y)]">
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
      className="inline-flex items-center rounded-full bg-[var(--fg)] px-7 py-3 text-sm font-medium text-[var(--bg)] shadow-md shadow-black/20 transition-colors hover:bg-white"
    >
      {user ? "Open dashboard" : "Scan my app"}
    </Link>
  );
}
