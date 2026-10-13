import Link from "next/link";
import { Logo } from "@/app/components/logo";
import { NewsletterForm } from "@/app/components/newsletter-form";
import { CONTACT_EMAIL, LEGAL_LINKS } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Logo size="sm" showWordmark />
          <span className="text-[var(--border)]" aria-hidden="true">
            |
          </span>
          <span className="text-xs text-[var(--muted)]">MIT License</span>
        </div>

        <div className="flex flex-col items-start gap-4 text-xs text-[var(--muted)] sm:items-end">
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-[var(--fg)]">
                {link.label}
              </Link>
            ))}
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-[var(--fg)]">
              {CONTACT_EMAIL}
            </a>
          </nav>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="-my-1 inline-flex items-center gap-1.5 py-1 transition-colors hover:text-[var(--fg)]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              GitHub
            </a>
            <NewsletterForm />
          </div>
        </div>
      </div>
    </footer>
  );
}
