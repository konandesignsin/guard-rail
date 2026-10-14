import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const scanSource = pgEnum("scan_source", ["url", "zip", "github"]);
export const scanStatus = pgEnum("scan_status", [
  "queued",
  "running",
  "done",
  "failed",
]);
export const severity = pgEnum("severity", ["high", "medium", "low"]);
export const checkName = pgEnum("check_name", [
  "secrets",
  "supabase",
  "quality",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  emailOptIn: boolean("email_opt_in").default(true).notNull(),
  emailsSinceActive: integer("emails_since_active").default(0).notNull(),
  subscribedToUpdates: boolean("subscribed_to_updates")
    .default(false)
    .notNull(),
  onboardingDismissed: boolean("onboarding_dismissed").default(false).notNull(),
  aiOptIn: boolean("ai_opt_in").default(false).notNull(),
  aiOptInAt: timestamp("ai_opt_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const scans = pgTable("scans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  source: scanSource("source").notNull(),
  repoName: text("repo_name"),
  status: scanStatus("status").notNull(),
  score: integer("score"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const findings = pgTable("findings", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  severity: severity("severity").notNull(),
  check: checkName("check").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  fix: text("fix").notNull(),
  file: text("file").notNull(),
  line: integer("line").notNull(),
});

export const shareLinks = pgTable("share_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  publicToken: text("public_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usage = pgTable("usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  date: date("date").notNull(),
  scanCount: integer("scan_count").default(0).notNull(),
});

export const scanFiles = pgTable("scan_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  bytes: integer("bytes").notNull().default(0),
  findingCount: integer("finding_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiExplanations = pgTable("ai_explanations", {
  id: uuid("id").defaultRandom().primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  ruleId: text("rule_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  verdict: text("verdict").notNull(),
  confidence: text("confidence").notNull(),
  summary: text("summary").notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  fixSteps: text("fix_steps").notNull(), // JSON array of strings
  fixedCode: text("fixed_code"),
  rawResponse: text("raw_response").notNull(), // validated JSON representation
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  date: date("date").notNull(),
  requestCount: integer("request_count").default(0).notNull(),
});

export const aiExplanationFeedback = pgTable("ai_explanation_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  findingId: text("finding_id").notNull(),
  cacheKey: text("cache_key"),
  feedback: text("feedback").notNull(), // 'up' | 'down'
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiChatUsage = pgTable("ai_chat_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  date: date("date").notNull(),
  chatCount: integer("chat_count").default(0).notNull(),
  lastRequestAt: timestamp("last_request_at", { withTimezone: true }),
});


