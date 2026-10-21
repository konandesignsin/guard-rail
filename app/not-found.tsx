import Link from "next/link";
import { Logo } from "@/app/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--bg)] text-[var(--fg)] p-6">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <Logo size="xl" variant="full" />
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Page not found</h1>
          <p className="text-sm text-[var(--muted)]">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-[var(--fg)] px-5 py-2 text-xs font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          Back to GuardRail
        </Link>
      </div>
    </div>
  );
}
