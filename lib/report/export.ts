import { describeRule, SEVERITY_LABEL, summarySentence } from "./rules";
import type { ReportData, ReportFinding } from "./types";

/**
 * Export builders. They only ever serialise the stored message-level fields:
 * rule, severity, category, file path, line and message. Source code is never
 * stored, so it can never end up in an export.
 */

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "scan";
}

export function exportFileName(data: ReportData, extension: "md" | "json"): string {
  const date = new Date(data.scanDateISO).toISOString().slice(0, 10);
  return `guardrail-${slug(data.repoName)}-${date}.${extension}`;
}

function location(finding: ReportFinding): string {
  return `${finding.file}:${finding.line}`;
}

export function toMarkdown(data: ReportData): string {
  const current = data.findings.filter((f) => f.status !== "fixed");
  const fixed = data.findings.filter((f) => f.status === "fixed");
  const lines: string[] = [];

  lines.push(`# GuardRail report — ${data.repoName}`);
  lines.push("");
  lines.push(`Scanned ${new Date(data.scanDateISO).toUTCString()}`);
  lines.push(`Score ${data.score}/100 · ${data.filesScanned} files scanned`);
  lines.push("");
  lines.push(summarySentence(data.counts));
  lines.push("");
  lines.push(
    `High ${data.counts.high} · Medium ${data.counts.medium} · Low ${data.counts.low}`,
  );
  if (data.hasPrevious) {
    lines.push(
      `${data.counts.new} new · ${data.counts.open} still open · ${data.counts.fixed} fixed since the previous scan`,
    );
  }
  lines.push("");

  if (current.length === 0) {
    lines.push("## No issues found");
    lines.push("");
    lines.push(
      `We checked ${data.filesScanned} files with the Secrets, Database rules and Code quality checks.`,
    );
  } else {
    lines.push("## Findings");
    for (const severity of ["high", "medium", "low"] as const) {
      const group = current.filter((f) => f.severity === severity);
      if (group.length === 0) continue;
      lines.push("");
      lines.push(`### ${SEVERITY_LABEL[severity]} (${group.length})`);
      for (const finding of group) {
        const rule = describeRule(finding.check, finding.title);
        lines.push("");
        lines.push(`- **${finding.title}**`);
        lines.push(`  - Location: \`${location(finding)}\``);
        lines.push(`  - Rule: ${rule.label} (${rule.id})`);
        lines.push(`  - Category: ${finding.category}`);
        if (data.hasPrevious) {
          lines.push(
            `  - Status: ${finding.status === "new" ? "New since last scan" : "Still open"}`,
          );
        }
        lines.push(`  - Why it matters: ${finding.explanation}`);
        const steps = rule.steps.length > 0 ? rule.steps : [finding.fix];
        lines.push("  - How to fix it:");
        steps.forEach((step, index) => lines.push(`    ${index + 1}. ${step}`));
        if (rule.rotateFirst) {
          lines.push(
            "  - Rotate this key first, then remove it from the code and move it to an environment variable.",
          );
        }
      }
    }
  }

  if (fixed.length > 0) {
    lines.push("");
    lines.push(`## Fixed since the previous scan (${fixed.length})`);
    for (const finding of fixed) {
      lines.push(`- ${finding.title} — \`${location(finding)}\``);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push(
    "Automated checks can miss things and flag safe code. This is a first pass, not a full audit. No source code was stored to build this report.",
  );
  lines.push("");

  return lines.join("\n");
}

export function toJson(data: ReportData): string {
  const payload = {
    report: {
      repo: data.repoName,
      scanId: data.scanId,
      scannedAt: data.scanDateISO,
      score: data.score,
      filesScanned: data.filesScanned,
      comparisons: data.hasPrevious
        ? {
            previousScanAt: data.previousDateISO,
            new: data.counts.new,
            stillOpen: data.counts.open,
            fixed: data.counts.fixed,
          }
        : { previousScanAt: null, new: null, stillOpen: null, fixed: null },
      counts: {
        high: data.counts.high,
        medium: data.counts.medium,
        low: data.counts.low,
        security: data.counts.security,
        quality: data.counts.quality,
      },
      checks: data.checkCounts,
    },
    findings: data.findings.map((finding) => {
      const rule = describeRule(finding.check, finding.title);
      return {
        id: finding.id,
        ruleId: rule.id,
        rule: rule.label,
        fingerprint: finding.fingerprint,
        severity: finding.severity,
        category: finding.category,
        title: finding.title,
        file: finding.file,
        line: finding.line,
        explanation: finding.explanation,
        fix: finding.fix,
        status: finding.status,
        falsePositiveNote: rule.falsePositive,
        reference: rule.reference ?? null,
      };
    }),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
