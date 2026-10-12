export type Severity = 'high' | 'medium' | 'low';
export type CheckName = 'secrets' | 'supabase' | 'quality';

export interface FileInput {
  path: string;
  content: string;
}

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
