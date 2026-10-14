import { createHash, timingSafeEqual } from "node:crypto";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { scanRetentionCutoff } from "@/lib/legal";

/**
 * Constant-time compare of an `Authorization` header against the expected
 * secret. Returns false when no secret is configured, so a missing
 * CRON_SECRET can never authorize a request.
 */
export function hasValidCronSecret(
  authorization: string | null | undefined,
  expected: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!expected) return false;

  const prefix = "Bearer ";
  if (!authorization || !authorization.startsWith(prefix)) return false;
  const provided = authorization.slice(prefix.length).trim();

  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Deletes scans older than the retention window and reports how many were
 * removed. Findings, file metadata and share links go with them through the
 * `on delete cascade` foreign keys. No scan content is read.
 */
export async function deleteExpiredScans(
  now: Date = new Date(),
): Promise<{ deletedScans: number; cutoff: Date }> {
  const cutoff = scanRetentionCutoff(now);
  const removed = await db
    .delete(scans)
    .where(lt(scans.createdAt, cutoff))
    .returning({ id: scans.id });

  return { deletedScans: removed.length, cutoff };
}
