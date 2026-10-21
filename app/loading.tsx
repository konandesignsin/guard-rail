import { Logo } from "@/app/components/logo";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 bg-[var(--bg)] text-[var(--fg)] p-6">
      <Logo size="lg" variant="mark" priority />
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)] animate-pulse">
        <span>Loading...</span>
      </div>
    </div>
  );
}
