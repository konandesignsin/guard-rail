"use client";

import { motion } from "motion/react";

const STEPS = [
  {
    title: "Scan",
    tagline: "Autonomous radar sweep.",
    description: "Inspects AST and token streams in-memory without uploading code or running servers.",
    glyph: (
      <svg viewBox="0 0 48 48" className="h-10 w-10 text-sky-400" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
        <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
        <motion.line
          x1="24"
          y1="24"
          x2="44"
          y2="24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          style={{ originX: "24px", originY: "24px" }}
        />
      </svg>
    ),
  },
  {
    title: "Find",
    tagline: "Precision lock-on reticle.",
    description: "Flags exact lines, identifies leaked secret types, and maps open database rules.",
    glyph: (
      <svg viewBox="0 0 48 48" className="h-10 w-10 text-[#e5484d]" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
        <motion.rect
          x="14"
          y="14"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="1.75"
          rx="3"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        />
        <path d="M24 6V12M24 36V42M6 24H12M36 24H42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Fix",
    tagline: "Deflect and neutralize.",
    description: "Generates plain-English fixes and copyable prompts to restore your repo to 0 findings.",
    glyph: (
      <svg viewBox="0 0 48 48" className="h-10 w-10 text-[#3dd68c]" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
        <motion.path
          d="M14 24L21 31L34 17"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
    ),
  },
];

export function MissionHowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 bg-[#08090d] border-t border-[#222634] text-[#ededf0]">
      <div className="max-w-6xl mx-auto px-6">
        <header className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-sky-400 tracking-wider uppercase font-semibold">
            <span>Workflow &bull; 3 Operations</span>
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededf0]">
            How GuardRail guards your orbit
          </h2>
          <p className="mt-3 text-base text-[#8e95a5] leading-relaxed">
            Three automated phases run continuously to ensure risky lines never make it into deployed customer software.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, idx) => (
            <div
              key={step.title}
              className="group relative rounded-2xl border border-[#222634] bg-[#0c0e14] p-7 transition-all duration-300 hover:border-[#555c6d] hover:bg-[#11131a]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#222634] bg-[#161822]">
                  {step.glyph}
                </div>
                <span className="font-mono text-xs text-[#555c6d]">0{idx + 1}</span>
              </div>

              <h3 className="mt-6 font-display text-xl font-semibold text-[#ededf0]">
                {step.title}
              </h3>
              <p className="mt-1 text-xs font-mono text-sky-400 font-medium">
                {step.tagline}
              </p>
              <p className="mt-3 text-sm text-[#8e95a5] leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
