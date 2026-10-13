"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Steps: 0 to 0.33 (SCAN), 0.33 to 0.66 (FIND), 0.66 to 1.0 (FIX)
  const step = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], [1, 1, 2, 3]);

  // Transform opacity and display states for each stage
  const scanSweepTop = useTransform(scrollYProgress, [0, 0.33], ["0%", "100%"]);
  const scanSweepOpacity = useTransform(scrollYProgress, [0, 0.28, 0.33], [1, 1, 0]);

  // Stage 1 (Raw/Scan) opacity
  const rawOpacity = useTransform(scrollYProgress, [0, 0.28, 0.66], [1, 1, 0]);

  // Stage 2 (Find/Squiggle) opacity
  const findOpacity = useTransform(scrollYProgress, [0.28, 0.35, 0.62, 0.7], [0, 1, 1, 0]);

  // Stage 3 (Fixed/Clean) opacity
  const fixOpacity = useTransform(scrollYProgress, [0.65, 0.75, 1], [0, 1, 1]);

  return (
    <section ref={containerRef} className="relative h-[280vh] bg-[var(--bg)]">
      {/* Sticky viewport frame */}
      <div className="sticky top-0 h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left step progress indicator */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--squiggle-red)]">
                The Proofread Story
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--fg)] mt-2">
                Watch code fix itself step-by-step
              </h2>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                As you scroll, the proofreader inspects the raw file, surfaces dangerous exposures, and patches them in-place.
              </p>
            </div>

            {/* Stepper with progress bars */}
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              {/* Step 1: SCAN */}
              <div className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <motion.div
                    className="h-3 w-3 rounded-full border border-[var(--border)]"
                    style={{
                      backgroundColor: useTransform(scrollYProgress, [0, 0.33], ["var(--fg)", "var(--surface-hover)"]),
                    }}
                  />
                  <div className="w-[1px] h-10 bg-[var(--border)] my-1" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase text-[var(--fg)]">1. Scan</h4>
                  <p className="text-xs text-[var(--muted)]">Light beam traverses lines without execution.</p>
                </div>
              </div>

              {/* Step 2: FIND */}
              <div className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <motion.div
                    className="h-3 w-3 rounded-full border border-[var(--border)]"
                    style={{
                      backgroundColor: useTransform(
                        scrollYProgress,
                        [0.33, 0.45, 0.66],
                        ["var(--surface-hover)", "var(--squiggle-red)", "var(--surface-hover)"]
                      ),
                    }}
                  />
                  <div className="w-[1px] h-10 bg-[var(--border)] my-1" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase text-[var(--squiggle-red)]">2. Find</h4>
                  <p className="text-xs text-[var(--muted)]">Squiggles and severity markers identify exposures.</p>
                </div>
              </div>

              {/* Step 3: FIX */}
              <div className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <motion.div
                    className="h-3 w-3 rounded-full border border-[var(--border)]"
                    style={{
                      backgroundColor: useTransform(
                        scrollYProgress,
                        [0.66, 0.85],
                        ["var(--surface-hover)", "var(--cleared-green)"]
                      ),
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase text-[var(--cleared-green)]">3. Fix</h4>
                  <p className="text-xs text-[var(--muted)]">Tokens rewrite directly into process.env references.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right transforming code block */}
          <div className="lg:col-span-8 relative">
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-5 sm:p-7 font-mono text-xs sm:text-[13px] leading-relaxed">
              {/* Window chrome header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4 text-[11px] text-[var(--muted)]">
                <div className="flex items-center gap-2">
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
                  </span>
                  <span>src/lib/database.ts</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)]">
                  <motion.span style={{ opacity: rawOpacity }}>1. SCANNING</motion.span>
                  <motion.span style={{ opacity: findOpacity }} className="text-[var(--squiggle-red)]">2. FINDINGS DETECTED</motion.span>
                  <motion.span style={{ opacity: fixOpacity }} className="text-[var(--cleared-green)]">3. SECURED</motion.span>
                </span>
              </div>

              {/* Code lines container */}
              <div className="space-y-1 relative min-h-[220px]">
                <div className="text-[var(--muted-subtle)]">// Client-side database initialization</div>
                <div>import &#123; createClient &#125; from &quot;@supabase/supabase-js&quot;;</div>
                <div className="text-[var(--muted)]">export const db = createClient(</div>
                <div className="pl-4 text-[var(--muted)]">process.env.NEXT_PUBLIC_URL!,</div>

                {/* The Transforming Line */}
                <div className="pl-4 relative py-1">
                  {/* Step 1: Raw line during scan */}
                  <motion.div style={{ opacity: rawOpacity }} className="absolute inset-0 pl-4 whitespace-nowrap">
                    &quot;eyJhbGciOiJI...EXAMPLE_NOT_REAL_KEY&quot;
                  </motion.div>

                  {/* Step 2: Finding with squiggle and explanation */}
                  <motion.div style={{ opacity: findOpacity }} className="absolute inset-0 pl-4 whitespace-nowrap pointer-events-none">
                    <span className="relative text-[var(--fg)] font-semibold">
                      &quot;eyJhbGciOiJI...EXAMPLE_NOT_REAL_KEY&quot;
                      <svg
                        className="absolute inset-x-0 -bottom-1 h-1.5 w-full overflow-visible"
                        viewBox="0 0 100 6"
                        fill="none"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M 0 3 Q 5 0, 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3 T 70 3 T 80 3 T 90 3 T 100 3"
                          stroke="var(--squiggle-red)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="ml-3 text-[10px] font-bold text-[var(--squiggle-red)] bg-[var(--squiggle-red-subtle)] px-2 py-0.5 rounded border border-[var(--squiggle-red)]/30">
                      HIGH: Leaked secret key
                    </span>
                  </motion.div>

                  {/* Step 3: Fixed secure version */}
                  <motion.div style={{ opacity: fixOpacity }} className="text-[var(--cleared-green)] font-semibold whitespace-nowrap">
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                    <span className="ml-3 text-[10px] text-[var(--cleared-green)] font-normal">
                      &bull; protected on server
                    </span>
                  </motion.div>
                </div>

                <div className="text-[var(--muted)]">);</div>
                <div className="pt-2 text-[var(--muted-subtle)]">// End of configuration</div>

                {/* Scan line sweeping across */}
                <motion.div
                  className="absolute left-0 right-0 h-[2px] bg-[var(--squiggle-red)] shadow-[0_0_15px_var(--squiggle-red)] pointer-events-none"
                  style={{
                    top: scanSweepTop,
                    opacity: scanSweepOpacity,
                  }}
                />
              </div>

              {/* Explanatory context footer */}
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--muted)] flex items-center justify-between">
                <span>Rule: secrets/service-role-leak</span>
                <span className="font-mono text-[11px]">Line 5:14</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
