import Link from "next/link";

interface FindingItem {
  id: string;
  severity: "high" | "medium";
  title: string;
  file: string;
  line: number;
  snippetLines: { num: number; code: string; isSquiggle?: boolean }[];
  explanation: string;
  fix: string;
}

const sampleFindings: FindingItem[] = [
  {
    id: "f1",
    severity: "high",
    title: "Leaked Supabase service_role key in frontend code",
    file: "src/lib/supabase.ts",
    line: 5,
    snippetLines: [
      { num: 3, code: "export const supabase = createClient(" },
      { num: 4, code: '  "https://xyzcompany.supabase.co",' },
      {
        num: 5,
        code: '  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role_secret_key_91f"',
        isSquiggle: true,
      },
      { num: 6, code: ");" },
    ],
    explanation:
      "This service_role key has administrative powers that bypass every security rule in your database. Because it is written in frontend client code, anyone who opens your website can inspect the source code, copy this key, and view or delete your entire database.",
    fix: "Replace this string with process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY. Move any operations requiring the service_role key into a protected server route or edge function.",
  },
  {
    id: "f2",
    severity: "high",
    title: "Unrestricted database policy allows anyone to alter profiles",
    file: "supabase/migrations/002_policies.sql",
    line: 14,
    snippetLines: [
      { num: 12, code: 'create policy "public_profiles_access"' },
      { num: 13, code: "on public.profiles for all" },
      {
        num: 14,
        code: "using (true) with check (true);",
        isSquiggle: true,
      },
    ],
    explanation:
      "Row-Level Security is enabled, but this policy evaluates to true for every single visitor. Anyone on the internet can read, modify, or delete every row in your profiles table without being logged in.",
    fix: "Change the policy to check that the current user owns the row: using (auth.uid() = id) with check (auth.uid() = id);",
  },
  {
    id: "f3",
    severity: "medium",
    title: "Stripe webhook endpoint lacks signature verification",
    file: "app/api/webhooks/stripe/route.ts",
    line: 9,
    snippetLines: [
      { num: 8, code: "export async function POST(req: Request) {" },
      {
        num: 9,
        code: "  const event = await req.json();",
        isSquiggle: true,
      },
      { num: 10, code: '  if (event.type === "checkout.session.completed") {' },
    ],
    explanation:
      "The webhook route accepts JSON directly without checking Stripe's cryptographic signature header. An attacker who discovers the URL could send a fake event payload to fulfill orders without actually paying.",
    fix: "Read the raw request text and call stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET) before handling events.",
  },
];

const samplePassed = [
  "No OpenAI or Anthropic API keys exposed in frontend bundles",
  "Environment files (.env, .env.local) are excluded in .gitignore",
  "Supabase project URL uses encrypted HTTPS protocol",
  "No hardcoded administrative passwords found in seed files",
];

export default function PreviewReportPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* Top Bar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              &larr; Back to Dashboard
            </Link>
            <span className="text-[var(--border)]">|</span>
            <span className="font-display text-sm font-bold text-[var(--ink)]">
              Scan report preview
            </span>
          </div>

          <span className="rounded bg-[var(--surface-subtle)] px-2.5 py-1 font-mono text-xs text-[var(--muted)]">
            bolt-saas-starter #a8f3b21
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Score & Summary Banner */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--squiggle-red-subtle)] border border-[var(--squiggle-red)]">
                <span className="font-display text-2xl font-bold text-[var(--squiggle-red)]">
                  68
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-[var(--ink)]">
                    Needs attention
                  </h1>
                  <span className="rounded-full bg-[var(--squiggle-red-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--squiggle-red)]">
                    3 problems found
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Scanned 28 files from repository <span className="font-mono font-medium text-[var(--ink)]">bolt-saas-starter</span> (branch: main)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--paper)] transition-opacity hover:opacity-90"
              >
                Scan another app
              </Link>
            </div>
          </div>

          {/* Severity Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--squiggle-red)]" aria-hidden="true" />
              <div>
                <p className="font-display text-base font-bold text-[var(--ink)]">2 High</p>
                <p className="text-xs text-[var(--muted)]">Admin keys and open tables</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--squiggle-amber)]" aria-hidden="true" />
              <div>
                <p className="font-display text-base font-bold text-[var(--ink)]">1 Medium</p>
                <p className="text-xs text-[var(--muted)]">Unverified webhook route</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--cleared-green)]" aria-hidden="true" />
              <div>
                <p className="font-display text-base font-bold text-[var(--ink)]">4 Passed</p>
                <p className="text-xs text-[var(--muted)]">Clean checks without issues</p>
              </div>
            </div>
          </div>
        </section>

        {/* Findings List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">
              Problems to fix before shipping
            </h2>
            <span className="text-xs text-[var(--muted)]">Grouped by severity</span>
          </div>

          <div className="space-y-6">
            {sampleFindings.map((finding) => (
              <article
                key={finding.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
              >
                {/* Finding Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-6 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        finding.severity === "high"
                          ? "bg-[var(--squiggle-red)]"
                          : "bg-[var(--squiggle-amber)]"
                      }`}
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-base font-bold text-[var(--ink)]">
                      {finding.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--ink)] font-medium">
                      {finding.file}:{finding.line}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        finding.severity === "high"
                          ? "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)]"
                          : "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)]"
                      }`}
                    >
                      {finding.severity === "high" ? "High" : "Medium"}
                    </span>
                  </div>
                </div>

                {/* Code Excerpt with Squiggle Underline */}
                <div className="p-6 space-y-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--paper)] p-4 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-[var(--ink)]">
                    {finding.snippetLines.map((line) => (
                      <div key={line.num} className="flex items-baseline">
                        <span className="w-8 shrink-0 text-right pr-4 text-[var(--muted-light)] select-none">
                          {line.num}
                        </span>
                        {line.isSquiggle ? (
                          <span
                            className={
                              finding.severity === "high"
                                ? "squiggle-red font-medium text-[var(--ink)]"
                                : "squiggle-amber font-medium text-[var(--ink)]"
                            }
                          >
                            {line.code}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">{line.code}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Plain English Explanation */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1">
                      Why this matters
                    </h4>
                    <p className="text-sm text-[var(--muted)] leading-relaxed max-w-[70ch]">
                      {finding.explanation}
                    </p>
                  </div>

                  {/* Plain English Fix */}
                  <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] p-4">
                    <h4 className="text-xs font-semibold text-[var(--ink)] mb-1">
                      How to fix it:
                    </h4>
                    <p className="text-xs font-mono text-[var(--ink)] leading-relaxed break-all">
                      {finding.fix}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Passed Checks Section */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--cleared-green)]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[var(--ink)]">
              Cleared checks (4 passed)
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-[var(--muted)]">
            {samplePassed.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 shrink-0 text-[var(--cleared-green)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
