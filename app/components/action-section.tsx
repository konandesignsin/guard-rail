"use client";

import { useState } from "react";

const YAML_SNIPPET = `name: GuardRail Mission Radar
on: [pull_request, push]

jobs:
  guardrail:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan Repository Orbit
        uses: konandesignsin/guardrail@v1
        with:
          fail-on: high`;

export function ActionSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(YAML_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="action" className="relative py-24 bg-[#08090d] border-t border-[#222634] text-[#ededf0]">
      <div className="max-w-6xl mx-auto px-6">
        <header className="max-w-2xl mb-14">
          <span className="font-mono text-xs uppercase tracking-wider text-sky-400 font-semibold">
            Automated CI &bull; GitHub Action
          </span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededf0]">
            Deflect risks before they merge
          </h2>
          <p className="mt-3 text-base text-[#8e95a5] leading-relaxed">
            Drop GuardRail into your repository workflows with a single step. Pull requests receive concise mission reports with line-accurate findings.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* YAML Snippet Box */}
          <div className="lg:col-span-6 rounded-2xl border border-[#222634] bg-[#0c0e14] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222634] bg-[#11131a] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
                <span className="ml-2 font-mono text-xs text-[#8e95a5]">.github/workflows/guardrail.yml</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="cursor-pointer rounded-full border border-[#222634] bg-[#0c0e14] px-3 py-1 font-mono text-xs text-[#ededf0] transition-colors hover:border-[#555c6d] hover:bg-[#161822]"
              >
                {copied ? "Copied" : "Copy YAML"}
              </button>
            </div>

            <div className="p-5 overflow-x-auto">
              <pre className="font-mono text-xs leading-relaxed text-[#ededf0]">
                <code>{YAML_SNIPPET}</code>
              </pre>
            </div>
            <div className="border-t border-[#222634] bg-[#11131a]/60 px-5 py-3 font-mono text-[11px] text-[#8e95a5]">
              Fails the PR build when high severity threats are detected.
            </div>
          </div>

          {/* Mock Pull Request Mission Report */}
          <div className="lg:col-span-6 rounded-2xl border border-[#222634] bg-[#0c0e14] overflow-hidden shadow-2xl">
            {/* PR Header Bar */}
            <div className="flex items-center justify-between border-b border-[#222634] bg-[#11131a] px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-xs text-[#ededf0]">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-[#e5484d]/20 text-[#e5484d]">
                  &Delta;
                </div>
                <span className="font-semibold">github-actions[bot]</span>
                <span className="text-[#8e95a5]">commented on PR #42</span>
              </div>
              <span className="rounded bg-[#222634] px-2 py-0.5 font-mono text-[10px] text-[#8e95a5] uppercase font-bold">
                Example Report
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#222634]/70 pb-3">
                <div>
                  <h3 className="font-display text-sm font-semibold text-[#ededf0]">
                    Mission Report: 3 Findings Identified
                  </h3>
                  <p className="text-xs text-[#8e95a5] mt-0.5">Orbit scan completed in 1.4s</p>
                </div>
                <span className="rounded border border-[#e5484d]/40 bg-[#e5484d]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#e5484d]">
                  Action Failed
                </span>
              </div>

              {/* 3 Example Findings */}
              <div className="space-y-3 font-mono text-xs">
                {/* Finding 1 */}
                <div className="rounded-xl border border-[#222634] bg-[#11131a] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-[#e5484d]">
                      <span className="h-2 w-2 rounded-full bg-[#e5484d]" />
                      High &bull; Exposed Service Role Key
                    </span>
                    <span className="text-[#8e95a5] text-[10px]">lib/supabase.ts:6</span>
                  </div>
                  <p className="font-sans text-xs text-[#8e95a5]">
                    Master bypass token present in client bundle.
                  </p>
                </div>

                {/* Finding 2 */}
                <div className="rounded-xl border border-[#222634] bg-[#11131a] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-[#e5484d]">
                      <span className="h-2 w-2 rounded-full bg-[#e5484d]" />
                      High &bull; Unsafe Database Policy
                    </span>
                    <span className="text-[#8e95a5] text-[10px]">drizzle/0002_rls.sql:14</span>
                  </div>
                  <p className="font-sans text-xs text-[#8e95a5]">
                    Policy allows open writes to production records for all users.
                  </p>
                </div>

                {/* Finding 3 */}
                <div className="rounded-xl border border-[#222634] bg-[#11131a] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Medium &bull; Local Storage Session Auth
                    </span>
                    <span className="text-[#8e95a5] text-[10px]">app/checkout.ts:24</span>
                  </div>
                  <p className="font-sans text-xs text-[#8e95a5]">
                    Role checks read unverified client localStorage item.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] font-mono text-[#8e95a5] flex items-center justify-between">
                <span>View complete fix diffs in GuardRail dashboard &rarr;</span>
                <span className="text-white font-semibold">100% In-Memory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
