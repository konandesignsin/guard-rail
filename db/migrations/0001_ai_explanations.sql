ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_opt_in" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_opt_in_at" timestamp with time zone;

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
);

CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" date NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_explanation_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "finding_id" text NOT NULL,
  "cache_key" text,
  "feedback" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
