import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

config({ path: resolve(__dirname, "../.env.local") });

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const sql = neon(databaseUrl);

  console.log("\nApplying migration: 0002_ai_chat_usage.sql\n");

  try {
    console.log("1. Creating ai_chat_usage table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "ai_chat_usage" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "date" date NOT NULL,
        "chat_count" integer DEFAULT 0 NOT NULL,
        "last_request_at" timestamp with time zone
      )
    `;
    console.log("   ✓ Done\n");

    console.log("2. Creating index on ai_chat_usage...");
    await sql`
      CREATE INDEX IF NOT EXISTS "idx_ai_chat_usage_user_date" 
      ON "ai_chat_usage"("user_id", "date")
    `;
    console.log("   ✓ Done\n");

    console.log("Verifying changes...\n");

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ai_chat_usage'
    `;
    
    if (tables.length > 0) {
      console.log("✓ ai_chat_usage table exists");
      
      const columns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ai_chat_usage'
        ORDER BY ordinal_position
      `;
      console.log("\nColumns:");
      columns.forEach((c: any) => console.log(`  - ${c.column_name}`));
    } else {
      console.log("✗ ai_chat_usage table not found");
    }

    console.log("\n✓ Migration complete");
    process.exit(0);
  } catch (err: any) {
    console.error("\n✗ Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  }
}

applyMigration();
