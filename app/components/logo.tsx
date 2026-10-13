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
    lg: "w-8 h-8",
  }[size];

  const textSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md transition-opacity hover:opacity-90 ${className}`}
      aria-label="guardrail home"
    >
      {/* g logo mark with red squiggly underline */}
      <span
        className={`relative inline-flex flex-col items-center justify-center shrink-0 rounded-lg bg-[var(--surface)] border border-[var(--border)] ${markDimensions}`}
      >
        <span className="font-sans font-semibold text-[var(--fg)] leading-none select-none text-[15px]">
          g
        </span>
        <svg
          className="w-3.5 h-1 overflow-visible mt-0.5"
          viewBox="0 0 16 4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 2 Q 3.5 0.5, 6 2 T 11 2 T 15 2"
            stroke="var(--squiggle-red)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {showWordmark && (
        <span
          className={`font-display font-medium tracking-tight text-[var(--fg)] select-none ${textSize}`}
        >
          guardrail
        </span>
      )}
    </Link>
  );
}
