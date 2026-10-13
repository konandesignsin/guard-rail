import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Logo } from "@/app/components/logo";
import { HeroCodeEditor } from "@/app/components/hero-code-editor";
import { BrowserScanner } from "@/app/components/browser-scanner";
import { NewsletterForm } from "@/app/components/newsletter-form";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--squiggle-red-subtle)]">
      {/* Minimal Top Navigation */}
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo size="md" />

          <nav className="flex items-center gap-6 text-sm">
            <a
              href="#try-it"
              className="hidden sm:inline-block text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            >
              Try it
            </a>
            <a
              href="#checks"
              className="hidden sm:inline-block text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            >
              Checks
            </a>
            <a
              href="#faq"
              className="hidden sm:inline-block text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            >
              FAQ
            </a>

            <Suspense
              fallback={
                <div className="h-8 w-20 rounded-full bg-[var(--surface-subtle)]" aria-hidden="true" />
              }
            >
              <TopNavAuth />
            </Suspense>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 1. Hero Section: Left-aligned, cinematic black background, generous spacing */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-28 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Hero Column */}
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[var(--fg)] leading-[1.08]">
                Security checks for apps built with AI.
              </h1>

              <p className="mt-6 font-sans text-base sm:text-lg text-[var(--muted)] leading-relaxed max-w-[52ch]">
                Catch leaked admin keys, wide-open database tables, and sloppy code before shipping. Simple plain-English warnings and exact line fixes.
              </p>

              {/* Pill buttons: solid white primary, outlined secondary */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Suspense
                  fallback={
                    <div
                      className="h-11 w-36 rounded-full bg-[var(--surface-subtle)]"
                      aria-hidden="true"
                    />
                  }
                >
                  <HeroAuthButtons />
                </Suspense>

                <Link
                  href="/dashboard/preview-report"
                  className="rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--fg)] hover:bg-[var(--surface)] hover:border-[var(--muted-subtle)] transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  See an example report
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-3 text-xs text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cleared-green)]" />
                <span>Zero configuration. Paste a repository link or test right below.</span>
              </div>
            </div>

            {/* Right Hero Column: Code Editor with Scan Beam and Squiggles */}
            <div className="lg:col-span-6 w-full">
              <HeroCodeEditor />
            </div>
          </div>
        </section>

        {/* 2. Interactive "Try it now" Section (Runs in-browser) */}
        <section id="try-it" className="border-t border-[var(--border)] bg-[var(--surface)]/40 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--fg)]">
                Try it now in your browser
              </h2>
              <p className="mt-3 text-base text-[var(--muted)] leading-relaxed max-w-[62ch]">
                Paste a code snippet from Lovable, Bolt, Cursor, or your backend. It runs the real security engine right here without logging in or sending files to a server.
              </p>
            </div>

            <div className="mt-10">
              <BrowserScanner />
            </div>
          </div>
        </section>

        {/* 3. "What we check" Section: Distinct non-identical layout with bespoke tiny SVGs */}
        <section id="checks" className="border-t border-[var(--border)] py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--fg)]">
                What we check
              </h2>
              <p className="mt-3 text-base text-[var(--muted)] leading-relaxed max-w-[62ch]">
                AI coding tools produce working apps quickly, but commonly miss critical guardrails. We target the three most dangerous gaps.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Check 1: Secrets */}
              <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)]">
                  {/* Key SVG */}
                  <svg className="h-5 w-5 text-[var(--squiggle-red)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5-3 3 1.5 1.5L9 14l-1.5-1.5L6 14l-4 4v4h4l4-4 1.5 1.5L13 14l-1.5-1.5 3-3 1.5 1.5 3.5-3.5" />
                    <circle cx="17.5" cy="6.5" r="2.5" />
                  </svg>
                </div>
                <h3 className="mt-5 font-display text-lg font-medium text-[var(--fg)]">
                  Secrets and API keys
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Catches Supabase <code className="font-mono text-xs text-[var(--fg)] bg-[var(--surface-subtle)] px-1 py-0.5 rounded">service_role</code> keys, OpenAI tokens, Stripe secrets, and database credentials baked into browser bundles.
                </p>
              </div>

              {/* Check 2: Open database rules */}
              <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)]">
                  {/* Database SVG */}
                  <svg className="h-5 w-5 text-[var(--squiggle-amber)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                </div>
                <h3 className="mt-5 font-display text-lg font-medium text-[var(--fg)]">
                  Open database rules
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Flags Supabase and Postgres Row-Level Security policies with permissive <code className="font-mono text-xs text-[var(--fg)] bg-[var(--surface-subtle)] px-1 py-0.5 rounded">using (true)</code> rules that expose private customer tables to anyone.
                </p>
              </div>

              {/* Check 3: Messy code */}
              <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)]">
                  {/* Code / Bug SVG */}
                  <svg className="h-5 w-5 text-[var(--cleared-green)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                    <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 3" />
                  </svg>
                </div>
                <h3 className="mt-5 font-display text-lg font-medium text-[var(--fg)]">
                  Messy code
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Detects unhandled webhook signatures, empty catch blocks, leaked debugging backdoors, and leftover boilerplate that could compromise reliability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Short FAQ */}
        <section id="faq" className="border-t border-[var(--border)] bg-[var(--surface)]/30 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--fg)]">
                Frequently asked questions
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="border-t border-[var(--border)] pt-5">
                <h3 className="font-display text-base font-medium text-[var(--fg)]">
                  Is my code stored?
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  No. When scanning a repository, files are parsed temporarily in memory or ephemeral workers and discarded once the report is generated. In-browser snippets never leave your computer.
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-5">
                <h3 className="font-display text-base font-medium text-[var(--fg)]">
                  Which tools work?
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Any project exported from Lovable, Bolt.new, v0, Cursor, Windsurf, or written by hand in Next.js, Vite, React, Supabase, or Node.
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-5">
                <h3 className="font-display text-base font-medium text-[var(--fg)]">
                  Is it free?
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Yes. Guardrail is free for makers, startups, and open-source projects. No credit cards or surprise limits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing Call to Action */}
        <section className="border-t border-[var(--border)] py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-6 text-center flex flex-col items-center">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[var(--fg)]">
              Find the holes before anyone else does.
            </h2>
            <p className="mt-4 text-base text-[var(--muted)] max-w-xl">
              Scan your repository in seconds and ship with confidence.
            </p>
            <div className="mt-8">
              <Link
                href="/sign-up"
                className="inline-flex rounded-full bg-[#EDEDF0] px-8 py-3.5 text-sm font-medium text-[#090A0F] hover:bg-white transition-all shadow-lg hover:shadow-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Scan my app
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Tidy Footer: MIT license, GitHub */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-[var(--border)]">|</span>
            <span className="text-xs text-[var(--muted)]">MIT License</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--muted)]">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--fg)] transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
            <div className="hidden sm:block">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

async function TopNavAuth() {
  const user = await currentUser();

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
    >
      Sign in
    </Link>
  );
}

async function HeroAuthButtons() {
  const user = await currentUser();

  return (
    <div className="flex items-center gap-3">
      <Link
        href={user ? "/dashboard" : "/sign-up"}
        className="rounded-full bg-[#EDEDF0] px-6 py-3 text-sm font-medium text-[#090A0F] hover:bg-white transition-all shadow-md hover:shadow-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Scan my app
      </Link>
      {!user && (
        <Link
          href="/sign-in"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--fg)] transition-colors px-3 py-2"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
