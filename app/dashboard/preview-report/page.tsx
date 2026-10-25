import { notFound } from "next/navigation";
import { ReportView } from "@/app/dashboard/report/report-view";
import { describeRule, fingerprintOf } from "@/lib/report/rules";
import type { ReportData, ReportFinding, Severity } from "@/lib/report/types";

/**
 * Design preview of the report with hand-written metadata. No source code and
 * no real credentials are involved: every string below is a rule-level message.
 */

const sampleRows: {
  id: string;
  severity: Severity;
  check: string;
  title: string;
  file: string;
  line: number;
  explanation: string;
  fix: string;
  status: ReportFinding["status"];
}[] = [
  {
    id: "sample-1",
    severity: "high",
    check: "supabase",
    title: 'Table "profiles" created without Row Level Security',
    file: "supabase/migrations/001_init.sql",
    line: 14,
    explanation:
      "Without RLS, any logged-in user can read and write all data in this table. This is the number one security mistake in Supabase apps.",
    fix: "Add this after your CREATE TABLE:\n  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;",
    status: "new",
  },
  {
    id: "sample-2",
    severity: "medium",
    check: "supabase",
    title: "Policy with USING (true) — fine if this table is meant to be public",
    file: "supabase/migrations/002_policies.sql",
    line: 22,
    explanation:
      "USING (true) on a SELECT policy means anyone can read all rows. This is fine for public data such as blog posts, but risky if the table holds private rows.",
    fix: "If this table should be private, replace it with an ownership check.",
    status: "open",
  },
  {
    id: "sample-3",
    severity: "low",
    check: "quality",
    title: "console.log left in source code",
    file: "app/dashboard/actions.ts",
    line: 8,
    explanation:
      "Debug logs clutter the console in production and can expose sensitive data. They also signal unfinished code to other developers.",
    fix: "Remove the console.log or use a logging library with log levels.",
    status: "open",
  },
  {
    id: "sample-4",
    severity: "low",
    check: "quality",
    title: "console.log left in source code",
    file: "lib/upload.ts",
    line: 41,
    explanation:
      "Debug logs clutter the console in production and can expose sensitive data. They also signal unfinished code to other developers.",
    fix: "Remove the console.log or use a logging library with log levels.",
    status: "open",
  },
  {
    id: "sample-5",
    severity: "low",
    check: "quality",
    title: 'Dependency "lodash" is never imported in source code',
    file: "package.json",
    line: 1,
    explanation:
      "Unused dependencies bloat node_modules and install time. They also confuse developers about what the project actually uses.",
    fix: "Remove it with your package manager.",
    status: "new",
  },
];

function buildFindings(): ReportFinding[] {
  const current = sampleRows.map((row) => {
    const rule = describeRule(row.check, row.title);
    return {
      ...row,
      category: rule.category,
      ruleId: rule.id,
      fingerprint: fingerprintOf(rule.id, row.file, row.title),
      status: row.status,
    } satisfies ReportFinding;
  });

  const removed = {
    title: "Public storage bucket created",
    check: "supabase",
    file: "supabase/migrations/001_init.sql",
    line: 2,
    severity: "medium" as Severity,
    explanation:
      "Public buckets let anyone read uploaded files without signing in. If users upload sensitive documents, they become visible to the world.",
    fix: "Set public to false unless the bucket truly needs public access.",
  };
  const removedRule = describeRule(removed.check, removed.title);

  return [
    ...current,
    {
      id: "sample-fixed",
      ...removed,
      category: removedRule.category,
      ruleId: removedRule.id,
      fingerprint: fingerprintOf(removedRule.id, removed.file, removed.title),
      status: "fixed",
    },
  ];
}

export default function PreviewReportPage() {
  if (process.env.NEXT_PUBLIC_SHOW_PREVIEW_ROUTES !== "true") {
    notFound();
  }

  const findings = buildFindings();
  const current = findings.filter((finding) => finding.status !== "fixed");

  const data: ReportData = {
    scanId: "00000000-0000-4000-8000-000000000000",
    repoName: "konandesigns/sample-store",
    repoFullName: "konandesigns/sample-store",
    scanDateISO: "2026-10-25T09:12:00.000Z",
    scanDateLabel: "Oct 25, 2026, 9:12 AM UTC",
    score: 72,
    status: "done",
    error: null,
    filesScanned: 28,
    files: [
      { path: "supabase/migrations/001_init.sql", findingCount: 1, maxSeverity: "high" },
      { path: "supabase/migrations/002_policies.sql", findingCount: 1, maxSeverity: "medium" },
      { path: "app/dashboard/actions.ts", findingCount: 1, maxSeverity: "low" },
      { path: "lib/upload.ts", findingCount: 1, maxSeverity: "low" },
      { path: "package.json", findingCount: 1, maxSeverity: "low" },
      { path: "app/page.tsx", findingCount: 0, maxSeverity: "none" },
      { path: "lib/format.ts", findingCount: 0, maxSeverity: "none" },
    ],
    findings,
    hasPrevious: true,
    previousDateISO: "2026-10-18T16:40:00.000Z",
    previousDateLabel: "Oct 18, 2026, 4:40 PM UTC",
    counts: {
      high: current.filter((finding) => finding.severity === "high").length,
      medium: current.filter((finding) => finding.severity === "medium").length,
      low: current.filter((finding) => finding.severity === "low").length,
      new: current.filter((finding) => finding.status === "new").length,
      open: current.filter((finding) => finding.status === "open").length,
      fixed: findings.filter((finding) => finding.status === "fixed").length,
      security: current.filter((finding) => finding.category === "Security").length,
      quality: current.filter((finding) => finding.category === "Quality").length,
    },
    checkCounts: [
      { check: "secrets", label: "Secrets", count: 0 },
      { check: "supabase", label: "Database rules", count: 2 },
      { check: "quality", label: "Code quality", count: 3 },
    ],
    aiEnabled: true,
    initialUserOptIn: false,
  };

  return <ReportView data={data} />;
}
