import { NextResponse, connection } from "next/server";
import { hasValidCronSecret, deleteExpiredScans } from "@/lib/cron";
import { SCAN_RETENTION_DAYS } from "@/lib/legal";

/**
 * Daily Vercel cron (see vercel.json): delete scans older than the retention
 * window in lib/legal.ts. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  // Keep this handler at request time — Cache Components would otherwise try to
  // prerender it, where there is no request to authorize.
  await connection();

  if (!hasValidCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deletedScans, cutoff } = await deleteExpiredScans();

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
