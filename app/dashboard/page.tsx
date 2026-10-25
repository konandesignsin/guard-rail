import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { WorkspaceClient, type ScanItem } from "@/app/dashboard/workspace-client";
import { resolveProviderConfig, isEmailAllowed } from "@/lib/ai";
import { db } from "@/db";
import { scans } from "@/db/schema";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-[var(--bg)] text-xs font-mono text-[var(--muted)]">
          loading workspace...
        </div>
      }
    >
      <DashboardDataLoader />
    </Suspense>
  );
}

async function DashboardDataLoader() {
  try {
    return await DashboardContent();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[dashboard] failed to load dashboard data:", error);

    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--bg)] px-5 py-16 text-[var(--fg)]">
        <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-sm">
          <h1 className="font-display text-lg font-medium">We couldn&apos;t load your dashboard</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Your scans are safe. Please try again in a moment.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-md bg-[var(--fg)] px-4 py-2 text-xs font-medium text-[var(--bg)] transition-colors hover:bg-white"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }
}

async function DashboardContent() {
  const user = await getOrCreateUser();

  const userScans = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, user.id), eq(scans.status, "done")))
    .orderBy(desc(scans.createdAt))
    .limit(20);

  const serializedScans: ScanItem[] = userScans.map((s) => ({
    id: s.id,
    repoName: s.repoName,
    score: s.score,
    createdAt: s.createdAt.toISOString(),
  }));

  const config = resolveProviderConfig();
  const emailAllowed = isEmailAllowed(user.email);
  const isAiAvailable = config.enabled && emailAllowed;

  return (
    <WorkspaceClient
      scans={serializedScans}
      isAiEnabled={isAiAvailable}
      userOptIn={user.aiOptIn}
    />
  );
}
