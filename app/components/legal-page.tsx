import Link from "next/link";
import { Logo } from "@/app/components/logo";
import { SiteFooter } from "@/app/components/site-footer";

interface LegalPageProps {
  title: string;
  description: string;
  effectiveDate: string;
  children: React.ReactNode;
}

export function LegalPage({ title, description, effectiveDate, children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-6">
          <Logo size="sm" showWordmark />
          <Link
            href="/"
            className="font-mono text-xs text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
          >
            Back to Guardrail
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-12 sm:py-16">
        <header className="border-b border-[var(--border)] pb-8">
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">{description}</p>
          <p className="mt-4 font-mono text-xs text-[var(--muted-subtle)]">
            Effective {effectiveDate}
          </p>
        </header>

        <article className="space-y-10 py-10 text-sm leading-7 text-[var(--muted)]">
          {children}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
