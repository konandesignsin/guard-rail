/**
 * Shared types for the scan report.
 *
 * Everything here is derived from what the scanner already stores: rule,
 * severity, category, file path, line and message. No source code and no
 * unmasked secret values are part of this model.
 */

export type Severity = "high" | "medium" | "low";
export type Category = "Security" | "Quality";

/** Where a finding stands compared with the previous scan of the same repo. */
export type FindingStatus = "new" | "open" | "fixed";

/**
 * A finding as rendered by the report. Kept compatible with the AI components,
 * which only ever need the message-level fields (never code).
 */
export interface FindingReportItem {
  id: string;
  severity: Severity;
  check?: string;
  title: string;
  file: string;
  line: number;
  explanation: string;
  fix: string;
  category?: Category;
  /**
   * The AI components accept a code snippet, but the report never supplies one:
   * source code is not stored, so explanations are built from the message only.
   */
  snippetLines?: { num: number; code: string; isSquiggle?: boolean }[];
}

export interface ReportFinding extends FindingReportItem {
  severity: Severity;
  category: Category;
  ruleId: string;
  fingerprint: string;
  status: FindingStatus;
}

export interface ReportFile {
  path: string;
  findingCount: number;
  maxSeverity: Severity | "none";
}

export interface ReportCounts {
  high: number;
  medium: number;
  low: number;
  new: number;
  open: number;
  fixed: number;
  security: number;
  quality: number;
}

export interface ReportCheckSummary {
  check: "secrets" | "supabase" | "quality";
  label: string;
  count: number;
}

export interface ReportData {
  scanId: string;
  repoName: string;
  /** "owner/name" when the repo can be re-scanned from the report. */
  repoFullName: string | null;
  scanDateISO: string;
  /** Preformatted on the server so the label never shifts during hydration. */
  scanDateLabel: string;
  score: number;
  status: "queued" | "running" | "done" | "failed";
  error: string | null;
  filesScanned: number;
  files: ReportFile[];
  findings: ReportFinding[];
  hasPrevious: boolean;
  previousDateISO: string | null;
  previousDateLabel: string | null;
  counts: ReportCounts;
  checkCounts: ReportCheckSummary[];
  aiEnabled: boolean;
  initialUserOptIn: boolean;
}
