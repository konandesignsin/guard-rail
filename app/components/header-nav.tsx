"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/app/components/logo";

interface HeaderNavProps {
  authSlot?: React.ReactNode;
}

const NAV_LINKS = [
  { href: "#mission", label: "Product" },
  { href: "#action", label: "GitHub Action" },
  { href: "#pricing", label: "Pricing" },
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
      setScrolled(window.scrollY > 20);
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
      {/* Precision reading progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent" aria-hidden="true">
        <div
          ref={progressRef}
          className="h-full origin-left bg-[#e5484d] transition-transform duration-75"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-[#222634]/80 bg-[#08090d]/80 backdrop-blur-md py-3"
            : "border-b border-transparent bg-transparent py-5"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6">
          <Logo size="md" showWordmark />

          <nav aria-label="Main" className="flex items-center gap-6">
            <ul className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group relative inline-block py-1 text-xs font-medium text-[#8e95a5] transition-colors hover:text-[#ededf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-sm"
                  >
                    <span>{link.label}</span>
                    <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-[#e5484d] transition-all duration-200 group-hover:w-full" />
                  </a>
                </li>
              ))}
            </ul>

            {authSlot ?? (
              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="px-2 py-1 text-xs font-medium text-[#8e95a5] transition-colors hover:text-[#ededf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
                >
                  Log in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[#ededf0] px-4 py-1.5 text-xs font-semibold text-[#08090d] shadow-sm transition-all hover:bg-white hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Scan my repo
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
