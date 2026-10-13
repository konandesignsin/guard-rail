import { Suspense } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { LEGAL_PATHS } from "@/lib/legal";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 py-10">
      <div className="flex flex-col items-center gap-5">
        <Suspense fallback={null}>
          <SignUp />
        </Suspense>
        <nav aria-label="Legal" className="flex items-center gap-4 text-xs text-[var(--muted)]">
          <Link href={LEGAL_PATHS.privacy} className="transition-colors hover:text-[var(--fg)]">
            Privacy
          </Link>
          <Link href={LEGAL_PATHS.terms} className="transition-colors hover:text-[var(--fg)]">
            Terms
          </Link>
        </nav>
      </div>
    </div>
  );
}
