"use client";

import { useRef, useState, useCallback, lazy, Suspense, useEffect } from "react";
import type { BrandLogoHandle } from "./brand-logo-scene";

const BrandLogoCanvas = lazy(
  () =>
    import("./brand-logo-scene").then((m) => ({
      default: m.BrandLogoCanvas,
    })),
);

function FlatLogoFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/guardrail-logo-light.svg"
        alt="GuardRail logo"
        className="w-[260px] sm:w-[340px] md:w-[400px] drop-shadow-[0_0_40px_rgba(229,72,77,0.35)]"
      />
    </div>
  );
}

export function BrandShowcase() {
  const logoRef = useRef<BrandLogoHandle>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleMouseEnter = useCallback(() => logoRef.current?.setHover(true), []);
  const handleMouseLeave = useCallback(() => logoRef.current?.setHover(false), []);
  const handleClick = useCallback(() => logoRef.current?.triggerSpin(), []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[700px] sm:min-h-[780px] flex flex-col items-center justify-center py-20 sm:py-28 bg-[#040508] border-t border-[#222634] overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(49,46,129,0.18),transparent)]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center max-w-5xl mx-auto px-6 w-full">
        <div
          className="relative w-full h-[320px] sm:h-[400px] md:h-[460px] cursor-pointer select-none"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          role="img"
          aria-label="GuardRail logo"
        >
          <FlatLogoFallback
            className={`absolute inset-0 transition-opacity duration-700 ${
              loaded ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          />

          {inView && (
            <Suspense fallback={null}>
              <div
                className={`absolute inset-0 transition-opacity duration-700 ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
              >
                <BrandLogoCanvas
                  ref={logoRef}
                  onLoaded={() => setLoaded(true)}
                  fallback={<FlatLogoFallback className="h-full" />}
                />
              </div>
            </Suspense>
          )}
        </div>

        <h2 className="mt-6 sm:mt-10 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#ededf0] text-center leading-[1.12] max-w-3xl">
          Guarded before it ships.
        </h2>

        <p className="mt-5 text-base sm:text-lg text-[#94a3b8] text-center max-w-xl leading-relaxed">
          Every commit runs through GuardRail&apos;s in-memory radar.
          <br className="hidden sm:block" />
          Leaked keys, open database rules, and security regressions &mdash; caught before they reach production.
        </p>
      </div>
    </section>
  );
}
