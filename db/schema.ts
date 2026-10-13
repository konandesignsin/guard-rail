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
