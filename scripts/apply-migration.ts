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

  console.log("\nApplying migration statements one by one...\n");

  try {
    console.log("1. Adding ai_opt_in column to users...");
    await sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_opt_in" boolean DEFAULT false NOT NULL
    `;
    console.log("   ✓ Done\n");

    console.log("2. Adding ai_opt_in_at column to users...");
    await sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_opt_in_at" timestamp with time zone
    `;
    console.log("   ✓ Done\n");

    console.log("3. Creating ai_explanations table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "ai_explanations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "cache_key" text NOT NULL UNIQUE,
        "rule_id" text NOT NULL,
        "prompt_version" text NOT NULL,
        "verdict" text NOT NULL,
        "confidence" text NOT NULL,
        "summary" text NOT NULL,
        "why_it_matters" text NOT NULL,
        "fix_steps" text NOT NULL,
        "fixed_code" text,
        "raw_response" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log("   ✓ Done\n");

    console.log("4. Creating ai_usage table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "ai_usage" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "date" date NOT NULL,
        "request_count" integer DEFAULT 0 NOT NULL
      )
    `;
    console.log("   ✓ Done\n");

    console.log("5. Creating ai_explanation_feedback table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "ai_explanation_feedback" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "finding_id" text NOT NULL,
        "cache_key" text,
        "feedback" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log("   ✓ Done\n");

    console.log("Verifying changes...\n");

    const usersColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `;
    console.log("users table columns:");
    usersColumns.forEach((c: any) => console.log(`  - ${c.column_name}`));

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'ai_%'
      ORDER BY table_name
    `;
    console.log("\nAI tables:");
    if (tables.length === 0) {
      console.log("  (none found)");
    } else {
      tables.forEach((t: any) => console.log(`  - ${t.table_name}`));
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
