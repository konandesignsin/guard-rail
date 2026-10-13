"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/app/components/logo";

interface HeaderNavProps {
  authSlot?: React.ReactNode;
}

const LINKS = [
  { href: "#try-it", label: "Try it" },
  { href: "#checks", label: "What we check" },
  { href: "#before-after", label: "Before / after" },
  { href: "#faq", label: "FAQ" },
];

export function HeaderNav({ authSlot }: HeaderNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      setScrolled(window.scrollY > 24);
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent" aria-hidden="true">
        <div
          ref={progressRef}
          className="h-full origin-left bg-[var(--squiggle-red)]"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      <header
        className={`sticky top-0 z-40 border-b transition-colors ${
          scrolled
            ? "border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[var(--nav-h)] max-w-6xl items-center justify-between gap-4 px-6">
          <Logo size="md" showWordmark />

          <nav aria-label="Main" className="flex items-center gap-6">
            <ul className="hidden items-center gap-6 md:flex">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            {authSlot ?? (
              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="px-2 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[var(--fg)] px-4 py-1.5 text-xs font-medium text-[var(--bg)] shadow-sm transition-colors hover:bg-white"
                >
                  Get started
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
