"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export function getScoreRating(score: number): {
  label: "Excellent" | "Good" | "Needs work" | "Critical";
  colorVar: string;
  badgeClass: string;
} {
  if (score >= 90) {
    return {
      label: "Excellent",
      colorVar: "var(--cleared-green)",
      badgeClass: "bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border-[var(--cleared-green)]/30",
    };
  }
  if (score >= 75) {
    return {
      label: "Good",
      colorVar: "var(--cleared-green)",
      badgeClass: "bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)] border-[var(--cleared-green)]/30",
    };
  }
  if (score >= 50) {
    return {
      label: "Needs work",
      colorVar: "var(--squiggle-amber)",
      badgeClass: "bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)] border-[var(--squiggle-amber)]/30",
    };
  }
  return {
    label: "Critical",
    colorVar: "var(--squiggle-red)",
    badgeClass: "bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)] border-[var(--squiggle-red)]/30",
  };
}

export function ScoreRing({
  score,
  size = 72,
  strokeWidth = 6,
  showLabel = true,
}: ScoreRingProps) {
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplayedScore(score);
      return;
    }

    let start = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.round(start + (score - start) * ease);
      setDisplayedScore(currentVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    const animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  const rating = getScoreRating(displayedScore);
  const strokeColor = rating.colorVar;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={displayedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Security score: ${displayedScore} out of 100, rated ${rating.label}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-150 ease-out"
        />
      </svg>

      {showLabel && (
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span
            className="font-mono font-bold tracking-tight text-[var(--fg)] leading-none"
            style={{ fontSize: size * 0.32 }}
          >
            {displayedScore}
          </span>
          <span
            className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-mono mt-0.5"
            style={{ fontSize: Math.max(8, size * 0.11) }}
          >
            /100
          </span>
        </div>
      )}
    </div>
  );
}
