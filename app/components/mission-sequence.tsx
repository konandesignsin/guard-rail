"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useScroll, motion } from "motion/react";

const MissionScene3D = dynamic(
  () => import("@/app/components/mission-scene-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-[#08090d] via-[#0c0e14] to-[#08090d] animate-pulse" />
    ),
  }
);

interface MissionSequenceProps {
  className?: string;
}

export function MissionSequence({ className = "" }: MissionSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedFix, setCopiedFix] = useState(false);

  // Scroll tracking to drive 3D scene step
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    return scrollYProgress.on("change", (latest) => {
      // 4 steps distributed along scroll progress
      if (latest < 0.28) {
        setCurrentStep(0);
      } else if (latest < 0.54) {
        setCurrentStep(1);
      } else if (latest < 0.78) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    });
  }, [scrollYProgress]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(
      "Fix this vulnerability: Remove the hardcoded service role key from src/lib/supabase.ts:14 and access it securely via server-side environment variables."
    );
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  const STEPS_TEXT = [
    {
      idx: 0,
      title: "Incoming",
      badge: "Detected threats",
      desc: "Glowing red anomalous objects drift toward your application's orbit. Embedded secrets and unauthenticated database rules expose records before launch.",
      meta: "2 threats in trajectory",
    },
    {
      idx: 1,
      title: "Lock-on",
      badge: "Target Acquired",
      desc: "The 3D scanning ring sweeps the codebase. The radar reticle locks directly onto line 14 of src/lib/supabase.ts with high severity classification.",
      meta: "src/lib/supabase.ts:14, high",
    },
    {
      idx: 2,
      title: "Explain",
      badge: "Plain-English diagnosis",
      desc: "Camera eases onto the locked threat. A glass diagnostics panel decodes the root cause: anyone opening your web application can extract this master key and bypass all database policies.",
      meta: "Remediation prompt ready",
    },
    {
      idx: 3,
      title: "Deflect",
      badge: "0 findings",
      desc: "The planetary energy shield flashes. Threats shatter into harmless particles and dissipate into the atmosphere. The findings counter drops to zero.",
      meta: "Shield status: Secure",
    },
  ];

  return (
    <section
      id="mission"
      ref={containerRef}
      className={`relative bg-[#08090d] text-[#ededf0] border-t border-[#222634] ${className}`}
    >
      {/* Pinned Layout: 320vh height so user scrolls through 4 steps */}
      <div className="relative h-[320vh]">
        {/* Sticky viewport frame containing 2 columns */}
        <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
          <div className="max-w-6xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full py-16">
            
            {/* Left Column: 4 Steps Text (Readable over space background) */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6 z-20">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-sky-400 font-semibold">
                  Orbital Telemetry &bull; Interception
                </span>
                <span className="rounded bg-[#222634] px-1.5 py-0.5 text-[9px] font-mono text-[#8e95a5] uppercase">
                  EXAMPLE
                </span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededf0]">
                Mission sequence
              </h2>

              {/* Active Step Card */}
              <div className="relative min-h-[220px] rounded-2xl border border-[#222634] bg-[#0c0e14]/90 p-6 backdrop-blur-md shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-[#8e95a5]">
                    Phase 0{currentStep + 1} of 04
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                      currentStep === 3
                        ? "bg-[#3dd68c]/15 text-[#3dd68c] border border-[#3dd68c]/30"
                        : currentStep === 1 || currentStep === 0
                        ? "bg-[#e5484d]/15 text-[#e5484d] border border-[#e5484d]/30"
                        : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                    }`}
                  >
                    {STEPS_TEXT[currentStep].badge}
                  </span>
                </div>

                <h3 className="font-display text-2xl font-semibold text-[#ededf0]">
                  {STEPS_TEXT[currentStep].title}
                </h3>
                <p className="mt-2.5 text-sm text-[#8e95a5] leading-relaxed">
                  {STEPS_TEXT[currentStep].desc}
                </p>

                <div className="mt-4 pt-3 border-t border-[#222634] flex items-center justify-between text-xs font-mono">
                  <span className="text-sky-400">{STEPS_TEXT[currentStep].meta}</span>
                  {currentStep === 2 && (
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="cursor-pointer rounded-full bg-white px-3 py-1 font-sans text-xs font-medium text-[#08090d] hover:bg-neutral-200 transition-colors"
                    >
                      {copiedFix ? "Prompt copied!" : "Copy fix prompt"}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress step indicators */}
              <div className="flex items-center gap-2 pt-2">
                {[0, 1, 2, 3].map((stepIdx) => (
                  <button
                    key={stepIdx}
                    type="button"
                    onClick={() => setCurrentStep(stepIdx)}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      currentStep === stepIdx
                        ? "bg-sky-400"
                        : "bg-[#222634] hover:bg-[#555c6d]"
                    }`}
                    aria-label={`Jump to step ${stepIdx + 1}`}
                  />
                ))}
              </div>

              {/* Texture credits line */}
              <p className="text-[10px] font-mono text-[#555c6d]">
                Planet imagery &bull; Solar System Scope (CC BY 4.0) &amp; NASA Visible Earth
              </p>
            </div>

            {/* Right Column: Sticky 3D WebGL Scene */}
            <div className="lg:col-span-7 relative h-[420px] sm:h-[500px] lg:h-[560px] w-full rounded-2xl border border-[#222634] bg-[#0c0e14] overflow-hidden shadow-2xl flex items-center justify-center">
              {/* Live 3D Scene */}
              <MissionScene3D currentStep={currentStep} />

              {/* Findings HUD Chip */}
              <div className="absolute top-5 right-5 z-20 flex items-center gap-2 rounded-full border border-[#222634] bg-[#11131a]/85 px-3.5 py-1.5 backdrop-blur-md text-xs font-mono">
                <span
                  className={`h-2 w-2 rounded-full ${
                    currentStep === 3 ? "bg-[#3dd68c]" : "bg-[#e5484d] animate-ping"
                  }`}
                />
                <span className="text-[#ededf0]">
                  {currentStep === 3 ? "0 findings remaining" : "2 active findings"}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
