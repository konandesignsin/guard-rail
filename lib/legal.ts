/**
 * Legal page content + data-retention policy.
 *
 * NOTE: the two values marked [ ] below are deliberately left as placeholders —
 * they are rendered verbatim on /terms and /privacy, so they must be replaced
 * with the real jurisdiction and grievance contact before launch.
 */

/** Who operates Guardrail. Used on /terms, /privacy, /acceptable-use, /disclaimer. */
export const OWNER_NAME = "Konan Designs";

/** Address shown for privacy, terms, and policy questions. */
export const CONTACT_EMAIL = "konandesigns.in@gmail.com";

/** The AI provider used for optional finding explanations. */
export const AI_PROVIDER_NAME = "NVIDIA (hosted model)";

/** Date shown as "Effective <date>" on every legal page. */
export const LEGAL_EFFECTIVE_DATE = "October 14, 2026";

/** Rendered inside the sentence "These terms are governed by the …". */
export const GOVERNING_LAW = "[the laws of your jurisdiction]";

/** Name and contact details of the grievance officer, e.g. "Jane Doe, jane@example.com". */
export const GRIEVANCE_OFFICER = "[name, contact email]";

export const LEGAL_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  acceptableUse: "/acceptable-use",
  disclaimer: "/disclaimer",
} as const;

/** Order shown in the footer and on the legal pages. */
export const LEGAL_LINKS = [
  { href: LEGAL_PATHS.privacy, label: "Privacy" },
  { href: LEGAL_PATHS.terms, label: "Terms" },
  { href: LEGAL_PATHS.acceptableUse, label: "Acceptable use" },
  { href: LEGAL_PATHS.disclaimer, label: "Disclaimer" },
];

/**
 * How long scans (with their findings, file metadata, and share links, which
 * cascade from `scans`) are kept. The daily cron at `/api/cron/cleanup`
 * deletes anything older than this window.
 */
export const SCAN_RETENTION_DAYS = 30;

/** The point in time before which scans are considered expired. */
export function scanRetentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - SCAN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
