import React from "react";

interface SquiggleProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function SquiggleDivider({
  className = "",
  width = 120,
  height = 8,
}: SquiggleProps) {
  return (
    <div className={`flex items-center justify-center my-6 select-none ${className}`} aria-hidden="true">
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 8"
        fill="none"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <path
          d="M 0 4 Q 7.5 0, 15 4 T 30 4 T 45 4 T 60 4 T 75 4 T 90 4 T 105 4 T 120 4"
          stroke="var(--squiggle-red)"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="opacity-75"
        />
      </svg>
    </div>
  );
}

export function SquiggleUnderline({
  className = "",
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      className={`overflow-visible pointer-events-none select-none ${className}`}
      viewBox="0 0 100 6"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M 0 3 Q 6.25 0, 12.5 3 T 25 3 T 37.5 3 T 50 3 T 62.5 3 T 75 3 T 87.5 3 T 100 3"
        stroke="var(--squiggle-red)"
        strokeWidth="2.2"
        strokeLinecap="round"
        className={animate ? "hero-squiggle-draw" : ""}
      />
    </svg>
  );
}
