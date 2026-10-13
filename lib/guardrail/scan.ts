import type { FileInput, Finding, ScanResult } from './types';
import { secretsCheck } from './checks/secrets';
import { supabaseCheck } from './checks/supabase';
import { qualityCheck } from './checks/quality';

export function scan(files: FileInput[]): Finding[] {
  return [...secretsCheck(files), ...supabaseCheck(files), ...qualityCheck(files)];
}

export function audit(files: FileInput[]): ScanResult {
  const findings = scan(files);
  const high = findings.filter((f) => f.severity === 'high').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;
  const score = Math.max(0, 100 - high * 15 - medium * 5 - low * 1);
  return { score, findings };
}
