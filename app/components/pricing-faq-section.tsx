"use client";

import { useState } from "react";
import Link from "next/link";

const FAQS = [
  {
    question: "What is checked by GuardRail?",
    answer:
      "GuardRail executes static analysis rules scanning for leaked API keys, tokens, hardcoded production secrets, misconfigured database policies (such as permissive PostgreSQL/Supabase RLS), dangerous client-side role checks, and exposed master bypass variables.",
  },
  {
    question: "Is my code stored on your servers?",
    answer:
      "No. In-browser checks run 100% on your machine. Dashboard repository scans clone code into ephemeral in-memory storage, inspect file ASTs and lines, record finding metadata, and instantly discard the source code. We never persist your codebase.",
  },
  {
    question: "Is GuardRail free or paid?",
    answer:
      "GuardRail is free while we launch. You can scan public repositories from the dashboard, run the GitHub Action on your repos, and receive plain-English finding summaries and fix prompts without paying or entering a credit card.",
  },
  {
    question: "Is the AI analysis optional?",
    answer:
      "Yes, completely optional. The core static scanner runs deterministically without AI. If you choose to enable AI explanations or fix prompts, the code snippet is first stripped of recognized key literals and sensitive identifiers before being evaluated.",
  },
  {
    question: "Can findings be wrong (false positives)?",
    answer:
      "Automated tools can occasionally flag intended configurations or miss novel vectors. GuardRail results are automated diagnostic aids rather than an absolute security guarantee or certified audit. Always review the code diffs before applying changes.",
  },
  {
    question: "How do private repositories work?",
    answer:
      "The web dashboard currently analyzes public repositories. To scan private or enterprise repositories, use the GuardRail GitHub Action (konandesignsin/guardrail@v1), which executes directly inside your private GitHub Actions runner without sending code out.",
  },
];

export function PricingAndFaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggleAccordion = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="pricing" className="relative py-24 bg-[#08090d] border-t border-[#222634] text-[#ededf0]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <header className="max-w-2xl mb-14">
          <span className="font-mono text-xs uppercase tracking-wider text-sky-400 font-semibold">
            Pricing &amp; Questions
          </span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededf0]">
            Transparent access for every developer
          </h2>
          <p className="mt-3 text-base text-[#8e95a5] leading-relaxed">
            No lock-in, no hidden tiers, and no credit card required.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Honest Pricing Card */}
          <div className="lg:col-span-5 rounded-2xl border border-[#222634] bg-[#0c0e14] p-8 shadow-2xl relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-xs text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Launch Phase</span>
            </div>

            <h3 className="mt-5 font-display text-3xl font-bold text-[#ededf0]">
              Free while we launch
            </h3>
            <p className="mt-2 text-sm text-[#8e95a5] leading-relaxed">
              Everything you need to secure your applications against leaked secrets and misconfigurations.
            </p>

            <div className="my-6 border-t border-[#222634]" />

            <div className="space-y-3.5 text-xs text-[#ededf0] font-medium">
              {[
                "Scan public repos from the web dashboard",
                "The GitHub Action on your own repos",
                "Plain-English findings and fix prompts",
                "Optional AI assistance with daily limits",
                "Zero code retention in memory",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-[#3dd68c] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/sign-up"
                className="inline-flex w-full items-center justify-center rounded-full bg-white py-3 text-xs font-semibold text-[#08090d] shadow-md transition-all hover:bg-neutral-200"
              >
                Get started free &rarr;
              </Link>
            </div>
          </div>

          {/* Accessible FAQ Accordion */}
          <div id="faq" className="lg:col-span-7 space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-[#222634] bg-[#0c0e14] transition-all hover:border-[#555c6d]"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-2xl"
                  >
                    <span className="font-display text-sm font-semibold text-[#ededf0]">
                      {faq.question}
                    </span>
                    <span
                      className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#222634] text-xs text-[#8e95a5] transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-[#161822] text-[#ededf0]" : ""
                      }`}
                      aria-hidden="true"
                    >
                      &darr;
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-[#8e95a5] leading-relaxed border-t border-[#222634]/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
