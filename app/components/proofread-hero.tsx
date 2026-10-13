"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Magnetic } from "@/app/components/magnetic";

interface CodeWallLine {
  text: string;
  isRisky?: boolean;
  fixedText?: string;
  severity?: "high" | "medium";
  label?: string;
  reason?: string;
  fix?: string;
}

const WALL_CODE: CodeWallLine[] = [
  { text: '// app/api/auth/route.ts — client-accessible handler' },
  { text: 'import { createClient } from "@supabase/supabase-js";' },
  { text: 'import Stripe from "stripe";' },
  { text: '' },
  {
    text: 'const adminClient = createClient(URL, "eyJhbGciOi...EXAMPLE_NOT_REAL_KEY");',
    fixedText: 'const adminClient = createClient(URL, process.env.SUPABASE_SECRET_KEY!);',
    isRisky: true,
    severity: 'high',
    label: 'Exposed master database secret',
    reason: 'Admin key bypasses all Row-Level Security checks and exposes all records.',
    fix: 'Store strictly in process.env and invoke exclusively from a backend route.',
  },
  { text: 'export const stripe = new Stripe("sk_live_EXAMPLE_NOT_REAL_STRIPE");',
    fixedText: 'export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);',
    isRisky: true,
    severity: 'high',
    label: 'Hardcoded live payment key',
    reason: 'Anyone inspecting bundled assets can issue refunds and access payment logs.',
    fix: 'Use server-only environment variables.',
  },
  { text: '' },
  { text: '// Database access control definition' },
  { text: 'create policy "read_orders" on orders for all using (true);',
    fixedText: 'create policy "read_orders" on orders for all using (auth.uid() = user_id);',
    isRisky: true,
    severity: 'medium',
    label: 'Overly permissive database policy',
    reason: 'Evaluates to true for all queries, granting unauthenticated access to order records.',
    fix: 'Enforce ownership verification: using (auth.uid() = user_id).',
  },
  { text: '' },
  { text: 'export async function GET() { return Response.json({ ok: true }); }' },
  { text: 'export const runtime = "edge";' },
];

export function ProofreadHero({ authButtons }: { authButtons?: React.ReactNode }) {
  // Cursor lens state
  const [lensPos, setLensPos] = useState({ x: -200, y: -200 });
  const [isInside, setIsInside] = useState(false);

  // Scan and fix states
  const [scanProgress, setScanProgress] = useState(0);
  const [findingCount, setFindingCount] = useState(0);
  const [isFixed, setIsFixed] = useState(false);
  const [hoveredFinding, setHoveredFinding] = useState<CodeWallLine | null>(null);

  // Headline typewriter and autocorrect morph states
  const [headlineStage, setHeadlineStage] = useState<"typing" | "typed" | "corrected">("typing");
  const [typedChars, setTypedChars] = useState(0);
  const headlineFull = "Find the leaked key before your users do.";

  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setTypedChars(headlineFull.length);
      setHeadlineStage("corrected");
      setScanProgress(100);
      setFindingCount(3);
      return;
    }

    // Headline typing
    let idx = 0;
    const typeTimer = setInterval(() => {
      idx++;
      setTypedChars(idx);
      if (idx >= headlineFull.length) {
        clearInterval(typeTimer);
        setHeadlineStage("typed");

        // Autocorrect morph after brief pause
        setTimeout(() => {
          setHeadlineStage("corrected");
        }, 1200);
      }
    }, 32);

    // Scan line sweep down
    let scanVal = 0;
    const scanTimer = setInterval(() => {
      scanVal += 2;
      setScanProgress(scanVal);
      if (scanVal === 30) setFindingCount(1);
      if (scanVal === 50) setFindingCount(2);
      if (scanVal === 75) setFindingCount(3);
      if (scanVal >= 100) {
        clearInterval(scanTimer);
      }
    }, 35);

    return () => {
      clearInterval(typeTimer);
      clearInterval(scanTimer);
    };
  }, []);

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLensPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsInside(true);
  }

  function handleFixAll() {
    setIsFixed(true);
    setFindingCount(0);
  }

  function handleReplay() {
    setIsFixed(false);
    setFindingCount(3);
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsInside(true)}
      onMouseLeave={() => {
        setIsInside(false);
        setHoveredFinding(null);
      }}
      className="relative h-[100svh] w-full overflow-hidden flex flex-col justify-between pt-16 pb-8 bg-[var(--bg)] text-[var(--fg)] select-none"
    >
      {/* 1. DIM, SLOWLY DRIFTING CODE WALL BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-35 pointer-events-none">
        <div className="absolute inset-0 font-mono text-[11px] sm:text-[13px] leading-[1.8] text-[var(--muted-subtle)] p-6 sm:p-12 animate-pulse [animation-duration:12s]">
          {WALL_CODE.map((line, i) => {
            const hasPassed = (i / WALL_CODE.length) * 100 <= scanProgress;
            const isRisky = line.isRisky && hasPassed && !isFixed;
            const textToRender = isFixed && line.fixedText ? line.fixedText : line.text;

            return (
              <div key={i} className="flex items-center whitespace-pre relative">
                <span className="w-8 select-none text-[var(--border)] pr-3 text-right">
                  {i + 1}
                </span>
                <span
                  className={
                    isRisky
                      ? "text-[var(--fg)] font-medium"
                      : isFixed && line.fixedText
                      ? "text-[var(--cleared-green)] font-medium"
                      : "text-[var(--muted-subtle)]"
                  }
                >
                  {textToRender || " "}
                </span>

                {/* Squiggle and severity chip as scan passes */}
                {isRisky && (
                  <span className="inline-flex items-center gap-1.5 ml-3 pointer-events-auto">
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                        line.severity === "high"
                          ? "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30"
                          : "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30"
                      }`}
                    >
                      {line.severity}
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scan sweep line */}
        <div
          className="absolute left-0 right-0 h-[2px] bg-[var(--squiggle-red)] shadow-[0_0_24px_4px_var(--squiggle-red)] transition-all duration-75"
          style={{ top: `${scanProgress}%` }}
        />
      </div>

      {/* 2. CURSOR LENS (Soft circle follows mouse, brightens code underneath) */}
      <div
        className="pointer-events-none absolute rounded-full transition-opacity duration-300 hidden sm:block z-10"
        style={{
          width: "320px",
          height: "320px",
          left: `${lensPos.x - 160}px`,
          top: `${lensPos.y - 160}px`,
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(229,72,77,0.04) 45%, transparent 70%)",
          opacity: isInside ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* 3. FLOATING RESULT CHIP IN TOP-RIGHT CORNER */}
      <div className="absolute top-20 right-6 sm:right-10 z-30">
        <div className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-3.5 py-1.5 shadow-xl font-mono text-xs">
          {isFixed ? (
            <div className="flex items-center gap-2 text-[var(--cleared-green)]">
              <span className="h-2 w-2 rounded-full bg-[var(--cleared-green)]" />
              <span>0 findings &bull; secured</span>
              <button
                type="button"
                onClick={handleReplay}
                className="ml-2 text-[10px] text-[var(--muted)] hover:text-[var(--fg)] underline cursor-pointer"
              >
                Replay
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[var(--squiggle-red)] animate-pulse" />
              <span className="text-[var(--fg)] font-medium">
                {findingCount} {findingCount === 1 ? "finding" : "findings"}
              </span>
              <button
                type="button"
                onClick={handleFixAll}
                className="ml-1 cursor-pointer rounded-full bg-[var(--fg)] hover:opacity-90 text-[var(--bg)] px-2.5 py-0.5 text-[10px] font-semibold transition-all shadow-xs"
              >
                Fix automatically &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. MAIN HERO CONTENT (Max 3 lines, Max 5rem, Both buttons visible) */}
      <div className="relative z-20 mx-auto max-w-4xl px-6 my-auto text-center flex flex-col items-center">
        {/* Proofreader brand badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3.5 py-1 text-xs text-[var(--muted)] mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--squiggle-red)]" aria-hidden="true" />
          <span>The code proofreader for human + AI projects</span>
        </div>

        {/* Typed-in headline with morphing autocorrect */}
        <h1
          className="font-display font-semibold text-[var(--fg)] leading-[1.06] text-balance max-w-3xl"
          style={{
            fontSize: "clamp(2.75rem, 5.5vw, 5rem)",
            letterSpacing: "-0.03em",
          }}
        >
          <span>Find the </span>
          <span className="relative inline-block text-[var(--fg)]">
            {headlineStage === "corrected" ? (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[var(--cleared-green)] font-semibold"
              >
                secured key
              </motion.span>
            ) : (
              <span>leaked key</span>
            )}

            {/* Signature red squiggle under leaked key */}
            <svg
              className="absolute inset-x-0 -bottom-[0.06em] h-[0.14em] w-full overflow-visible pointer-events-none"
              viewBox="0 0 100 4"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M 0 2 Q 10 0, 20 2 T 40 2 T 60 2 T 80 2 T 100 2"
                stroke={headlineStage === "corrected" ? "var(--cleared-green)" : "var(--squiggle-red)"}
                strokeWidth="3.2"
                strokeLinecap="round"
                className="hero-squiggle-draw"
              />
            </svg>
          </span>
          <span> before your users do.</span>
        </h1>

        <p className="mt-5 text-[18px] sm:text-[20px] text-[var(--muted)] leading-relaxed max-w-[48ch]">
          Reads your code and points at the exact line — in plain English, with the fix ready to apply.
        </p>

        {/* Buttons with magnetic hover, both visible without scrolling */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Magnetic strength={0.25}>
            {authButtons ?? (
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--bg)] shadow-xl transition-all hover:bg-neutral-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none"
              >
                Scan my app &rarr;
              </Link>
            )}
          </Magnetic>

          <Magnetic strength={0.25}>
            <Link
              href="#demo"
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-subtle)]/70 px-8 py-3.5 text-sm font-medium text-[var(--fg)] backdrop-blur-sm transition-all hover:border-[var(--muted)] hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:outline-none"
            >
              Test live snippet
            </Link>
          </Magnetic>
        </div>

        {/* Quick footnote */}
        <p className="mt-4 font-mono text-[13px] text-[var(--muted-subtle)]">
          Free for public repositories &bull; no upload needed for in-browser check
        </p>
      </div>

      {/* 5. INTERACTIVE TOOLTIP ON HOVER (plain-English reason and fix) */}
      <AnimatePresence>
        {hoveredFinding && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 max-w-md w-[90%] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-xs text-[var(--fg)]">{hoveredFinding.label}</span>
              <span className="font-mono text-[10px] text-[var(--squiggle-red)] uppercase font-bold">
                {hoveredFinding.severity}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-2">{hoveredFinding.reason}</p>
            <div className="font-mono text-[11px] text-[var(--cleared-green)] bg-[var(--bg)] p-2 rounded border border-[var(--border-subtle)]">
              <span className="font-bold">Fix: </span>
              {hoveredFinding.fix}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom scroll cue */}
      <div className="relative z-20 mx-auto flex items-center gap-2 text-xs font-mono text-[var(--muted-subtle)]">
        <span>scroll down to explore proofread story</span>
        <span className="animate-bounce">&darr;</span>
      </div>
    </section>
  );
}
