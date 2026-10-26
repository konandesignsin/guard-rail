import type {
  Category,
  FindingReportItem,
  FindingStatus,
  ReportFinding,
  Severity,
} from "./types";

/**
 * Rule-based presentation layer for scan findings.
 *
 * The scanner stores a severity, a check name, a title, an explanation, a fix
 * and a file/line location. Everything a reader needs beyond that — a stable
 * rule id, a plain-English fix recipe, a generic before/after example and an
 * honest false-positive note — is derived here from the rule itself, never
 * from the user's code.
 */

export interface RuleMeta {
  /** Stable across scans; used for grouping and fingerprints. */
  id: string;
  /** Short human name for the rule. */
  label: string;
  /** Used when several findings of this rule are collapsed into one row. */
  groupLabel?: string;
  groupUnit?: string;
  category: Category;
  /** Numbered repair steps, written as instructions, not as the user's code. */
  steps: string[];
  /** Generic before/after illustration of the rule, never the user's code. */
  example: { before: string; after: string };
  /** Plain-language "could this be a false positive?" note. */
  falsePositive: string;
  /** True for exposed credentials: rotation comes before removal. */
  rotateFirst?: boolean;
  /** Only set where the mapping is unambiguous. */
  reference?: string;
}

interface RuleEntry {
  test: (check: string, title: string) => boolean;
  meta: RuleMeta;
}

const CWE_HARDCODED = "CWE-798 — Use of Hard-coded Credentials";

const RULES: RuleEntry[] = [
  // ---------------------------------------------------------------- secrets
  {
    test: (check, title) => check === "secrets" && title.startsWith(".env file is not in .gitignore"),
    meta: {
      id: "secrets/env-not-ignored",
      label: "Secrets file can be committed",
      category: "Security",
      steps: [
        "Open the .gitignore file at the root of the repository.",
        "Add a line for .env (and .env.local) and save it.",
        "If that file was committed at any point, rotate every value it holds.",
      ],
      example: {
        before: `# .gitignore
node_modules
dist`,
        after: `# .gitignore
node_modules
dist

# local secrets
.env
.env.local`,
      },
      falsePositive:
        "Only a problem if that .env holds real values. An .env committed with placeholders exposes nothing.",
    },
  },
  {
    test: (check, title) => check === "secrets" && title.includes(".env.example is missing"),
    meta: {
      id: "secrets/env-example-missing",
      label: "Missing .env.example",
      category: "Security",
      steps: [
        "Create a file named .env.example next to the README.",
        "List every variable the app needs, with placeholder values only.",
        "Commit it so the next checkout knows what to configure.",
      ],
      example: {
        before: `# no .env.example committed`,
        after: `# .env.example
API_KEY=your_key_here
DATABASE_URL=postgres://user:password@localhost:5432/app`,
      },
      falsePositive:
        "Not a vulnerability on its own — it is a setup and onboarding gap, which is why it is rated low.",
    },
  },
  {
    test: (check, title) => check === "secrets" && title.includes("service_role key found"),
    meta: {
      id: "secrets/service-role-key",
      label: "Service-role key in source",
      category: "Security",
      steps: [
        "Rotate the key in your Supabase project settings — assume it is already compromised.",
        "Delete it from the file and read it from a server-side environment variable instead.",
        "Make sure the browser only ever receives the anon key.",
      ],
      example: {
        before: `const admin = createClient(url, "<service-role-key>")`,
        after: `// server-side only
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)`,
      },
      falsePositive:
        "If the value was always a placeholder, nothing leaked. Rotate anyway if it ever was active.",
      rotateFirst: true,
      reference: CWE_HARDCODED,
    },
  },
  {
    test: (check, title) => check === "secrets" && title.includes("in public env variable"),
    meta: {
      id: "secrets/public-env-credential",
      label: "Secret in a public environment variable",
      category: "Security",
      steps: [
        "Rotate the value, because anything prefixed for the browser is public.",
        "Move it to a server-only variable and read it inside a server route.",
        "Have the client call your own endpoint instead of the third-party API directly.",
      ],
      example: {
        before: `VITE_API_SECRET="<server-key>"`,
        after: `# .env (server only)
API_SECRET="<server-key>"
# the client calls POST /api/proxy instead`,
      },
      falsePositive:
        "Publishable and anon keys are designed for the browser, so those are fine here. Server and service keys never are.",
      rotateFirst: true,
      reference: CWE_HARDCODED,
    },
  },
  {
    test: (check, title) => check === "secrets" && title.includes("hardcoded:"),
    meta: {
      id: "secrets/hardcoded-credential",
      label: "Hardcoded credential in source",
      category: "Security",
      steps: [
        "Rotate the credential at the provider that issued it.",
        "Move the value into an environment variable and read it at runtime.",
        "Add that env file to .gitignore and check the git history for the old value.",
      ],
      example: {
        before: `const client = new Stripe("your_secret_key_here")`,
        after: `const client = new Stripe(process.env.STRIPE_SECRET_KEY!)`,
      },
      falsePositive:
        "Publishable keys are meant to ship to the browser. If this string is one of those, it is safe.",
      rotateFirst: true,
      reference: CWE_HARDCODED,
    },
  },

  // --------------------------------------------------------------- database
  {
    test: (check, title) =>
      check === "supabase" && title.includes("fine if this table is meant to be public"),
    meta: {
      id: "supabase/open-read-policy-public",
      label: "Open read policy on a table",
      category: "Security",
      steps: [
        "Decide whether this table holds public content or private rows.",
        "If it is private, replace the open check with an ownership check such as auth.uid() = user_id.",
        "Re-run the scan to confirm the policy is gone.",
      ],
      example: {
        before: `CREATE POLICY "read_all" ON public.profiles
  FOR SELECT USING (true);`,
        after: `CREATE POLICY "read_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);`,
      },
      falsePositive:
        "This is the most common false positive in GuardRail: tables like posts, products or categories are meant to be readable by everyone.",
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("allows all reads"),
    meta: {
      id: "supabase/open-read-policy",
      label: "Policy lets every row be read",
      category: "Security",
      steps: [
        "Replace USING (true) with a condition that names the owner of the row.",
        "Check every column the policy touches still exists.",
        "Re-run the scan to confirm the policy no longer matches.",
      ],
      example: {
        before: `USING (true)`,
        after: `USING (auth.uid() = user_id)`,
      },
      falsePositive:
        "Fine when the table only holds public content. Look at what the table stores before changing it.",
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("allows all writes"),
    meta: {
      id: "supabase/open-write-policy",
      label: "Policy lets every row be written",
      category: "Security",
      steps: [
        "Replace WITH CHECK (true) with an ownership check.",
        "Confirm inserts and updates still work for a signed-in user.",
        "Re-run the scan.",
      ],
      example: {
        before: `WITH CHECK (true)`,
        after: `WITH CHECK (auth.uid() = user_id)`,
      },
      falsePositive:
        "Intentional for a public inbox or a waitlist table. Anything tied to a person should not use it.",
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("public storage bucket"),
    meta: {
      id: "supabase/public-storage-bucket",
      label: "Public storage bucket",
      category: "Security",
      steps: [
        "Set the bucket to private unless the files are meant to be world-readable.",
        "Serve private files through signed URLs with a short lifetime.",
        "Re-run the scan.",
      ],
      example: {
        before: `INSERT INTO storage.buckets (id, public) VALUES ('documents', true);`,
        after: `INSERT INTO storage.buckets (id, public) VALUES ('documents', false);`,
      },
      falsePositive:
        "Avatars, logos and marketing images are often public on purpose. Contracts and IDs are not.",
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("created without row level security"),
    meta: {
      id: "supabase/table-without-rls",
      label: "Table without Row Level Security",
      category: "Security",
      steps: [
        "Enable Row Level Security on the table.",
        "Add at least one policy for the operations the app actually performs.",
        "Re-run the scan to confirm both the table and the policies are detected.",
      ],
      example: {
        before: `CREATE TABLE public.notes (
  id uuid PRIMARY KEY,
  user_id uuid
);`,
        after: `CREATE TABLE public.notes (
  id uuid PRIMARY KEY,
  user_id uuid
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;`,
      },
      falsePositive:
        "RLS is unnecessary for tables that are never exposed through the Supabase API, such as a private schema used by server jobs.",
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("has rls enabled but no policies"),
    meta: {
      id: "supabase/rls-without-policy",
      label: "RLS enabled but no policies",
      category: "Security",
      steps: [
        "Add a policy for each operation the app uses (select, insert, update, delete).",
        "Start with own-row access, then widen only where needed.",
        "Re-run the scan.",
      ],
      example: {
        before: `ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
-- no policies yet`,
        after: `ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);`,
      },
      falsePositive:
        "A table with RLS and no policies is locked for everyone, so it fails closed. It breaks the app rather than leaking data.",
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("without filter"),
    meta: {
      id: "supabase/unfiltered-mutation",
      label: "Unfiltered delete or update",
      category: "Security",
      steps: [
        "Add a filter that targets a single row, such as .eq('id', id).",
        "Run the statement against a test row before shipping it.",
        "Re-run the scan.",
      ],
      example: {
        before: `await supabase.from('notes').delete()`,
        after: `await supabase.from('notes').delete().eq('id', noteId)`,
      },
      falsePositive:
        "A deliberate bulk clean-up is fine, but it belongs in a migration or a server job, not in app code that runs per request.",
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("service_role key used in client code"),
    meta: {
      id: "supabase/service-role-client",
      label: "Service-role key in client code",
      category: "Security",
      steps: [
        "Rotate the key in Supabase.",
        "Create the client with the anon key and let RLS decide what a user may read.",
        "Move anything that needs elevated access into a server route.",
      ],
      example: {
        before: `const supabase = createClient(url, "<service-role-key>")`,
        after: `const supabase = createClient(url, import.meta.env.VITE_SUPABASE_ANON_KEY)`,
      },
      falsePositive:
        "A file named for the server (route handler, edge function) is not client code. Check where the file is bundled before changing it.",
      rotateFirst: true,
      reference: CWE_HARDCODED,
    },
  },
  {
    test: (check, title) => check === "supabase" && title.includes("admin status determined in client code"),
    meta: {
      id: "supabase/client-side-admin",
      label: "Admin status decided in the browser",
      category: "Security",
      steps: [
        "Move the admin check to the server, either in RLS policies or in a route handler.",
        "Keep the client check only as a UI nicety.",
        "Re-run the scan.",
      ],
      example: {
        before: `const isAdmin = localStorage.getItem('isAdmin') === 'true'`,
        after: `CREATE POLICY "admins_only" ON sensitive_table
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));`,
      },
      falsePositive:
        "Hiding a button is fine. The finding matters when that flag is what actually gates the data.",
    },
  },

  // ---------------------------------------------------------------- quality
  {
    test: (check, title) => check === "quality" && title.includes("lines (over 500)"),
    meta: {
      id: "quality/large-file",
      label: "Large file",
      category: "Quality",
      steps: [
        "Find the responsibilities inside the file.",
        "Extract the components, hooks or helpers into their own files.",
        "Keep behaviour identical and re-run the scan.",
      ],
      example: {
        before: `// one 900-line component file`,
        after: `components/chart.tsx
hooks/use-series.ts
lib/format.ts`,
      },
      falsePositive:
        "Generated files or a single dense data table can be legitimately long. Size alone is a hint, not a defect.",
    },
  },
  {
    test: (check, title) => check === "quality" && title.includes("console.log left in source code"),
    meta: {
      id: "quality/console-log",
      label: "Debug logging left in code",
      groupLabel: "Debug logging left in code",
      groupUnit: "places",
      category: "Quality",
      steps: [
        "Remove the debug statement, or replace it with a logger that respects log levels.",
        "Search the repository for other debug calls while you are there.",
        "Re-run the scan.",
      ],
      example: {
        before: `console.log('user', user)`,
        after: `logger.debug('user loaded', { id: user.id })`,
      },
      falsePositive:
        "A deliberate log line in a CLI script or an error path is fine. This is a tidiness finding.",
    },
  },
  {
    test: (check, title) => check === "quality" && title.includes("comment in source code"),
    meta: {
      id: "quality/todo-comment",
      label: "TODO or FIXME marker",
      groupLabel: "TODO and FIXME markers",
      groupUnit: "places",
      category: "Quality",
      steps: [
        "Either finish the work now or open a ticket.",
        "Reference the ticket from the comment so it can be found again.",
        "Remove the markers that no longer apply.",
      ],
      example: {
        before: `// TODO: handle the error case`,
        after: `// TODO #142: handle the error case`,
      },
      falsePositive:
        "None of these are security issues. They are notes that tend to get lost.",
    },
  },
  {
    test: (check, title) => check === "quality" && title.includes("heavy package"),
    meta: {
      id: "quality/heavy-package",
      label: "Heavy dependency",
      category: "Quality",
      steps: [
        "Check whether the package is still used at all.",
        "Swap it for a smaller equivalent, or use the platform APIs.",
        "Measure the bundle before and after.",
      ],
      example: {
        before: `"moment": "^2.30.1"`,
        after: `"date-fns": "^4.1.0"`,
      },
      falsePositive:
        "A heavy package used on the server only does not reach the browser bundle, so the size cost does not apply.",
    },
  },
  {
    test: (check, title) => check === "quality" && title.includes("never imported in source code"),
    meta: {
      id: "quality/unused-dependency",
      label: "Unused dependency",
      groupLabel: "Unused dependency",
      groupUnit: "packages",
      category: "Quality",
      steps: [
        "Confirm nothing in the app, the scripts or the build config imports it.",
        "Uninstall it.",
        "Run the build to make sure nothing depended on it implicitly.",
      ],
      example: {
        before: `"dependencies": { "left-pad": "^1.3.0" }`,
        after: `"dependencies": {}`,
      },
      falsePositive:
        "Packages loaded only by a build plugin, a type declaration or a dynamic import can look unused. Check the config before removing.",
    },
  },
  {
    test: (check, title) => check === "quality" && title.includes("in both dependencies and devdependencies"),
    meta: {
      id: "quality/duplicate-dependency",
      label: "Dependency listed twice",
      category: "Quality",
      steps: [
        "Decide whether the package is needed at runtime or only during development.",
        "Remove it from the other list.",
        "Reinstall and run the build.",
      ],
      example: {
        before: `"dependencies": { "vitest": "^3.0.0" },
"devDependencies": { "vitest": "^3.0.0" }`,
        after: `"devDependencies": { "vitest": "^3.0.0" }`,
      },
      falsePositive:
        "A monorepo with separate runtime and build entry points can legitimately list the same package twice.",
    },
  },
  {
    test: (check, title) => check === "quality" && title.includes("orphan file"),
    meta: {
      id: "quality/orphan-files",
      label: "Files nothing imports",
      category: "Quality",
      steps: [
        "Check whether the file is loaded dynamically, by a route convention or by a test.",
        "Delete it if it is genuinely dead.",
        "Re-run the scan to confirm.",
      ],
      example: {
        before: `src/old-dashboard.tsx   // nothing imports it`,
        after: `// deleted, or imported where it belongs`,
      },
      falsePositive:
        "Files picked up by a framework convention (routes, middleware, instrumentation) are often not imported explicitly.",
    },
  },
];

const FALLBACK: Omit<RuleMeta, "id" | "label" | "category"> = {
  steps: [],
  example: {
    before: `// the code the rule matched`,
    after: `// the corrected version`,
  },
  falsePositive:
    "Read the explanation against the file before changing anything. Automated checks sometimes flag code that is already safe.",
};

export function categoryForCheck(check: string | undefined): Category {
  return check === "quality" ? "Quality" : "Security";
}

export function describeRule(check: string | undefined, title: string): RuleMeta {
  const normalizedCheck = (check ?? "").toLowerCase();
  const haystack = title.toLowerCase();

  for (const entry of RULES) {
    if (entry.test(normalizedCheck, haystack)) return entry.meta;
  }

  return {
    ...FALLBACK,
    id: `${normalizedCheck || "other"}/other`,
    label: title.length > 80 ? `${title.slice(0, 77)}…` : title,
    category: categoryForCheck(normalizedCheck),
  };
}

export const CHECK_LABELS: Record<string, string> = {
  secrets: "Secrets",
  supabase: "Database rules",
  quality: "Code quality",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const SEVERITY_RANK: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const STATUS_RANK: Record<FindingStatus, number> = {
  new: 0,
  open: 1,
  fixed: 2,
};

/** Lowercase, collapse whitespace, drop a trailing line reference. */
export function normalizeMessage(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+at\s+(line\s+)?\d+\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable identity for a finding across scans: rule + file + message, with the
 * line number deliberately excluded so moving code does not look like a fix.
 */
export function fingerprintOf(ruleId: string, file: string, title: string): string {
  const input = `${ruleId}|${file}|${normalizeMessage(title)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** One plain sentence about the result, generated from the counts. */
export function summarySentence(counts: {
  high: number;
  medium: number;
  low: number;
}): string {
  const { high, medium, low } = counts;
  const total = high + medium + low;

  if (total === 0) {
    return "No issues found. Nothing to fix before you ship.";
  }

  const parts: string[] = [];
  if (high > 0) {
    parts.push(`${high} serious ${plural(high, "issue", "issues")} to fix first`);
  } else {
    parts.push("No serious issues");
  }

  const rest = medium + low;
  if (rest > 0) {
    parts.push(`${rest} smaller ${plural(rest, "cleanup", "cleanups")}`);
  }

  return `${parts.join(", ")}.`;
}

/** The existing static single-finding prompt, unchanged in substance. */
export function staticFixPrompt(finding: FindingReportItem): string {
  return `In ${finding.file} at line ${finding.line}: ${finding.title}. ${finding.fix}. Please make this exact fix and explain the changes made.`;
}

/** The existing static all-findings prompt, unchanged in substance. */
export function staticAllFindingsPrompt(
  findings: ReportFinding[],
  repoName: string,
): string {
  return [
    `Review and fix all ${findings.length} findings for ${repoName}:`,
    "",
    ...findings.map(
      (f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.file}:${f.line} - ${f.title}\n   Fix: ${f.fix}`,
    ),
    "",
    "Please apply these code fixes systematically and explain each change.",
  ].join("\n");
}

/** Sort findings the way the report lists them: severity, then rule, then path. */
export function sortFindings(findings: ReportFinding[]): ReportFinding[] {
  return [...findings].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    const byRule = describeRule(a.check, a.title).label.localeCompare(
      describeRule(b.check, b.title).label,
    );
    if (byRule !== 0) return byRule;
    return a.file.localeCompare(b.file) || a.line - b.line;
  });
}
