import Link from "next/link";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showWordmark = true, size = "md" }: LogoProps) {
  const markDimensions = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  }[size];

  const textSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  }[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md transition-opacity hover:opacity-90 ${className}`}
      aria-label="GuardRail home"
    >
      {/* Precision SVG Logo Mark directly matching provided artwork */}
      <span
        className={`relative inline-flex items-center justify-center shrink-0 ${markDimensions}`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Black geometric circular G shape */}
          <path
            d="M 68 38 A 36 36 0 1 0 68 73 L 68 53"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            className="text-[var(--fg)]"
          />
          {/* Red squiggly underline passing through the crossbar of G */}
          <path
            d="M 42 53 Q 48 44, 54 53 T 66 53 T 74 51"
            stroke="var(--squiggle-red)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Vertical stem drop in accent red */}
          <path
            d="M 69 53 L 69 73"
            stroke="var(--squiggle-red)"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {showWordmark && (
        <span className="relative inline-flex flex-col">
          <span
            className={`font-display font-medium tracking-tight text-[var(--fg)] select-none ${textSize}`}
          >
            GuardRail
          </span>
          <svg
            className="w-full h-1 overflow-visible -mt-0.5"
            viewBox="0 0 70 4"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M 1 2 Q 5 0.5, 9 2 T 17 2 T 25 2 T 33 2 T 41 2 T 49 2 T 57 2 T 65 2 T 69 2"
              stroke="var(--squiggle-red)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </Link>
  );
}
