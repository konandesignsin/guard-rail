/**
 * Score ring drawn with inline SVG only.
 *
 * The circle uses `pathLength={100}` so dash offsets are plain 0-100 numbers.
 * Colours follow the palette rule: green is reserved for a passing score.
 */
interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function ringColor(score: number): string {
  if (score >= 90) return "var(--cleared-green)";
  if (score >= 70) return "var(--squiggle-amber)";
  return "var(--squiggle-red)";
}

export function ScoreRing({ score, size = 72, strokeWidth = 6, className = "" }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = ringColor(clamped);
  const radius = 50 - strokeWidth / 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={`Score ${clamped} out of 100`}
        className="-rotate-90"
      >
        <circle className="ring-track" cx="50" cy="50" r={radius} fill="none" strokeWidth={strokeWidth} />
        <circle
          className="ring-value"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - clamped}
          style={{ "--ring-offset": 100 - clamped } as React.CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg leading-none font-medium text-[var(--fg)] tabular-nums">
          {clamped}
        </span>
        <span className="mt-0.5 font-mono text-[9px] tracking-wide text-[var(--muted)]">/100</span>
      </span>
    </div>
  );
}

export { ringColor };
