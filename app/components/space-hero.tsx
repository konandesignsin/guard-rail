"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { SquiggleUnderline } from "@/app/components/squiggle";

const SpaceHeroScene = dynamic(
  () => import("@/app/components/space-hero-scene"),
  {
    ssr: false,
    loading: () => null,
  }
);

interface SpaceHeroProps {
  authButtons?: React.ReactNode;
}

export function SpaceHero({ authButtons }: SpaceHeroProps) {
  const [sceneReady, setSceneReady] = useState(false);

  return (
    <section className="relative min-h-[100svh] w-full flex flex-col justify-center overflow-hidden bg-[#040508] text-[#ededf0]">
      {/* 3D WebGL Space Canvas */}
      <SpaceHeroScene onLoaded={() => setSceneReady(true)} />

      {/* Atmospheric radial glows & scrim for guaranteed text contrast */}
      <div
        className="pointer-events-none absolute inset-0 bg-radial from-transparent via-[#040508]/40 to-[#040508]/90"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-sky-950/20 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 h-[30rem] w-[30rem] rounded-full bg-blue-950/15 blur-[140px]"
        aria-hidden="true"
      />

      {/* Floating Risk Chips on Desktop (labeled Example) */}
      <div
        className="pointer-events-none absolute hidden lg:flex top-[32%] left-[12%] items-center gap-2 rounded-full border border-[#e5484d]/40 bg-[#161822]/80 px-3 py-1 backdrop-blur-md shadow-[0_0_15px_rgba(229,72,77,0.25)] text-xs font-mono"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d] animate-ping" />
        <span className="text-[#ededf0] font-medium">Exposed key</span>
        <span className="rounded bg-[#e5484d]/20 px-1 py-0.2 text-[10px] text-[#e5484d] uppercase font-bold tracking-wider">
          Example
        </span>
      </div>

      <div
        className="pointer-events-none absolute hidden lg:flex top-[24%] right-[22%] items-center gap-2 rounded-full border border-[#e5484d]/40 bg-[#161822]/80 px-3 py-1 backdrop-blur-md shadow-[0_0_15px_rgba(229,72,77,0.25)] text-xs font-mono"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d] animate-ping" />
        <span className="text-[#ededf0] font-medium">Open database rule</span>
        <span className="rounded bg-[#e5484d]/20 px-1 py-0.2 text-[10px] text-[#e5484d] uppercase font-bold tracking-wider">
          Example
        </span>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-16 sm:pt-32">
        <div className="max-w-3xl">
          {/* Subtle radar pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#222634] bg-[#11131a]/80 px-3.5 py-1.5 backdrop-blur-md mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#38bdf8] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#38bdf8]" />
            </span>
            <span className="font-mono text-xs text-[#8e95a5] tracking-wide">
              Mission Control &bull; Autonomous Security Radar
            </span>
          </div>

          {/* Stable <h1> */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#ededf0] leading-[1.08]">
            Find the{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span>leaked key</span>
              <span className="absolute left-0 right-0 -bottom-2 text-[#e5484d]">
                <SquiggleUnderline />
              </span>
            </span>{" "}
            before your users do.
          </h1>

          {/* One-line subheading */}
          <p className="mt-8 text-lg sm:text-xl text-[#8e95a5] max-w-2xl leading-relaxed">
            The mission radar that spots leaked secrets, open database rules, and high-impact risks before they hit production.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {authButtons ? (
              authButtons
            ) : (
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#08090d] shadow-xl transition-all hover:bg-neutral-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090d]"
              >
                Scan my repo
              </Link>
            )}

            <a
              href="#mission"
              className="inline-flex items-center justify-center rounded-full border border-[#222634] bg-[#11131a]/70 px-7 py-3.5 text-sm font-medium text-[#ededf0] backdrop-blur-md transition-all hover:border-[#555c6d] hover:bg-[#1c1f2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              See how it works
            </a>
          </div>

          {/* Quick trust metrics */}
          <div className="mt-12 flex flex-wrap items-center gap-6 text-xs text-[#8e95a5] font-mono">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3dd68c]" />
              In-memory scanning
            </span>
            <span className="text-[#222634]">&bull;</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8]" />
              Open source GitHub Action
            </span>
            <span className="text-[#222634]">&bull;</span>
            <span>Zero configuration required</span>
          </div>
        </div>
      </div>
    </section>
  );
}
