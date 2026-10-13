"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Runs before paint on the client (so we can hide content without a flash) and
 * falls back to useEffect during SSR, where layout effects are not allowed.
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealState = "init" | "hidden" | "shown";

/**
 * Reveals an element once when it scrolls into view.
 *
 * - The base (server-rendered) state is always visible, so no-JS visitors and
 *   crawlers see the finished layout.
 * - Elements already on screen at mount show immediately without animating.
 * - `prefers-reduced-motion: reduce` skips the animation entirely.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>("init");

  useIsoLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      setState("shown");
      return;
    }

    // Already in view on first paint: show it, don't animate it.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) {
      setState("shown");
      return;
    }

    setState("hidden");

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, state };
}

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger, in milliseconds. */
  delay?: number;
}

export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const { ref, state } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-reveal={state}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={`reveal ${className}`}
    >
      {children}
    </div>
  );
}

export function RevealItem({ children, className = "", delay = 0 }: RevealProps) {
  const { ref, state } = useReveal<HTMLLIElement>();

  return (
    <li
      ref={ref}
      data-reveal={state}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={`reveal ${className}`}
    >
      {children}
    </li>
  );
}
