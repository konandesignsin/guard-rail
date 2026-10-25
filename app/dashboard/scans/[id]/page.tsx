import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { findings, scanFiles, scans } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { ReportView } from "@/app/dashboard/report/report-view";
import { ScanPending } from "@/app/dashboard/report/scan-pending";
import { CHECK_LABELS, describeRule, fingerprintOf } from "@/lib/report/rules";
import { resolveProviderConfig, isEmailAllowed } from "@/lib/ai";
import type {
  ReportCheckSummary,
  ReportData,
  ReportFile,
  ReportFinding,
  Severity,
} from "@/lib/report/types";

type Props = {
  params: Promise<{ id: string }>;
};

const SEVERITIES: Severity[] = ["high", "medium", "low"];

function formatScanDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}

function toSeverity(value: string): Severity {
  return SEVERITIES.includes(value as Severity) ? (value as Severity) : "medium";
}

function ScanLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-4 w-28 animate-pulse rounded bg-[var(--surface-subtle)]" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--surface-subtle)]" />
      <div className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
      <div className="flex gap-2">
        <div className="h-11 w-20 animate-pulse rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-11 w-24 animate-pulse rounded-lg bg-[var(--surface-subtle)]" />
        <div className="h-11 w-24 animate-pulse rounded-lg bg-[var(--surface-subtle)]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="h-80 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
        <div className="hidden h-80 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] lg:block" />
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

  // Every read of scans, findings and scan_files is filtered by scan id AND
  // signed-in user.
  const [scanRow] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, id), eq(scans.userId, user.id)))
    .limit(1);

  if (!scanRow) notFound();

  const repoName = scanRow.repoName ?? "Repository scan";

  if (scanRow.status === "queued" || scanRow.status === "running" || scanRow.status === "failed") {
    return (
      <ScanPending
        repoName={repoName}
        scanDateLabel={formatScanDate(scanRow.createdAt)}
        status={scanRow.status}
        error={scanRow.error}
      />
    );
  }

  const [scanFindingRows, fileRows] = await Promise.all([
    db.select().from(findings).where(eq(findings.scanId, scanRow.id)),
    db.select().from(scanFiles).where(eq(scanFiles.scanId, scanRow.id)),
  ]);

  // Previous completed scan of the same repo, for the New / Still open / Fixed
  // comparison. Same user, same repo name, strictly earlier.
  let previousRow: typeof scanRow | null = null;
  if (scanRow.repoName) {
    const [previous] = await db
      .select()
      .from(scans)
      .where(
        and(
          eq(scans.userId, user.id),
          eq(scans.repoName, scanRow.repoName),
          eq(scans.status, "done"),
          lt(scans.createdAt, scanRow.createdAt),
        ),
      )
      .orderBy(desc(scans.createdAt))
      .limit(1);
    previousRow = previous ?? null;
  }

  const previousFindingRows = previousRow
    ? await db.select().from(findings).where(eq(findings.scanId, previousRow.id))
    : [];

  const previousFingerprints = new Map<
    string,
    { severity: Severity; check: string; title: string; file: string; line: number; explanation: string; fix: string }
  >();
  for (const row of previousFindingRows) {
    const rule = describeRule(row.check, row.title);
    const fingerprint = fingerprintOf(rule.id, row.file, row.title);
    if (!previousFingerprints.has(fingerprint)) {
      previousFingerprints.set(fingerprint, {
        severity: toSeverity(row.severity),
        check: row.check,
        title: row.title,
        file: row.file,
        line: row.line,
        explanation: row.explanation,
        fix: row.fix,
      });
    }
  }

  const currentFingerprints = new Set<string>();

  const currentFindings: ReportFinding[] = scanFindingRows.map((row) => {
    const rule = describeRule(row.check, row.title);
    const fingerprint = fingerprintOf(rule.id, row.file, row.title);
    currentFingerprints.add(fingerprint);

    return {
      id: row.id,
      severity: toSeverity(row.severity),
      check: row.check,
      title: row.title,
      file: row.file,
      line: row.line,
      explanation: row.explanation,
      fix: row.fix,
      category: rule.category,
      ruleId: rule.id,
      fingerprint,
      status: previousRow && !previousFingerprints.has(fingerprint) ? "new" : "open",
    };
  });

  const fixedFindings: ReportFinding[] = [];
  for (const [fingerprint, previous] of previousFingerprints) {
    if (currentFingerprints.has(fingerprint)) continue;
    const rule = describeRule(previous.check, previous.title);
    fixedFindings.push({
      id: `fixed-${fingerprint}`,
      severity: previous.severity,
      check: previous.check,
      title: previous.title,
      file: previous.file,
      line: previous.line,
      explanation: previous.explanation,
      fix: previous.fix,
      category: rule.category,
      ruleId: rule.id,
      fingerprint,
      status: "fixed",
    });
  }

  const allFindings = [...currentFindings, ...fixedFindings];

  const counts = {
    high: currentFindings.filter((finding) => finding.severity === "high").length,
    medium: currentFindings.filter((finding) => finding.severity === "medium").length,
    low: currentFindings.filter((finding) => finding.severity === "low").length,
    new: currentFindings.filter((finding) => finding.status === "new").length,
    open: currentFindings.filter((finding) => finding.status === "open").length,
    fixed: fixedFindings.length,
    security: currentFindings.filter((finding) => finding.category === "Security").length,
    quality: currentFindings.filter((finding) => finding.category === "Quality").length,
  };

  const checkCounts: ReportCheckSummary[] = (
    ["secrets", "supabase", "quality"] as const
  ).map((check) => ({
    check,
    label: CHECK_LABELS[check] ?? check,
    count: currentFindings.filter((finding) => finding.check === check).length,
  }));

  // File list: the paths the scanner walked, with the highest severity seen.
  const findingsByFile = new Map<string, { count: number; maxSeverity: Severity }>();
  for (const finding of currentFindings) {
    const existing = findingsByFile.get(finding.file);
    if (!existing) {
      findingsByFile.set(finding.file, { count: 1, maxSeverity: finding.severity });
      continue;
    }
    existing.count += 1;
    if (severityRank(finding.severity) < severityRank(existing.maxSeverity)) {
      existing.maxSeverity = finding.severity;
    }
  }

  const files: ReportFile[] = [];
  const seenPaths = new Set<string>();
  for (const row of fileRows) {
    const stats = findingsByFile.get(row.path);
    seenPaths.add(row.path);
    files.push({
      path: row.path,
      findingCount: stats?.count ?? 0,
      maxSeverity: stats?.maxSeverity ?? "none",
    });
  }
  for (const [path, stats] of findingsByFile) {
    if (seenPaths.has(path)) continue;
    files.push({ path, findingCount: stats.count, maxSeverity: stats.maxSeverity });
  }

  const config = resolveProviderConfig();
  const emailAllowed = isEmailAllowed(user.email);
  const isAiAvailable = config.enabled && emailAllowed;

  const repoFullName = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repoName)
    ? repoName
    : null;

  const data: ReportData = {
    scanId: scanRow.id,
    repoName,
    repoFullName,
    scanDateISO: scanRow.createdAt.toISOString(),
    scanDateLabel: formatScanDate(scanRow.createdAt),
    score: scanRow.score ?? 0,
    status: "done",
    error: null,
    filesScanned: files.length,
    files,
    findings: allFindings,
    hasPrevious: previousRow !== null,
    previousDateISO: previousRow ? previousRow.createdAt.toISOString() : null,
    previousDateLabel: previousRow ? formatScanDate(previousRow.createdAt) : null,
    counts,
    checkCounts,
    aiEnabled: isAiAvailable,
    initialUserOptIn: user.aiOptIn,
  };

  return <ReportView data={data} />;
}

function severityRank(severity: Severity): number {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}
