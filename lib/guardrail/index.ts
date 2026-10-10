export type Severity = "high" | "medium" | "low";
export type CheckName = "secrets" | "supabase" | "quality";

export interface Finding {
  severity: Severity;
  check: CheckName;
  title: string;
  explanation: string;
  fix: string;
  file: string;
  line: number;
}

export interface ScanResult {
  score: number;
  findings: Finding[];
}

export function scan(files: { path: string; content: string }[]): ScanResult {
  void files;
  return { score: 100, findings: [] };
}
