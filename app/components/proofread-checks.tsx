"use client";

import { useState } from "react";
import { motion } from "motion/react";

const FINDINGS_MARQUEE = [
  "Exposed service key",
  "Open database policy",
  "Hardcoded secret",
  "Unused dependency",
  "Live Stripe key",
  "Missing RLS rule",
  "Unescaped query parameter",
  "Debug log in production",
  "Orphan dead code",
];

export function ProofreadChecks() {
  // Tile 1: Key masking animation
  const [isKeyMasked, setIsKeyMasked] = useState(false);

  // Tile 2: Database policy toggling from open to locked
  const [isPolicyLocked, setIsPolicyLocked] = useState(false);

  // Tile 3: Dead code fading out
  const [isDeadCodeGone, setIsDeadCodeGone] = useState(false);

  return (
    <section id="checks" className="py-24 bg-[var(--bg)] border-t border-[var(--border)] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
            Coverage & Rules
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold text-[var(--fg)] mt-3">
            What the proofreader catches
          </h2>
          <p className="text-base text-[var(--muted)] mt-3 leading-relaxed">
            The four mistakes that turn a fast build into a catastrophic leak. Every check explains what happened in plain terms and provides the patch.
          </p>
        </div>

        {/* Bento Grid with live mini-animations */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Tile 1: Key being masked (Col 7) */}
          <div
            onMouseEnter={() => setIsKeyMasked(true)}
            onMouseLeave={() => setIsKeyMasked(false)}
            className="md:col-span-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between transition-colors hover:border-[var(--muted-subtle)] relative group overflow-hidden"
          >
            <div>
              <span className="font-mono text-xs text-[var(--squiggle-red)] uppercase font-semibold">
                Secrets
              </span>
              <h3 className="text-xl font-semibold text-[var(--fg)] mt-2">
                Keys that were never meant to ship
              </h3>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                Secret tokens get pasted directly into client-side bundles. Hover to watch the redactor automatically mask exposed tokens.
              </p>
            </div>

            <div className="mt-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-xs">
              <span className="text-[var(--muted-subtle)] block mb-1">// Client bundle token:</span>
              <div className="flex items-center justify-between">
                <span className={isKeyMasked ? "text-[var(--cleared-green)] font-semibold" : "text-[var(--fg)]"}>
                  {isKeyMasked ? "sk_live_••••••••••••••••EXAMPLE" : "sk_live_51EXAMPLE_NOT_REAL_KEY"}
                </span>
                <span className="text-[10px] text-[var(--muted)] uppercase font-bold">
                  {isKeyMasked ? "Masked" : "Hover to mask"}
                </span>
              </div>
            </div>
          </div>

          {/* Tile 2: Database policy toggle (Col 5) */}
          <div
            onMouseEnter={() => setIsPolicyLocked(true)}
            onMouseLeave={() => setIsPolicyLocked(false)}
            className="md:col-span-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between transition-colors hover:border-[var(--muted-subtle)] relative group"
          >
            <div>
              <span className="font-mono text-xs text-[var(--squiggle-amber)] uppercase font-semibold">
                Database Rules
              </span>
              <h3 className="text-xl font-semibold text-[var(--fg)] mt-2">
                Rules anyone can walk through
              </h3>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                A rule evaluating to <code className="text-xs">true</code> leaves every customer record accessible to anonymous queries.
              </p>
            </div>

            <div className="mt-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--muted-subtle)] text-[11px]">Security policy:</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    isPolicyLocked
                      ? "bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border border-[var(--cleared-green)]/30"
                      : "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border border-[var(--squiggle-red)]/30"
                  }`}
                >
                  {isPolicyLocked ? "Locked" : "Open"}
                </span>
              </div>
              <div className="text-[var(--fg)] leading-snug">
                using ({isPolicyLocked ? "auth.uid() = user_id" : "true"})
              </div>
            </div>
          </div>

          {/* Tile 3: Dead code fading out (Col 5) */}
          <div
            onMouseEnter={() => setIsDeadCodeGone(true)}
            onMouseLeave={() => setIsDeadCodeGone(false)}
            className="md:col-span-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between transition-colors hover:border-[var(--muted-subtle)] relative group"
          >
            <div>
              <span className="font-mono text-xs text-[var(--cleared-green)] uppercase font-semibold">
                Code Quality
              </span>
              <h3 className="text-xl font-semibold text-[var(--fg)] mt-2">
                Dead code and debug leftovers
              </h3>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                Orphan dependencies and stray <code className="text-xs">console.log</code> calls clutter production deployments.
              </p>
            </div>

            <div className="mt-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-xs">
              <span className="text-[var(--muted-subtle)] block mb-1">Unused source line:</span>
              <div className="transition-opacity duration-300" style={{ opacity: isDeadCodeGone ? 0.2 : 1 }}>
                <span className="text-[var(--squiggle-red)] line-through">
                  console.log(&quot;DEBUG:&quot;, userToken);
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-2">
                {isDeadCodeGone ? "✓ Purged from bundle" : "Hover to clean up"}
              </p>
            </div>
          </div>

          {/* Tile 4: Plain English tip card (Col 7) */}
          <div className="md:col-span-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between transition-colors hover:border-[var(--muted-subtle)]">
            <div>
              <span className="font-mono text-xs text-[var(--muted)] uppercase font-semibold">
                Clarity
              </span>
              <h3 className="text-xl font-semibold text-[var(--fg)] mt-2">
                Plain English, never security jargon
              </h3>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                No compliance acronyms or impenetrable CVE dumps. Just clear explanations of who can do what with the line in question.
              </p>
            </div>

            <div className="mt-8 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-xs text-[var(--fg)] leading-relaxed space-y-2">
              <p className="font-medium">
                &ldquo;Anyone visiting your web application can view the source, copy this admin key, and erase customer databases.&rdquo;
              </p>
              <p className="text-xs font-mono text-[var(--cleared-green)]">
                Fix: Replace with process.env.NEXT_PUBLIC_ANON_KEY
              </p>
            </div>
          </div>
        </div>

        {/* Slow marquee of finding names */}
        <div className="mt-16 pt-8 border-t border-[var(--border)] relative overflow-hidden select-none">
          <div className="flex gap-8 whitespace-nowrap animate-marquee">
            {[...FINDINGS_MARQUEE, ...FINDINGS_MARQUEE].map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 font-mono text-xs text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-full shrink-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--squiggle-red)]" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
