import { Suspense } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateUser } from "@/lib/get-or-create-user";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          guardrail
        </Link>
        <UserButton />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <DashboardContent />
        </Suspense>
      </main>
    </div>
  );
}

async function DashboardContent() {
  const user = await getOrCreateUser();

  return (
    <>
      <p className="text-sm text-zinc-600">Signed in as {user.email}</p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">Dashboard</h1>
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-10 text-center">
        <p className="text-zinc-500">Scanning coming next</p>
      </div>
    </>
  );
}
