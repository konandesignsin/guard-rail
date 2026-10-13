import Link from "next/link";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] py-[var(--section-y)]">
      <div
        className="pointer-events-none absolute -bottom-32 left-1/2 h-72 w-[34rem] -translate-x-1/2 glow-soft"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <h2 className="font-display text-[length:var(--step-3)] leading-tight font-light tracking-tight text-balance text-[var(--fg)]">
          Run the check before you ship.
        </h2>
        <p className="mt-4 max-w-[46ch] text-[length:var(--step-1)] leading-relaxed text-[var(--muted)]">
          Free for individuals and open source. Nothing to install, nothing to configure.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-full bg-[var(--fg)] px-7 py-3 text-sm font-medium text-[var(--bg)] shadow-md shadow-black/20 transition-colors hover:bg-white"
          >
            Scan my app
          </Link>
          <Link
            href="#try-it"
            className="inline-flex items-center rounded-full border border-[var(--border)] px-7 py-3 text-sm font-medium text-[var(--fg)] transition-colors hover:border-[var(--muted-subtle)] hover:bg-[var(--surface-subtle)]"
          >
            Try it in the browser
          </Link>
        </div>
      </div>
    </section>
  );
}
