import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { scans, findings, scanFiles } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { SplitReportView, type FindingReportItem } from "@/app/dashboard/split-report-view";
import { type HeatMapFile } from "@/app/dashboard/repo-heat-map";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ScanReportPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[var(--bg)] text-xs font-mono text-[var(--muted)]">
          loading report...
        </div>
      }
    >
      <ReportContent params={params} />
    </Suspense>
  );
}

async function ReportContent({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const user = await getOrCreateUser();

  // Every read of scans, findings, and scan_files must be filtered by scan id AND signed-in user
  const [scanRow] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, id), eq(scans.userId, user.id)))
    .limit(1);

  if (!scanRow) notFound();

  // Read findings for this scan
  const scanFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.scanId, scanRow.id));

  // Read scan_files metadata for heat map (path and bytes only, no code content)
  const filesList = await db
    .select()
    .from(scanFiles)
    .where(eq(scanFiles.scanId, scanRow.id));

  const formattedFindings: FindingReportItem[] = scanFindings.map((f) => ({
    id: f.id,
    severity: (f.severity as "high" | "medium" | "low") || "high",
    check: f.check,
    title: f.title,
    file: f.file,
    line: f.line,
    explanation: f.explanation,
    fix: f.fix,
  }));

  const heatMapFiles: HeatMapFile[] = filesList.map((f) => ({
    path: f.path,
    bytes: f.bytes,
    findingCount: f.findingCount,
  }));

  const score = scanRow.score ?? 0;
  const shortId = scanRow.id.slice(0, 7);

  return (
    <SplitReportView
      score={score}
      repoName={`${scanRow.repoName ?? "Repository"} #${shortId}`}
      subtitle={`Scanned on ${scanRow.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`}
      findings={formattedFindings}
      files={heatMapFiles}
      backHref="/dashboard"
    />
  );
}
