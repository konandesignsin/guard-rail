"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { Magnetic } from "@/app/components/magnetic";

export function ProofreadFinalCta() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-28 bg-[var(--bg)] border-t border-[var(--border)] relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-64 w-[32rem] bg-[var(--cleared-green)]/10 blur-[90px] rounded-full"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        {/* BIG LINE: Red squiggle morphing into a green check as it enters view */}
        <div className="mb-6 flex flex-col items-center">
          <div className="h-16 w-32 relative flex items-center justify-center">
            {/* Morphing SVG */}
            <motion.svg
              viewBox="0 0 100 40"
              className="w-full h-full overflow-visible"
              initial={false}
              animate={isInView ? "checked" : "squiggly"}
            >
              {/* Red Squiggle state */}
              <motion.path
                d="M 10 20 Q 20 10, 30 20 T 50 20 T 70 20 T 90 20"
                stroke="var(--squiggle-red)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                variants={{
                  squiggly: { opacity: 1, pathLength: 1 },
                  checked: { opacity: 0, pathLength: 0 },
                }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />

              {/* Green Check state */}
              <motion.path
                d="M 28 22 L 44 34 L 74 12"
                stroke="var(--cleared-green)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                variants={{
                  squiggly: { opacity: 0, pathLength: 0 },
                  checked: { opacity: 1, pathLength: 1 },
                }}
                transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
              />
            </motion.svg>
          </div>
        </div>

        <h2 className="text-3xl sm:text-5xl font-display font-semibold text-[var(--fg)] tracking-tight text-balance">
          Run the proofread before you ship.
        </h2>
        <p className="mt-4 text-lg text-[var(--muted)] max-w-[48ch] leading-relaxed">
          Catch exposed database secrets and unauthenticated rules right inside your repository. Free for individual builders.
        </p>

        {/* Action Button with Magnetic Hover */}
        <div className="mt-10">
          <Magnetic strength={0.3}>
            <Link
              href="/sign-up"
              className="inline-flex items-center rounded-full bg-white px-9 py-4 text-base font-semibold text-[var(--bg)] shadow-2xl hover:bg-neutral-200 transition-all hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none"
            >
              Sign up and start proofreading &rarr;
            </Link>
          </Magnetic>
        </div>

        <p className="mt-4 font-mono text-xs text-[var(--muted-subtle)]">
          Free &bull; zero setup required &bull; github integration ready
        </p>
      </div>
    </section>
  );
}
