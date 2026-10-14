import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { scans, findings } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";

export default function ScansPage() {
  return (
    <Suspense fallback={<ScansLoadingSkeleton />}>
      <ScansContent />
    </Suspense>
  );
}

function ScansLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-6">
      <div className="h-8 w-48 bg-[var(--surface-subtle)] rounded-lg animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[var(--surface)] border border-[var(--border)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function ScansContent() {
  const { userId } = await auth();
  if (!userId) notFound();

  const user = await getOrCreateUser();

  const userScans = await db
    .select()
    .from(scans)
    .where(eq(scans.userId, user.id))
    .orderBy(desc(scans.createdAt));

  const scanIds = userScans.map((s) => s.id);

  let findingsPerScan: Record<string, { high: number; medium: number; low: number }> = {};
  if (scanIds.length > 0) {
    const allFindings = await db
      .select({
        scanId: findings.scanId,
        severity: findings.severity,
      })
      .from(findings)
      .where(inArray(findings.scanId, scanIds));

    for (const scanId of scanIds) {
      findingsPerScan[scanId] = { high: 0, medium: 0, low: 0 };
    }

    for (const f of allFindings) {
      if (findingsPerScan[f.scanId]) {
        if (f.severity === "high") findingsPerScan[f.scanId].high += 1;
        else if (f.severity === "medium") findingsPerScan[f.scanId].medium += 1;
        else if (f.severity === "low") findingsPerScan[f.scanId].low += 1;
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">All Scans</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your complete scan history, newest first.
        </p>
      </div>

      {userScans.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
            <svg className="h-6 w-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-[var(--fg)]">No scans yet</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Run your first scan from the dashboard to see it here.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:bg-white transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {userScans.map((scan) => {
            const score = scan.score ?? 0;
            const scoreColor =
              score >= 90
                ? "text-[var(--cleared-green)]"
                : score >= 70
                ? "text-[var(--squiggle-amber)]"
                : "text-[var(--squiggle-red)]";

            const counts = findingsPerScan[scan.id] ?? { high: 0, medium: 0, low: 0 };

            return (
              <Link
                key={scan.id}
                href={`/dashboard/scans/${scan.id}`}
                className="group block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-medium text-[var(--fg)] truncate">
                        {scan.repoName ?? "Repository scan"}
                      </h2>
                      <span className={`font-mono text-sm font-bold ${scoreColor}`}>
                        {score}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                      <span>
                        {scan.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {(counts.high > 0 || counts.medium > 0 || counts.low > 0) && (
                        <>
                          <span className="text-[var(--border)]">•</span>
                          <div className="flex items-center gap-2">
                            {counts.high > 0 && (
                              <span className="text-[var(--squiggle-red)]">{counts.high} high</span>
                            )}
                            {counts.medium > 0 && (
                              <span className="text-[var(--squiggle-amber)]">{counts.medium} med</span>
                            )}
                            {counts.low > 0 && (
                              <span className="text-[var(--cleared-green)]">{counts.low} low</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors">
                    View report →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
