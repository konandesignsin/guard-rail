import { Suspense } from "react";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { WorkspaceClient, type ScanItem } from "@/app/dashboard/workspace-client";
import { db } from "@/db";
import { scans } from "@/db/schema";

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
  const user = await getOrCreateUser();

  const recentScans = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, user.id), eq(scans.status, "done")))
    .orderBy(desc(scans.createdAt))
    .limit(15);

  const serializedScans: ScanItem[] = recentScans.map((s) => ({
    id: s.id,
    repoName: s.repoName,
    score: s.score,
    createdAt: s.createdAt.toISOString(),
  }));

  return <WorkspaceClient userEmail={user.email} scans={serializedScans} />;
}
