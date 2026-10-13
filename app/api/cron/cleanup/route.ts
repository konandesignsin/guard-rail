import { NextResponse, connection } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { SCAN_RETENTION_DAYS, scanRetentionCutoff } from "@/lib/legal";

/** Constant-time compare of the bearer token against CRON_SECRET. */
function hasValidCronSecret(authorization: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const prefix = "Bearer ";
  if (!authorization || !authorization.startsWith(prefix)) return false;
  const provided = authorization.slice(prefix.length).trim();

  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Daily Vercel cron: delete scans older than the retention window in
 * lib/legal.ts. Findings, file metadata and share links are removed by the
 * `on delete cascade` foreign keys, so one statement is enough.
 *
 * Scheduled in vercel.json. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  // Keep this handler at request time (Cache Components would otherwise try to
  // prerender it, where there is no request to authorize).
  await connection();

  if (!hasValidCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = scanRetentionCutoff();

  try {
    const removed = await db
      .delete(scans)
      .where(lt(scans.createdAt, cutoff))
      .returning({ id: scans.id });

    const deletedScans = removed.length;

    // Counts only — scan contents are never read or logged here.
    console.log(
      `[cron/cleanup] deleted ${deletedScans} scan(s) older than ${SCAN_RETENTION_DAYS} day(s)`,
    );

    return NextResponse.json({
      ok: true,
      deletedScans,
      retentionDays: SCAN_RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[cron/cleanup] failed: ${message}`);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
