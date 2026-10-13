import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { lt, sql } from "drizzle-orm";
import { scans } from "./db/schema";
import { SCAN_RETENTION_DAYS, scanRetentionCutoff } from "./lib/legal";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.log(JSON.stringify({ error: "DATABASE_URL missing" }));
  process.exit(1);
}

async function main() {
  const db = drizzle(neon(url as string));
  const cutoff = scanRetentionCutoff();

  const [total] = await db.select({ n: sql<number>`count(*)::int` }).from(scans);
  const [expired] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(scans)
    .where(lt(scans.createdAt, cutoff));

  // Counts only — no scan content is read or printed.
  console.log(
    JSON.stringify({
      retentionDays: SCAN_RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
      totalScans: total.n,
      expiredScans: expired.n,
    }),
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  },
);
