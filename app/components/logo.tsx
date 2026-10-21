import Image from "next/image";
import Link from "next/link";

export type LogoVariant = "mark" | "full";
export type LogoTone = "light" | "dark";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

export interface LogoProps {
  /**
   * "mark": symbol only
   * "full": symbol plus "GuardRail" text with red wavy underline
   * @default "full"
   */
  variant?: LogoVariant;
  /**
   * "light": uses white-G file (guardrail-logo-light.svg) for dark backgrounds
   * "dark": uses black-G file (guardrail-logo.svg) for light backgrounds
   * default follows the site's dark theme ("light")
   * @default "light"
   */
  tone?: LogoTone;
  /**
   * Predefined sizes or custom height in px
   * @default "md"
   */
  size?: LogoSize;
  /**
   * Additional CSS classes on the container
   */
  className?: string;
  /**
   * Set to true to prioritize image loading (e.g. in navigation)
   */
  priority?: boolean;
  /**
   * Optional custom href, or null to disable link wrapping
   */
  href?: string | null;
  /**
   * Legacy prop compatibility with existing usages
   */
  showWordmark?: boolean;
}

// Aspect ratio is 540 / 530 ≈ 1.018868
const ASPECT_RATIO = 540 / 530;

function resolveDimensions(size: LogoSize): { height: number; width: number; fontSize: string } {
  if (typeof size === "number") {
    const height = Math.round(size);
    const width = Math.round(height * ASPECT_RATIO);
    return {
      height,
      width,
      fontSize: height < 24 ? "text-xs" : height < 32 ? "text-sm" : height < 40 ? "text-base" : "text-xl",
    };
  }

  switch (size) {
    case "xs":
      return { height: 20, width: 20, fontSize: "text-xs" };
    case "sm":
      return { height: 24, width: 24, fontSize: "text-sm" };
    case "lg":
      return { height: 36, width: 37, fontSize: "text-lg sm:text-xl" };
    case "xl":
      return { height: 44, width: 45, fontSize: "text-xl sm:text-2xl" };
    case "md":
    default:
      return { height: 28, width: 29, fontSize: "text-base" };
  }
}

export function Logo({
  variant,
  showWordmark,
  tone = "light",
  size = "md",
  className = "",
  priority = false,
  href = "/",
}: LogoProps) {
  // Support variant prop, defaulting to "full" unless showWordmark is explicitly passed as false or variant is "mark"
  const resolvedVariant: LogoVariant =
    variant ?? (showWordmark === false ? "mark" : "full");

  const { height, width, fontSize } = resolveDimensions(size);

  const src =
    tone === "dark"
      ? "/guardrail-logo.svg"
      : "/guardrail-logo-light.svg";

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{ minHeight: height }}
    >
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width, height }}
      >
        <Image
          src={src}
          alt="GuardRail"
          width={width}
          height={height}
          priority={priority}
          className="w-full h-full object-contain"
          style={{ aspectRatio: "540 / 530" }}
        />
      </div>

      {resolvedVariant === "full" && (
        <span className="relative inline-flex flex-col">
          <span
            className={`font-display font-medium tracking-tight ${
              tone === "dark" ? "text-zinc-950" : "text-[var(--fg)]"
            } select-none ${fontSize} leading-tight`}
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
              stroke="var(--squiggle-red, #e5484d)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md transition-opacity hover:opacity-90"
        aria-label="GuardRail"
      >
        {content}
      </Link>
    );
  }

  return content;
}
