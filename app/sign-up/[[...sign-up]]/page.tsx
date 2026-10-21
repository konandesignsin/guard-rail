import { Suspense } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { LEGAL_PATHS } from "@/lib/legal";
import { Logo } from "@/app/components/logo";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 py-10">
      <div className="flex flex-col items-center gap-5">
        <Logo size="md" variant="full" />
        <Suspense fallback={null}>
          <SignUp
            appearance={{
              options: {
                logoImageUrl: "/guardrail-logo-light.svg",
              },
              variables: {
                colorPrimary: "#e5484d",
                colorBackground: "#090a0f",
              },
            }}
          />
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
