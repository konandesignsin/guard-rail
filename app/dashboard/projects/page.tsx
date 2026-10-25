import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { scans, findings } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { Logo } from "@/app/components/logo";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsLoadingSkeleton />}>
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-6">
      <div className="h-8 w-48 bg-[var(--surface-subtle)] rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-[var(--surface)] border border-[var(--border)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function ProjectsContent() {
  const { userId } = await auth();
  if (!userId) notFound();

  const user = await getOrCreateUser();

  const userScans = await db
    .select()
    .from(scans)
    .where(eq(scans.userId, user.id))
    .orderBy(desc(scans.createdAt));

  // Group scans by repo name to get unique projects
  const projectsMap = new Map<string, {
    name: string;
    latestScan: typeof userScans[0];
    scanCount: number;
  }>();

  for (const scan of userScans) {
    const repoName = scan.repoName ?? "Unknown repository";
    const existing = projectsMap.get(repoName);
    
    if (!existing) {
      projectsMap.set(repoName, {
        name: repoName,
        latestScan: scan,
        scanCount: 1,
      });
    } else {
      existing.scanCount += 1;
    }
  }

  const projects = Array.from(projectsMap.values());

  // Get high severity counts for each project's latest scan
  const latestScanIds = projects.map((p) => p.latestScan.id);
  let highCountsByScan: Record<string, number> = {};
  
  if (latestScanIds.length > 0) {
    const highFindings = await db
      .select({
        scanId: findings.scanId,
      })
      .from(findings)
      .where(and(
        inArray(findings.scanId, latestScanIds),
        eq(findings.severity, "high")
      ));

    for (const scanId of latestScanIds) {
      highCountsByScan[scanId] = 0;
    }

    for (const f of highFindings) {
      if (highCountsByScan[f.scanId] !== undefined) {
        highCountsByScan[f.scanId] += 1;
      }
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">Projects</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your repositories and their latest scan results.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Logo variant="mark" size="lg" />
          </div>
          <h2 className="text-lg font-medium text-[var(--fg)]">No projects yet</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Scan a repository from the dashboard to see it here.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:bg-white transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const score = project.latestScan.score ?? 0;
            const scoreColor =
              score >= 90
                ? "border-[var(--cleared-green)]/30 bg-[var(--cleared-green-subtle)] text-[var(--cleared-green)]"
                : score >= 70
                ? "border-[var(--squiggle-amber)]/30 bg-[var(--squiggle-amber-subtle)] text-[var(--squiggle-amber)]"
                : "border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] text-[var(--squiggle-red)]";

            const highCount = highCountsByScan[project.latestScan.id] ?? 0;

            return (
              <Link
                key={project.latestScan.id}
                href={`/dashboard/scans/${project.latestScan.id}`}
                className="group block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-medium text-[var(--fg)] truncate flex-1">
                      {project.name}
                    </h2>
                    <span className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${scoreColor}`}>
                      {score}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>
                      {project.latestScan.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {project.scanCount > 1 && (
                      <span className="font-mono text-[10px]">
                        {project.scanCount} scans
                      </span>
                    )}
                  </div>

                  {highCount > 0 && (
                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-xs text-[var(--squiggle-red)]">
                        {highCount} high risk{highCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  <div className="pt-2">
                    <span className="text-xs text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors">
                      View latest scan →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
