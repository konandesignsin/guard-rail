"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SquiggleUnderline } from "@/app/components/squiggle";
import { Magnetic } from "@/app/components/magnetic";
import type { HorizonSceneHandle } from "@/app/components/horizon-scene-3d";

const HorizonScene3D = dynamic(
  () => import("@/app/components/horizon-scene-3d").then((mod) => mod.HorizonScene3D),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#ff8a5c]/15 via-[#0c0e14] to-[#040508] animate-pulse pointer-events-none"
        aria-hidden="true"
      />
    ),
  }
);

interface FinalMissionCtaProps {
  user?: boolean;
}

export function FinalMissionCta({ user = false }: FinalMissionCtaProps) {
  const router = useRouter();
  const sceneRef = useRef<HorizonSceneHandle>(null);
  const [isWarping, setIsWarping] = useState(false);

  const destination = user ? "/dashboard" : "/sign-up";

  const handleMouseEnter = () => {
    sceneRef.current?.setHover(true);
  };

  const handleMouseLeave = () => {
    sceneRef.current?.setHover(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Check prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      router.push(destination);
      return;
    }

    if (isWarping) return;
    setIsWarping(true);

    // Start navigating immediately in background so it never delays page load
    router.prefetch(destination);

    // Trigger warp jump in 3D scene
    try {
      sceneRef.current?.triggerWarp(() => {
        router.push(destination);
      });
    } catch {
      router.push(destination);
    }

    // Safety timeout: never block navigation if animation stalls
    setTimeout(() => {
      router.push(destination);
    }, 1100);
  };

  return (
    <section className="relative min-h-[640px] sm:min-h-[720px] flex flex-col justify-start items-center pt-20 pb-36 sm:pt-28 sm:pb-48 bg-[#040508] border-t border-[#222634] overflow-hidden text-center text-[#ededf0]">
      {/* 3D Horizon Planet & Starfield Scene */}
      <HorizonScene3D ref={sceneRef} />

      {/* Dark gradient backdrop around text to guarantee AAA contrast and separation from glowing rim */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-[#040508] via-[#040508]/85 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center">
        {/* Headline */}
        <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-[#ededf0] max-w-3xl leading-[1.12]">
          Check it before your{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span>users do.</span>
            <span className="absolute left-0 right-0 -bottom-2 text-[#e5484d]">
              <SquiggleUnderline />
            </span>
          </span>
        </h2>

        {/* Subtext */}
        <p className="mt-5 text-base sm:text-lg text-[#94a3b8] max-w-xl leading-relaxed">
          Spot leaked keys, unauthenticated database rules, and security regressions before they hit production.
        </p>

        {/* CTA Button with Magnetic Pull & Hyperspace Hover */}
        <div className="mt-9">
          <Magnetic strength={0.25}>
            <a
              href={destination}
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onFocus={handleMouseEnter}
              onBlur={handleMouseLeave}
              className={`relative inline-flex items-center justify-center rounded-full bg-white px-9 py-4 text-sm font-semibold text-[#08090d] shadow-2xl transition-all duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090d] ${
                isWarping ? "opacity-40 scale-95" : "hover:shadow-[0_0_40px_rgba(255,255,255,0.45)]"
              }`}
            >
              <span>Scan my repo &rarr;</span>
            </a>
          </Magnetic>
        </div>

        {/* Clear, readable honest guarantee line with generous dark gap above planet rim */}
        <p className="mt-6 mb-16 sm:mb-24 text-xs sm:text-sm text-[#cbd5e1] font-sans font-medium tracking-wide">
          Free while we launch &bull; In-memory scanning &bull; GitHub Action included
        </p>
      </div>
    </section>
  );
}
