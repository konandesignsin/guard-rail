"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
}: ScoreRingProps) {
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplayedScore(score);
      return;
    }

    let start = 0;
    const duration = 900; // ms
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
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

  const isPerfect = displayedScore === 100;
  const strokeColor =
    displayedScore >= 90
      ? "var(--cleared-green)"
      : displayedScore >= 70
      ? "var(--squiggle-amber)"
      : "var(--squiggle-red)";

  return (
    <div
      className={`relative inline-flex items-center justify-center transition-all duration-700 ${
        isPerfect ? "filter drop-shadow-[0_0_12px_rgba(61,214,140,0.45)]" : ""
      }`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={displayedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Audit safety score: ${displayedScore} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Score Progress */}
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
            className="font-mono font-bold tracking-tight text-[var(--fg)]"
            style={{ fontSize: size * 0.28 }}
          >
            {displayedScore}
          </span>
          <span
            className="font-mono uppercase tracking-widest text-[var(--muted-subtle)]"
            style={{ fontSize: Math.max(9, size * 0.08) }}
          >
            score
          </span>
        </div>
      )}
    </div>
  );
}
