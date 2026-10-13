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

function ScanLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-10 bg-[var(--surface-subtle)] rounded-lg w-1/3" />
      <div className="h-32 bg-[var(--surface)] border border-[var(--border)] rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[600px]">
        <div className="md:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl" />
        <div className="md:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-xl" />
      </div>
    </div>
  );
}

export default function ScanReportPage({ params }: Props) {
  return (
    <Suspense fallback={<ScanLoadingSkeleton />}>
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

  // Read scan_files metadata for heat map / files list
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
