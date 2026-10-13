ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_dismissed" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ALTER COLUMN "onboarding_dismissed" SET DEFAULT false;
