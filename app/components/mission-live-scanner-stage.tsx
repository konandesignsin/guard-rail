"use client";

import { useEffect, useRef, useState } from "react";
import { ScoreRing } from "@/app/components/score-ring";

type Phase = "scan" | "find" | "fix";

const PHASE_CONFIG: Record<Phase, { title: string; num: string; label: string; desc: string }> = {
  scan: {
    num: "01",
    title: "SCAN",
    label: "Laser beam AST traversal",
    desc: "Autonomous sweep inspects tokens in-memory without compiling or uploading code.",
  },
  find: {
    num: "02",
    title: "FIND",
    label: "Lock-on bracket identification",
    desc: "Identifies leaked service keys, overly permissive RLS, and client-side exposures.",
  },
  fix: {
    num: "03",
    title: "FIX",
    label: "Deflected remediation prompt",
    desc: "Rewrites the line with safe server-side environment variables and generates copyable prompts.",
  },
};

// Safe runtime key construction (no literal complete key strings)
const FAKE_PART1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const FAKE_PART2 = "eyJyb2xlIjoic2VydmljZV9yb2xlIiwiZXhwIjoxMjN9";
const FAKE_PART3 = "EXAMPLE_NOT_REAL_KEY";
const MOCK_LEAKY_KEY = `"${FAKE_PART1}.${FAKE_PART2}.${FAKE_PART3}"`;

export function MissionLiveScannerStage() {
  const [phase, setPhase] = useState<Phase>("scan");
  const [isPlaying, setIsPlaying] = useState(true);
  const [scanLineIndex, setScanLineIndex] = useState(0);
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // 3D Mouse Parallax Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
    setMouseTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  // Automated Phase Loop (Scan -> Find -> Fix)
  useEffect(() => {
    if (!isPlaying) return;

    let timer: NodeJS.Timeout;

    if (phase === "scan") {
      // Animate scan beam traversing lines 0 to 14
      let curLine = 0;
      const scanInterval = setInterval(() => {
        curLine++;
        setScanLineIndex(curLine);
        if (curLine >= 14) {
          clearInterval(scanInterval);
          timer = setTimeout(() => setPhase("find"), 800);
        }
      }, 120);
      return () => {
        clearInterval(scanInterval);
        clearTimeout(timer);
      };
    } else if (phase === "find") {
      timer = setTimeout(() => {
        setPhase("fix");
      }, 3600);
    } else if (phase === "fix") {
      timer = setTimeout(() => {
        setPhase("scan");
        setScanLineIndex(0);
      }, 4200);
    }

    return () => clearTimeout(timer);
  }, [phase, isPlaying]);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      "Fix: Replace hardcoded client-side createClient key with process.env.SUPABASE_SERVICE_ROLE_KEY invoked exclusively via authenticated server actions or backend routes."
    );
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Code editor lines
  const CODE_LINES = [
    { num: 1, text: '// src/lib/supabase.ts' },
    { num: 2, text: 'import { createClient } from "@supabase/supabase-js";' },
    { num: 3, text: '' },
    { num: 4, text: 'const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;' },
    {
      num: 5,
      isBad: true,
      badText: `export const supabase = createClient(supabaseUrl, ${MOCK_LEAKY_KEY});`,
      fixedText: 'export const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);',
    },
    { num: 6, text: '' },
    { num: 7, text: 'export async function getUserProfile(userId: string) {' },
    { num: 8, text: '  const { data, error } = await supabase' },
    { num: 9, text: '    .from("profiles")' },
    { num: 10, text: '    .select("*")' },
    { num: 11, text: '    .eq("id", userId);' },
    { num: 12, text: '  return { data, error };' },
    { num: 13, text: '}' },
    { num: 14, text: 'export const runtime = "nodejs";' },
  ];

  return (
    <section
      id="live-stage"
      className="relative py-24 bg-[#08090d] border-t border-[#222634] text-[#ededf0]"
    >
      <div className="max-w-6xl mx-auto px-6">
        <header className="max-w-2xl mb-12">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-sky-400 font-semibold">
              Live Stage &bull; Autonomous Verification
            </span>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-full border border-[#222634] bg-[#11131a] px-2.5 py-0.5 font-mono text-[10px] text-[#8e95a5] hover:text-[#ededf0]"
            >
              {isPlaying ? "Pause \u23F8" : "Play \u25B6"}
            </button>
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededf0]">
            How GuardRail guards your orbit
          </h2>
          <p className="mt-3 text-base text-[#8e95a5] leading-relaxed">
            Watch the static analysis engine inspect an active file, locate the exposed service key, and rewrite the line safely in real time.
          </p>
        </header>

        {/* Live Stage Main Window */}
        <div
          ref={stageRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-[#222634] bg-[#0c0e14] p-6 sm:p-10 shadow-2xl transition-transform duration-300"
          style={{
            perspective: "1200px",
          }}
        >
          {/* Left: Code Editor Window with 3D Depth */}
          <div
            className="lg:col-span-8 rounded-2xl border border-[#222634] bg-[#08090d] shadow-2xl overflow-hidden transition-transform duration-200"
            style={{
              transform: `rotateY(${mouseTilt.x}deg) rotateX(${mouseTilt.y}deg)`,
            }}
          >
            {/* Editor Window Title Bar */}
            <div className="flex items-center justify-between border-b border-[#222634] bg-[#11131a] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#222634]" />
                <span className="ml-2 font-mono text-xs text-[#8e95a5]">src/lib/supabase.ts</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#8e95a5]">
                {phase === "scan" && (
                  <span className="text-sky-400">
                    Scanning line {Math.min(scanLineIndex + 1, CODE_LINES.length)} of {CODE_LINES.length}...
                  </span>
                )}
                {phase === "find" && (
                  <span className="text-[#e5484d] font-semibold">1 critical exposure locked</span>
                )}
                {phase === "fix" && (
                  <span className="text-[#3dd68c] font-semibold">Line patched &bull; Pass</span>
                )}
              </div>
            </div>

            {/* Code Lines with Syntax Coloring */}
            <div className="relative p-5 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto min-h-[300px]">
              {/* Scan Beam Horizontal Line */}
              {phase === "scan" && (
                <div
                  className="pointer-events-none absolute left-0 right-0 h-7 bg-sky-500/15 border-y border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all duration-100"
                  style={{
                    top: `${scanLineIndex * 24 + 16}px`,
                  }}
                />
              )}

              {CODE_LINES.map((line, idx) => {
                const isScanningThisLine = phase === "scan" && scanLineIndex === idx;

                if (line.isBad) {
                  return (
                    <div
                      key={line.num}
                      className={`relative flex items-center rounded px-2 transition-colors ${
                        phase === "find"
                          ? "bg-[#e5484d]/15 border border-[#e5484d]/40 shadow-[0_0_15px_rgba(229,72,77,0.2)]"
                          : phase === "fix"
                          ? "bg-[#3dd68c]/15 border border-[#3dd68c]/40"
                          : isScanningThisLine
                          ? "text-sky-300"
                          : ""
                      }`}
                    >
                      <span className="w-8 shrink-0 text-[#555c6d] select-none font-mono text-[11px]">
                        {line.num}
                      </span>
                      <div className="flex-1 font-mono">
                        {phase === "fix" ? (
                          <span className="text-[#3dd68c] font-medium">
                            + {line.fixedText}
                          </span>
                        ) : (
                          <span className={phase === "find" ? "text-[#e5484d] font-medium" : "text-[#ededf0]"}>
                            {line.badText}
                          </span>
                        )}
                      </div>

                      {/* Tooltip on Find Phase */}
                      {phase === "find" && (
                        <div className="absolute -top-10 right-4 z-30 rounded-lg border border-[#e5484d]/60 bg-[#161822] px-3 py-1 text-[11px] font-mono text-[#ededf0] shadow-xl backdrop-blur-md">
                          <span className="font-bold text-[#e5484d]">High: </span>
                          <span>Exposed service_role key</span>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={line.num}
                    className={`flex items-center px-2 ${
                      isScanningThisLine ? "text-sky-300 font-medium" : "text-[#8e95a5]"
                    }`}
                  >
                    <span className="w-8 shrink-0 text-[#555c6d] select-none font-mono text-[11px]">
                      {line.num}
                    </span>
                    <span>{line.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Fix Panel (Phase 3) */}
            <div className="border-t border-[#222634] bg-[#11131a] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <ScoreRing
                  score={phase === "fix" ? 98 : phase === "find" ? 52 : 74}
                  size={42}
                  strokeWidth={4.5}
                />
                <div>
                  <span className="font-mono font-semibold text-[#ededf0]">
                    {phase === "fix"
                      ? "Score: 98/100 (Clean Orbit)"
                      : phase === "find"
                      ? "Score: 52/100 (Critical Leak)"
                      : "Scanning In-Memory..."}
                  </span>
                  <p className="text-[11px] text-[#8e95a5]">
                    {phase === "fix"
                      ? "Remediation verified with zero external data exposure."
                      : "Checks pass locally without uploading proprietary assets."}
                  </p>
                </div>
              </div>

              {phase === "fix" && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full bg-white px-3.5 py-1.5 font-mono text-xs font-medium text-[#08090d] hover:bg-neutral-200 transition-colors shrink-0"
                >
                  {copiedPrompt ? "Prompt copied!" : "Copy fix prompt"}
                </button>
              )}
            </div>
          </div>

          {/* Right: Vertical Phase Navigation Rail */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            {(["scan", "find", "fix"] as Phase[]).map((p) => {
              const active = phase === p;
              const cfg = PHASE_CONFIG[p];

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPhase(p)}
                  className={`text-left rounded-2xl border p-5 transition-all cursor-pointer ${
                    active
                      ? "border-sky-400/60 bg-[#11131a] shadow-lg shadow-sky-500/10 scale-[1.02]"
                      : "border-[#222634] bg-[#08090d]/60 hover:border-[#555c6d] opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        active ? "text-sky-400" : "text-[#555c6d]"
                      }`}
                    >
                      {cfg.num} &bull; {cfg.title}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? "bg-sky-400 animate-ping" : "bg-[#222634]"
                      }`}
                    />
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold text-[#ededf0]">
                    {cfg.label}
                  </h3>
                  <p className="mt-1 text-xs text-[#8e95a5] leading-relaxed">
                    {cfg.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
