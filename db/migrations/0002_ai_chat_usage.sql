-- AI chat usage tracking (separate from explanations)
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS "ai_chat_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" date NOT NULL,
  "chat_count" integer DEFAULT 0 NOT NULL,
  "last_request_at" timestamp with time zone
);

-- Index for fast lookups by user and date
CREATE INDEX IF NOT EXISTS "idx_ai_chat_usage_user_date" ON "ai_chat_usage"("user_id", "date");
