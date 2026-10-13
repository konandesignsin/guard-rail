"use client";

import { useState, useEffect, useRef } from "react";

interface Risk {
  id: string;
  token: string;
  severity: "high" | "medium";
  label: string;
  note: string;
  fixedCode: string;
}

interface ScanLine {
  initialCode: string;
  fixedCode?: string;
  risk?: Risk;
}

const LINES: ScanLine[] = [
  { initialCode: 'import { createClient } from "@supabase/supabase-js";' },
  { initialCode: "" },
  { initialCode: "// Talks to database directly from the client bundle" },
  { initialCode: "export const supabase = createClient(" },
  { initialCode: "  process.env.NEXT_PUBLIC_SUPABASE_URL!," },
  {
    initialCode: '  "eyJhbGciOiJIUzI1NiIsInR5cCI...EXAMPLE_NOT_REAL_ROLE_KEY"',
    fixedCode: "  process.env.SUPABASE_SERVICE_ROLE_KEY!",
    risk: {
      id: "supabase-key",
      token: '"eyJhbGciOiJIUzI1NiIsInR5cCI...EXAMPLE_NOT_REAL_ROLE_KEY"',
      severity: "high",
      label: "Admin database key leaked to client",
      note: "Bypasses every database security rule. Anyone can read, alter, or drop customer tables.",
      fixedCode: "process.env.SUPABASE_SERVICE_ROLE_KEY!",
    },
  },
  { initialCode: ");" },
  { initialCode: "" },
  {
    initialCode: 'export const stripe = new Stripe("sk_live_EXAMPLE_NOT_REAL");',
    fixedCode: 'export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);',
    risk: {
      id: "stripe-key",
      token: '"sk_live_EXAMPLE_NOT_REAL"',
      severity: "high",
      label: "Live secret payment API key",
      note: "Allows unauthorized payment requests, customer data inspection, and unauthenticated refunds.",
      fixedCode: "process.env.STRIPE_SECRET_KEY!",
    },
  },
  { initialCode: "" },
  {
    initialCode: 'create policy "read_orders" on orders for all using (true);',
    fixedCode: 'create policy "read_orders" on orders for all using (auth.uid() = user_id);',
    risk: {
      id: "open-rls",
      token: "using (true)",
      severity: "medium",
      label: "Open security policy evaluates to true",
      note: "Allows any unauthenticated user on the internet to query every single customer record.",
      fixedCode: "using (auth.uid() = user_id)",
    },
  },
];

export function HeroScanPanel() {
  const [typedLineCount, setTypedLineCount] = useState(0);
  const [activeSquiggles, setActiveSquiggles] = useState<number[]>([]);
  const [findingCount, setFindingCount] = useState(0);
  const [showFixButton, setShowFixButton] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [hoveredRisk, setHoveredRisk] = useState<Risk | null>(null);

  // Mouse spotlight coordinates and 3D card tilt
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const risksInOrder = LINES.map((l, idx) => (l.risk ? { idx, risk: l.risk } : null)).filter(Boolean) as {
    idx: number;
    risk: Risk;
  }[];

  function resetAndPlay() {
    // Check prefers-reduced-motion
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setTypedLineCount(LINES.length);
      setActiveSquiggles([5, 8, 10]);
      setFindingCount(3);
      setShowFixButton(true);
      setIsFixed(false);
      return;
    }

    setTypedLineCount(0);
    setActiveSquiggles([]);
    setFindingCount(0);
    setShowFixButton(false);
    setIsFixed(false);

    // Step 1: Type in lines
    let curLine = 0;
    const typeInterval = setInterval(() => {
      curLine++;
      setTypedLineCount(curLine);
      if (curLine >= LINES.length) {
        clearInterval(typeInterval);

        // Step 2: Draw squiggles one by one
        setTimeout(() => {
          setActiveSquiggles([5]);
          setFindingCount(1);

          setTimeout(() => {
            setActiveSquiggles([5, 8]);
            setFindingCount(2);

            setTimeout(() => {
              setActiveSquiggles([5, 8, 10]);
              setFindingCount(3);

              // Step 4: After a pause, show fix button
              setTimeout(() => {
                setShowFixButton(true);

                // Auto-play fix after 4s unless clicked earlier
                if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
                autoPlayTimerRef.current = setTimeout(() => {
                  applyFixes();
                }, 4000);
              }, 600);
            }, 450);
          }, 450);
        }, 300);
      }
    }, 70);
  }

  function applyFixes() {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsFixed(true);
    setActiveSquiggles([]);
    setFindingCount(0);
    setShowFixButton(false);
  }

  useEffect(() => {
    resetAndPlay();
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, []);

  // Handle card tilt and spotlight on mouse move
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    setMousePos({ x: xPercent, y: yPercent });

    // Slight card tilt (max 4 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -3.5;
    const rotateY = ((x - centerX) / centerX) * 3.5;
    setTilt({ rx: rotateX, ry: rotateY });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0 });
    setHoveredRisk(null);
  }

  return (
    <div className="relative w-full select-none" style={{ perspective: "1000px" }}>
      {/* Soft red glow behind the card */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-3xl bg-[var(--squiggle-red)]/15 blur-2xl transition-opacity duration-700"
        style={{ opacity: isFixed ? 0.05 : 0.8 }}
        aria-hidden="true"
      />

      {/* Main Hero Card with 3D Tilt and Spotlight */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: "transform 0.15s ease-out",
        }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/60 will-change-transform"
      >
        {/* Cursor spotlight overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 280px at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.06), transparent 80%)`,
          }}
          aria-hidden="true"
        />

        {/* Faint noise/grid texture */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(var(--border) 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
          aria-hidden="true"
        />

        {/* Window Chrome Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
            </span>
            <span className="truncate font-mono text-[11px] text-[var(--muted)]">lib/supabase.ts</span>
            <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider text-[var(--muted-subtle)]">
              Example
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Counter ticking up */}
            {isFixed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cleared-green)]/30 bg-[var(--cleared-green-subtle)] px-2.5 py-0.5 text-[11px] font-mono font-medium text-[var(--cleared-green)] transition-all">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cleared-green)]" />
                0 findings
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] px-2.5 py-0.5 text-[11px] font-mono font-medium text-[var(--squiggle-red)] transition-all">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--squiggle-red)] animate-pulse" />
                {findingCount} {findingCount === 1 ? "finding" : "findings"}
              </span>
            )}

            {/* Replay Link */}
            {isFixed && (
              <button
                type="button"
                onClick={resetAndPlay}
                className="text-[11px] font-mono text-[var(--muted)] hover:text-[var(--fg)] underline cursor-pointer transition-colors"
              >
                Replay
              </button>
            )}
          </div>
        </div>

        {/* Code Lines Body */}
        <div className="relative z-10 px-4 py-4 min-h-[340px]">
          <div className="font-mono text-[11px] sm:text-[12.5px] leading-[1.85] overflow-x-auto">
            {LINES.slice(0, typedLineCount).map((line, idx) => {
              const hasRisk = activeSquiggles.includes(idx) && line.risk;
              const isFixedLine = isFixed && line.fixedCode;
              const displayCode = isFixedLine ? line.fixedCode! : line.initialCode;

              return (
                <div key={idx} className="flex items-baseline whitespace-pre relative group">
                  <span className="w-6 shrink-0 pr-2 text-right text-[10px] text-[var(--muted-subtle)] select-none">
                    {idx + 1}
                  </span>

                  {/* Render risky line with squiggle and chip */}
                  {hasRisk && line.risk ? (
                    <div
                      onMouseEnter={() => setHoveredRisk(line.risk!)}
                      onMouseLeave={() => setHoveredRisk(null)}
                      className="relative inline-block cursor-help rounded px-0.5"
                    >
                      <span className="text-[var(--fg)] font-medium">{displayCode}</span>

                      {/* Small severity chip */}
                      <span
                        className={`ml-2 inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider ${
                          line.risk.severity === "high"
                            ? "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border border-[var(--squiggle-red)]/30"
                            : "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border border-[var(--squiggle-amber)]/30"
                        }`}
                      >
                        {line.risk.severity}
                      </span>

                      {/* SVG Squiggle drawing under the risky text */}
                      <span className="pointer-events-none absolute inset-x-0 -bottom-[3px] h-1.5" aria-hidden="true">
                        <svg
                          viewBox="0 0 100 6"
                          preserveAspectRatio="none"
                          fill="none"
                          className="h-full w-full overflow-visible"
                        >
                          <path
                            d="M 0 3 Q 5 0, 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3 T 70 3 T 80 3 T 90 3 T 100 3"
                            stroke={
                              line.risk.severity === "high"
                                ? "var(--squiggle-red)"
                                : "var(--squiggle-amber)"
                            }
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            className="hero-squiggle-draw"
                          />
                        </svg>
                      </span>

                      {/* Hover Tooltip with plain-English reason */}
                      {hoveredRisk?.id === line.risk.id && (
                        <div
                          role="tooltip"
                          className="absolute left-8 bottom-full mb-2 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--fg)] shadow-xl z-50 pointer-events-none transition-all leading-relaxed"
                        >
                          <p className="font-semibold font-sans text-[var(--fg)]">{line.risk.label}</p>
                          <p className="text-[var(--muted)] font-sans text-[11px] mt-1">{line.risk.note}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`px-0.5 transition-colors duration-300 ${
                        isFixedLine
                          ? "text-[var(--cleared-green)] font-semibold"
                          : displayCode.startsWith("//")
                          ? "text-[var(--muted-subtle)] italic"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {displayCode || "\u00A0"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Bar: Fix Button or Clean Status */}
        <div className="relative z-10 flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3">
          <div className="text-xs">
            {isFixed ? (
              <span className="flex items-center gap-1.5 font-sans font-medium text-[var(--cleared-green)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Fixed & secured. Keys stored in process.env.
              </span>
            ) : (
              <span className="font-sans text-[11px] text-[var(--muted)]">
                Hover any squiggle to read why it matters.
              </span>
            )}
          </div>

          <div>
            {showFixButton && !isFixed && (
              <button
                type="button"
                onClick={applyFixes}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fg)] hover:opacity-90 text-[var(--bg)] px-3.5 py-1 text-xs font-semibold shadow-sm cursor-pointer transition-all animate-bounce"
              >
                <span>Fix automatically</span>
                <span className="text-[10px]">&rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
