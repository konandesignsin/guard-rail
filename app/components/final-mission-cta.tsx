"use client";

import Link from "next/link";
import { SquiggleUnderline } from "@/app/components/squiggle";

export function FinalMissionCta() {
  return (
    <section className="relative py-32 bg-[#040508] border-t border-[#222634] overflow-hidden text-center text-[#ededf0]">
      {/* Soft planet glow background */}
      <div
        className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 h-80 w-[42rem] rounded-full bg-gradient-to-t from-sky-500/20 via-[#1e3a8a]/10 to-transparent blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-[#e5484d]/10 blur-[100px]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center">
        {/* Soft radar pulse badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#222634] bg-[#11131a] px-3.5 py-1 text-xs font-mono text-[#8e95a5] mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3dd68c] animate-pulse" />
          <span>MISSION READY</span>
        </div>

        <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-[#ededf0] max-w-2xl leading-tight">
          Check it before your{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span>users do.</span>
            <span className="absolute left-0 right-0 -bottom-2 text-[#e5484d]">
              <SquiggleUnderline />
            </span>
          </span>
        </h2>

        <p className="mt-6 text-base sm:text-lg text-[#8e95a5] max-w-xl leading-relaxed">
          Spot leaked keys, unauthenticated database rules, and security regressions before they hit production.
        </p>

        <div className="mt-10">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-full bg-white px-9 py-4 text-sm font-semibold text-[#08090d] shadow-2xl transition-all hover:bg-neutral-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090d]"
          >
            Scan my repo &rarr;
          </Link>
        </div>

        <p className="mt-5 text-xs font-mono text-[#555c6d]">
          Free while we launch &bull; in-memory scanning &bull; github action included
        </p>
      </div>
    </section>
  );
}
