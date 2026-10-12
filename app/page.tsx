import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { HeroCodeEditor } from "@/app/components/hero-code-editor";
import { NewsletterForm } from "@/app/components/newsletter-form";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* Top Navigation */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] rounded"
          >
            <span>guardrail</span>
            <span className="rounded bg-[var(--surface-subtle)] px-2 py-0.5 font-sans text-xs font-normal text-[var(--muted)]">
              spell-checker for security
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <a
              href="#checks"
              className="hidden sm:inline-block text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              Checks
            </a>
            <a
              href="#how-to-scan"
              className="hidden sm:inline-block text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              How it works
            </a>
            <a
              href="#security"
              className="hidden sm:inline-block text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              Security promise
            </a>

            <Suspense
              fallback={
                <div className="h-8 w-20 rounded bg-[var(--surface-subtle)]" aria-hidden="true" />
              }
            >
              <TopNavAuth />
            </Suspense>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
            {/* Left Hero Column */}
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink)] leading-[1.15]">
                Find security holes in your AI-built app before anyone else does.
              </h1>

              <p className="mt-5 font-sans text-base sm:text-lg text-[var(--muted)] leading-relaxed max-w-[60ch]">
                Tools like Lovable and Bolt let anyone build fast, but they often leave behind leaked
                admin keys, open Supabase databases, and dead endpoints. Guardrail checks your app
                like a spell-checker catches typos, with plain-English notes and exact fixes.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Suspense
                  fallback={
                    <div
                      className="h-11 w-36 rounded-lg bg-[var(--surface-subtle)]"
                      aria-hidden="true"
                    />
                  }
                >
                  <AuthActions />
                </Suspense>
              </div>

              <p className="mt-4 text-xs text-[var(--muted-light)]">
                Free for personal projects and prototypes. No credit card required.
              </p>
            </div>

            {/* Right Hero Column: Code Editor with Squiggles */}
            <div className="lg:col-span-6 w-full">
              <HeroCodeEditor />
            </div>
          </div>
        </section>

        <hr className="border-t border-[var(--border)]" />

        {/* Section 1: What it checks */}
        <section id="checks" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              What Guardrail checks
            </h2>
            <p className="mt-3 text-base text-[var(--muted)] max-w-[65ch]">
              We look for the three most common security flaws created when non-developers prompt AI assistants to generate full-stack code.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-t-2 border-[var(--squiggle-red)] pt-4">
              <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
                Secrets and API keys
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed max-w-[45ch]">
                Finds Supabase <code className="text-xs bg-[var(--surface-subtle)] px-1 py-0.5 rounded">service_role</code> keys,
                OpenAI tokens, and private Stripe secrets accidentally included in browser-visible code.
              </p>
            </div>

            <div className="border-t-2 border-[var(--squiggle-amber)] pt-4">
              <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
                Open database rules
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed max-w-[45ch]">
                Flags Supabase Row-Level Security policies that leave user records wide open to the public
                with permissive <code className="text-xs bg-[var(--surface-subtle)] px-1 py-0.5 rounded">using (true)</code> rules.
              </p>
            </div>

            <div className="border-t-2 border-[var(--link-blue)] pt-4">
              <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
                Unused and messy code
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed max-w-[45ch]">
                Spots leftover boilerplate endpoints, broken error handling, duplicate auth logic, and
                hardcoded test values left behind across iterations.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-t border-[var(--border)]" />

        {/* Section 2: How to use it */}
        <section id="how-to-scan" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              How to scan your app
            </h2>
            <p className="mt-3 text-base text-[var(--muted)] max-w-[65ch]">
              Choose whichever workflow matches how you build. You don't need to install anything on your computer.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="font-display text-base font-semibold text-[var(--ink)]">
                Paste a GitHub link
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                Paste the URL of any public repository from GitHub. Guardrail clones it into an isolated temporary worker and runs the checks immediately.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="font-display text-base font-semibold text-[var(--ink)]">
                Upload a zip export
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                Download your project zip file directly from Lovable, Bolt, or v0 and drop it into the dashboard. We extract and review it in memory.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="font-display text-base font-semibold text-[var(--ink)]">
                Connect your GitHub
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                Sign in with GitHub to pick any of your private repositories directly from a dropdown list and re-run scans as you push updates.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-t border-[var(--border)]" />

        {/* Section 3: Trust Note */}
        <section id="security" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-[var(--cleared-green)]" aria-hidden="true" />
                <span className="text-xs font-medium text-[var(--cleared-green)]">
                  Privacy guarantee
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
                We read your code to scan it. We don&apos;t store it.
              </h2>
              <p className="mt-4 font-sans text-base text-[var(--muted)] leading-relaxed max-w-[65ch]">
                Your repository files are processed inside an ephemeral worker purely to produce your security report. As soon as the scan finishes, the files are deleted. We do not store your repository contents, we do not train AI models on your code, and we do not share your project with third parties.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-display text-base font-bold text-[var(--ink)]">guardrail</span>
              <span className="text-xs text-[var(--muted-light)]">MIT License</span>
            </div>
            <p className="text-xs text-[var(--muted)] max-w-md">
              A spell-checker for app security. Built for founders and makers building with AI tools.
            </p>
            <div>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--link-blue)] hover:underline inline-flex items-center gap-1"
              >
                View on GitHub &rarr;
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--ink)]">
              Get notified when new checks release
            </p>
            <NewsletterForm />
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
        className="rounded-md bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--border-subtle)] transition-colors"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
    >
      Sign in
    </Link>
  );
}

async function AuthActions() {
  const user = await currentUser();

  return (
    <div className="flex items-center gap-4">
      <Link
        href={user ? "/dashboard" : "/sign-up"}
        className="rounded-lg bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--paper)] transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)]"
      >
        Scan my app
      </Link>
      {!user && (
        <Link
          href="/sign-in"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
