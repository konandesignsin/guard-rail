import Link from "next/link";
import { OWNER_NAME, CONTACT_EMAIL } from "@/lib/legal";
import { GITHUB_REPO_URL } from "@/lib/github";
import { SquiggleUnderline } from "@/app/components/squiggle";
import { Logo } from "@/app/components/logo";

export function SiteFooter() {
  return (
    <footer className="relative bg-[#040508] border-t border-[#222634] text-[#ededf0] overflow-hidden pt-20 pb-12">
      {/* Huge faint wordmark background watermark */}
      <div
        className="pointer-events-none select-none absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-[0.03] flex flex-col items-center"
        aria-hidden="true"
      >
        <span className="font-display text-[14vw] font-black tracking-tighter leading-none text-white whitespace-nowrap">
          GuardRail
        </span>
        <div className="w-[80vw] h-4 text-[#e5484d] -mt-4">
          <SquiggleUnderline />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Top 4 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {/* Column 1: Product */}
          <div>
            <div className="mb-4">
              <Logo size="sm" variant="full" />
            </div>
            <h4 className="font-mono text-xs font-semibold uppercase text-white tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8e95a5]">
              <li>
                <Link href="/sign-up" className="hover:text-white transition-colors">
                  Scan a repo
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How it works
                </a>
              </li>
              <li>
                <a href="#action" className="hover:text-white transition-colors">
                  GitHub Action
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Legal */}
          <div>
            <h4 className="font-mono text-xs font-semibold uppercase text-white tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8e95a5]">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/acceptable-use" className="hover:text-white transition-colors">
                  Acceptable use
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-white transition-colors">
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-white transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h4 className="font-mono text-xs font-semibold uppercase text-white tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8e95a5]">
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white transition-colors">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Disclaimer Note */}
          <div>
            <h4 className="font-mono text-xs font-semibold uppercase text-white tracking-wider mb-4">
              Notice
            </h4>
            <p className="text-xs text-[#8e95a5] leading-relaxed">
              Results are automated and not a security guarantee. Always verify code findings manually before deployment.
            </p>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-[#222634] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#555c6d]">
          <div>
            &copy; 2026 {OWNER_NAME}. All rights reserved.
          </div>
          <div className="flex items-center gap-1.5 text-[#8e95a5]">
            <span>Made with care in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
