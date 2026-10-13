import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { WorkspaceClient, type ScanItem, type DashboardStats } from "@/app/dashboard/workspace-client";
import { db } from "@/db";
import { scans, findings } from "@/db/schema";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[var(--bg)] text-xs font-mono text-[var(--muted)]">
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 text-[var(--fg)]">
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
  const clerkUser = await currentUser();

  const userScans = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, user.id), eq(scans.status, "done")))
    .orderBy(desc(scans.createdAt))
    .limit(20);

  const scanIds = userScans.map((s) => s.id);

  // Load findings for these scans (filtered strictly by scanIds)
  let allFindings: { scanId: string; severity: "high" | "medium" | "low" }[] = [];
  if (scanIds.length > 0) {
    allFindings = await db
      .select({
        scanId: findings.scanId,
        severity: findings.severity,
      })
      .from(findings)
      .where(inArray(findings.scanId, scanIds));
  }

  // Calculate findings per scan
  const findingsPerScan: Record<string, { high: number; medium: number; low: number; total: number }> = {};
  for (const s of userScans) {
    findingsPerScan[s.id] = { high: 0, medium: 0, low: 0, total: 0 };
  }
  for (const f of allFindings) {
    if (findingsPerScan[f.scanId]) {
      findingsPerScan[f.scanId].total += 1;
      if (f.severity === "high") findingsPerScan[f.scanId].high += 1;
      else if (f.severity === "medium") findingsPerScan[f.scanId].medium += 1;
      else if (f.severity === "low") findingsPerScan[f.scanId].low += 1;
    }
  }

  const serializedScans: ScanItem[] = userScans.map((s) => ({
    id: s.id,
    repoName: s.repoName,
    score: s.score,
    createdAt: s.createdAt.toISOString(),
    findingCounts: findingsPerScan[s.id] ?? { high: 0, medium: 0, low: 0, total: 0 },
  }));

  // Aggregated totals across all scans
  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  for (const f of allFindings) {
    if (f.severity === "high") totalHigh += 1;
    else if (f.severity === "medium") totalMedium += 1;
    else if (f.severity === "low") totalLow += 1;
  }

  const latestScan = userScans[0];
  const previousScan = userScans[1];

  let trendDelta: number | null = null;
  if (userScans.length >= 2 && latestScan?.score != null && previousScan?.score != null) {
    trendDelta = latestScan.score - previousScan.score;
  }

  const stats: DashboardStats = {
    latestScore: latestScan?.score ?? null,
    totalScans: userScans.length,
    highCount: totalHigh,
    mediumCount: totalMedium,
    lowCount: totalLow,
    trendDelta,
  };

  const hasGitHubConnection = clerkUser?.externalAccounts.some(
    (account) => account.provider === "github" || account.provider === "oauth_github",
  ) ?? false;

  return (
    <WorkspaceClient
      userEmail={user.email}
      scans={serializedScans}
      stats={stats}
      onboarding={{
        dismissed: user.onboardingDismissed,
        steps: {
          addedCodeOrRepo: hasGitHubConnection || userScans.length > 0,
          ranFirstScan: userScans.length > 0,
          reviewedFindings: allFindings.length > 0,
        },
      }}
    />
  );
}
