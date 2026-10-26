"use client";

import { useEffect, useRef, useState } from "react";

export interface ScoreRating {
  label: "Excellent" | "Good" | "Needs work" | "Critical";
  colorVar: string;
  badgeClass: string;
}

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

/** Existing scoring buckets, unchanged: 90 / 75 / 50 thresholds. */
export function getScoreRating(score: number): ScoreRating {
  if (score >= 90) {
    return {
      label: "Excellent",
      colorVar: "var(--cleared-green)",
      badgeClass:
        "bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border-[var(--cleared-green)]/30",
    };
  }
  if (score >= 75) {
    return {
      label: "Good",
      colorVar: "var(--cleared-green)",
      badgeClass:
        "bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border-[var(--cleared-green)]/30",
    };
  }
  if (score >= 50) {
    return {
      label: "Needs work",
      colorVar: "var(--squiggle-amber)",
      badgeClass:
        "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30",
    };
  }
  return {
    label: "Critical",
    colorVar: "var(--squiggle-red)",
    badgeClass:
      "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30",
  };
}

/**
 * Score ring drawn as two plain SVG circles — no chart library. The number
 * counts up once on mount and stays put when the reader prefers less motion.
 */
export function ScoreRing({
  score,
  size = 88,
  strokeWidth = 6,
  showLabel = true,
  className = "",
}: ScoreRingProps) {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const [displayed, setDisplayed] = useState(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The first render already shows the real score, which is the whole
    // experience when motion is reduced — nothing to animate in that case.
    if (reduce) return;

    const from = 0;
    const duration = 700;
    const started = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;
  const rating = getScoreRating(target);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={target}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score ${target} out of 100, rated ${rating.label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={rating.colorVar}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-sans font-semibold leading-none tabular-nums text-[var(--fg)]"
            style={{ fontSize: Math.round(size * 0.3) }}
          >
            {displayed}
          </span>
          <span
            className="mt-1 font-mono uppercase leading-none tracking-[0.14em] text-[var(--muted)]"
            style={{ fontSize: Math.max(8, Math.round(size * 0.095)) }}
          >
            /100
          </span>
        </div>
      )}
    </div>
  );
}
