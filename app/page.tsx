import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
      <main className="flex max-w-2xl flex-col items-center text-center">
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
          guardrail
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Check your AI-built app for security problems
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Scan exports from Lovable, Bolt, and similar tools for exposed
          secrets, insecure Supabase setups, and code quality issues.
        </p>
        <Suspense fallback={<div className="mt-8 h-12" aria-hidden="true" />}>
          <AuthActions />
        </Suspense>
      </main>
    </div>
  );
}

async function AuthActions() {
  const user = await currentUser();

  return (
    <div className="mt-8 flex items-center gap-4">
      {user ? (
        <Link
          href="/dashboard"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Go to dashboard
        </Link>
      ) : (
        <>
          <Link
            href="/sign-up"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}
