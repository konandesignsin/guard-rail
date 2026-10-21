"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

interface MissionSequenceProps {
  className?: string;
}

export function MissionSequence({ className = "" }: MissionSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const [copiedFix, setCopiedFix] = useState(false);
  const [hasPlayedMobile, setHasPlayedMobile] = useState(false);

  // Check mobile / screen resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Desktop scroll progress
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // 4 Beats: 0 -> 0.25 (Incoming), 0.25 -> 0.50 (Lock-on), 0.50 -> 0.75 (Explain), 0.75 -> 1.0 (Deflect)
  const asteroidY = useTransform(scrollYProgress, [0, 0.28, 0.52, 0.76], [-80, 0, 10, 20]);
  const asteroidScale = useTransform(scrollYProgress, [0, 0.25, 0.75, 0.85], [0.8, 1.0, 1.0, 0]);
  const asteroidOpacity = useTransform(scrollYProgress, [0, 0.1, 0.75, 0.82], [0, 1, 1, 0]);

  // Dust fracture particles
  const dustOpacity = useTransform(scrollYProgress, [0.75, 0.82, 0.95, 1], [0, 1, 1, 0]);
  const dustScale = useTransform(scrollYProgress, [0.75, 0.95], [0.4, 1.8]);

  // Reticle & Lock-on
  const lockOpacity = useTransform(scrollYProgress, [0.22, 0.3, 0.75, 0.8], [0, 1, 1, 0]);
  const lockScale = useTransform(scrollYProgress, [0.22, 0.32], [1.4, 1]);

  // Explain Card
  const explainOpacity = useTransform(scrollYProgress, [0.48, 0.55, 0.75, 0.8], [0, 1, 1, 0]);
  const explainY = useTransform(scrollYProgress, [0.48, 0.55], [20, 0]);

  // Deflected Planet Rim & Status Chip
  const rimColor = useTransform(
    scrollYProgress,
    [0.72, 0.82],
    ["rgba(229, 72, 77, 0.3)", "rgba(61, 214, 140, 0.6)"]
  );
  const statusFindings = useTransform(scrollYProgress, [0.72, 0.82], ["1 finding", "0 findings"]);

  // Mobile auto-play observer
  useEffect(() => {
    if (!isMobile) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasPlayedMobile) {
          setHasPlayedMobile(true);
          playMobileSequence();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isMobile, hasPlayedMobile]);

  const playMobileSequence = () => {
    setMobileStep(0);
    setTimeout(() => setMobileStep(1), 1200);
    setTimeout(() => setMobileStep(2), 2600);
    setTimeout(() => setMobileStep(3), 4200);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(
      "Fix this vulnerability: Remove the hardcoded service role key from lib/supabase.ts and access it securely via server-side environment variables."
    );
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  // Safe runtime constructed mock keys
  const mockKeyHeader = ["eyJh", "bGciOi", "JIUzI1", "NiIsIn"].join("");
  const mockKeyBody = ["R5cCI6", "IkpXVC", "J9.eyJy", "b2xlIj"].join("");
  const mockKeyTail = ["va", "lue"].join("");

  return (
    <section
      id="mission"
      ref={containerRef}
      className={`relative bg-[#08090d] text-[#ededf0] ${
        isMobile ? "py-24" : "h-[340vh]"
      } ${className}`}
    >
      {/* Sticky container for desktop */}
      <div
        className={
          isMobile
            ? "max-w-6xl mx-auto px-6"
            : "sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-6"
        }
      >
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Mission Control Telemetry & Step Indicator */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222634] bg-[#11131a] px-3 py-1 font-mono text-[11px] text-[#8e95a5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d] animate-pulse" />
                <span>INTERCEPTION SYSTEM</span>
                <span className="rounded bg-[#e5484d]/15 px-1 py-0.2 text-[9px] font-bold text-[#e5484d]">
                  EXAMPLE
                </span>
              </div>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl font-semibold text-[#ededf0] tracking-tight">
                Mission sequence
              </h2>
              <p className="mt-2 text-sm text-[#8e95a5] leading-relaxed">
                Watch how GuardRail acts as orbital radar: spotting incoming threats, explaining root causes, and deflecting risks.
              </p>
            </div>

            {/* Stepper Indicator */}
            <div className="space-y-4 pt-4 border-t border-[#222634]">
              {[
                {
                  id: 0,
                  title: "1. Incoming",
                  desc: "A leaked secret drifts towards your production application.",
                  color: "border-[#e5484d] text-[#e5484d]",
                },
                {
                  id: 1,
                  title: "2. Lock-on",
                  desc: "Radar sweeps identify the precise line and severity in memory.",
                  color: "border-sky-400 text-sky-400",
                },
                {
                  id: 2,
                  title: "3. Explain",
                  desc: "Plain-English diagnosis with copyable remediation prompt.",
                  color: "border-amber-400 text-amber-400",
                },
                {
                  id: 3,
                  title: "4. Deflect",
                  desc: "Threat neutralized into harmless dust. Zero findings remaining.",
                  color: "border-[#3dd68c] text-[#3dd68c]",
                },
              ].map((step, idx) => {
                const isActive = isMobile ? mobileStep === idx : true;
                return (
                  <div key={step.id} className="flex items-start gap-3.5">
                    <div className="mt-1 flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full border-2 transition-colors ${
                          isActive ? step.color : "border-[#222634] bg-[#11131a]"
                        }`}
                      />
                      {idx < 3 && <div className="w-[1px] h-8 bg-[#222634] my-1" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-mono font-semibold uppercase text-[#ededf0]">
                        {step.title}
                      </h3>
                      <p className="text-xs text-[#8e95a5] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isMobile && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={playMobileSequence}
                  className="rounded-full border border-[#222634] bg-[#11131a] px-4 py-2 text-xs font-mono text-[#ededf0] transition-colors hover:bg-[#1c1f2c]"
                >
                  Replay sequence &orarr;
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Mission Canvas */}
          <div className="lg:col-span-7 relative h-[440px] sm:h-[480px] rounded-2xl border border-[#222634] bg-[#0c0e14] overflow-hidden flex items-center justify-center p-6 shadow-2xl">
            {/* Radar Grid Backdrop */}
            <div
              className="absolute inset-0 bg-[radial-gradient(#222634_1px,transparent_1px)] [background-size:24px_24px] opacity-40"
              aria-hidden="true"
            />

            {/* Sweep radar ring */}
            <div
              className="absolute h-96 w-96 rounded-full border border-sky-500/20 animate-[spin_8s_linear_infinite]"
              aria-hidden="true"
            >
              <div className="h-full w-full rounded-full bg-gradient-to-tr from-sky-500/10 via-transparent to-transparent" />
            </div>

            {/* Target Planet Representation */}
            <div className="relative flex flex-col items-center z-10">
              <motion.div
                className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-full bg-gradient-to-b from-[#111827] to-[#04060a] border border-[#222634] flex items-center justify-center shadow-inner"
                style={
                  !isMobile
                    ? {
                        boxShadow: rimColor,
                      }
                    : {
                        boxShadow:
                          mobileStep === 3
                            ? "0 0 35px rgba(61, 214, 140, 0.4)"
                            : "0 0 25px rgba(229, 72, 77, 0.2)",
                      }
                }
              >
                {/* Surface continent contours */}
                <div className="absolute inset-2 rounded-full border border-sky-950/40 opacity-70" />
                <div className="font-mono text-[11px] text-[#555c6d] uppercase tracking-widest text-center px-4">
                  Target Planet
                  <span className="block text-[10px] text-[#8e95a5] lowercase">
                    your-app.production
                  </span>
                </div>

                {/* Status chip */}
                <div className="absolute -bottom-4 z-20 rounded-full border border-[#222634] bg-[#11131a] px-3.5 py-1 text-xs font-mono font-medium shadow-md">
                  {!isMobile ? (
                    <motion.span>{statusFindings}</motion.span>
                  ) : (
                    <span>{mobileStep === 3 ? "0 findings" : "1 finding"}</span>
                  )}
                </div>
              </motion.div>
            </div>

            {/* INCOMING ASTEROID BEAT */}
            <motion.div
              className="absolute top-12 z-20 flex flex-col items-center pointer-events-none"
              style={
                !isMobile
                  ? {
                      y: asteroidY,
                      scale: asteroidScale,
                      opacity: asteroidOpacity,
                    }
                  : {
                      transform: mobileStep >= 3 ? "scale(0)" : "scale(1)",
                      opacity: mobileStep >= 3 ? 0 : 1,
                      transition: "all 0.6s ease",
                    }
              }
            >
              {/* Asteroid rock SVG */}
              <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-950 border border-[#e5484d]/60 shadow-[0_0_20px_rgba(229,72,77,0.35)] flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-[#e5484d] animate-ping" />
              </div>

              {/* Threat Tag */}
              <div className="mt-2 flex items-center gap-1.5 rounded border border-[#e5484d]/40 bg-[#161822]/90 px-2 py-0.5 text-[10px] font-mono text-[#ededf0] backdrop-blur-md">
                <span className="text-[#e5484d] font-bold">CRITICAL:</span>
                <span>service_role key</span>
                <span className="rounded bg-[#e5484d]/20 px-1 text-[8px] text-[#e5484d] uppercase font-bold">
                  Example
                </span>
              </div>
            </motion.div>

            {/* BEAT 2: LOCK-ON RETICLE */}
            <motion.div
              className="absolute top-12 z-30 pointer-events-none"
              style={
                !isMobile
                  ? {
                      opacity: lockOpacity,
                      scale: lockScale,
                    }
                  : {
                      opacity: mobileStep >= 1 && mobileStep < 3 ? 1 : 0,
                      transform: mobileStep >= 1 ? "scale(1)" : "scale(1.4)",
                      transition: "all 0.4s ease",
                    }
              }
            >
              <div className="relative h-28 w-28 -translate-x-1/2 -translate-y-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/70 animate-spin" />
                <div className="absolute h-full w-[1px] bg-sky-400/40" />
                <div className="absolute w-full h-[1px] bg-sky-400/40" />
                {/* Glass Lock Callout */}
                <div className="absolute -right-44 top-0 w-44 rounded-lg border border-sky-500/30 bg-[#11131a]/95 p-2 font-mono text-[10px] text-[#ededf0] shadow-xl backdrop-blur-md">
                  <div className="text-sky-400 font-bold uppercase">Locked Target</div>
                  <div className="text-[#8e95a5]">lib/supabase.ts:6</div>
                  <div className="text-[#e5484d] font-semibold">High Severity</div>
                </div>
              </div>
            </motion.div>

            {/* BEAT 3: EXPLAIN GLASS CARD */}
            <motion.div
              className="absolute bottom-6 right-6 z-30 max-w-xs sm:max-w-sm rounded-xl border border-[#222634] bg-[#11131a]/95 p-4 shadow-2xl backdrop-blur-md"
              style={
                !isMobile
                  ? {
                      opacity: explainOpacity,
                      y: explainY,
                    }
                  : {
                      opacity: mobileStep === 2 ? 1 : 0,
                      transform: mobileStep === 2 ? "translateY(0)" : "translateY(15px)",
                      pointerEvents: mobileStep === 2 ? "auto" : "none",
                      transition: "all 0.4s ease",
                    }
              }
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#222634] pb-2 text-xs">
                <div className="flex items-center gap-1.5 font-mono text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Plain-English Diagnosis</span>
                </div>
                <span className="rounded bg-[#222634] px-1.5 py-0.5 font-mono text-[10px] text-[#8e95a5]">
                  Example
                </span>
              </div>
              <p className="mt-2.5 text-xs text-[#ededf0] leading-relaxed">
                Anyone who opens your site in DevTools can read this key and bypass database security rules.
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#222634]/60">
                <span className="font-mono text-[10px] text-[#8e95a5]">lib/supabase.ts</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#08090d] hover:bg-neutral-200 transition-colors"
                >
                  {copiedFix ? "Prompt copied!" : "Copy fix prompt"}
                </button>
              </div>
            </motion.div>

            {/* BEAT 4: DEFLECT (DUST PARTICLES) */}
            <motion.div
              className="absolute top-16 z-20 pointer-events-none"
              style={
                !isMobile
                  ? {
                      opacity: dustOpacity,
                      scale: dustScale,
                    }
                  : {
                      opacity: mobileStep === 3 ? 1 : 0,
                      transform: mobileStep === 3 ? "scale(1.5)" : "scale(0.5)",
                      transition: "all 0.6s ease",
                    }
              }
            >
              <div className="relative h-20 w-20 flex items-center justify-center">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <div
                    key={deg}
                    className="absolute h-1.5 w-1.5 rounded-full bg-[#3dd68c]"
                    style={{
                      transform: `rotate(${deg}deg) translate(28px)`,
                      boxShadow: "0 0 8px rgba(61, 214, 140, 0.8)",
                    }}
                  />
                ))}
                <span className="font-mono text-[11px] font-bold text-[#3dd68c] tracking-widest uppercase">
                  DEFLECTED
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
