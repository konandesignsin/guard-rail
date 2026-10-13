import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { scans, findings, scanFiles } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { audit, type FileInput } from "@/lib/guardrail";

const sampleLeakyProject: FileInput[] = [
  {
    path: "src/lib/supabase.ts",
    content: `import { createClient } from "@supabase/supabase-js";

// Leaked service_role secret key in frontend client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xyzexample.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eiIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2ODAwMDAwMDB9.sample_signature_bypass_key"
);
`,
  },
  {
    path: "supabase/migrations/20240101_initial_schema.sql",
    content: `-- User profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  stripe_customer_id text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Flawed open policy
CREATE POLICY "allow_all_profiles" ON public.profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);
`,
  },
  {
    path: "app/api/webhook/stripe/route.ts",
    content: `import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Vulnerability: JSON parsed directly without cryptographic signature check
  const event = await req.json();

  if (event.type === "checkout.session.completed") {
    // grant subscription
  }

  return NextResponse.json({ received: true });
}
`,
  },
  {
    path: "src/utils/auth-token.ts",
    content: `export function getClientToken() {
  return localStorage.getItem("auth_token");
}
`,
  },
  {
    path: "package.json",
    content: `{
  "name": "sample-leaky-project",
  "version": "1.0.0",
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "next": "^14.0.0",
    "react": "^18.2.0"
  }
}
`,
  },
];

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "You must be signed in to run an example." }, { status: 401 });
    }

    const user = await getOrCreateUser();

    // Check if user already has an "Example project" scan
    const [existingExample] = await db
      .select({ id: scans.id })
      .from(scans)
      .where(and(eq(scans.userId, user.id), eq(scans.repoName, "Example project"), eq(scans.status, "done")))
      .limit(1);

    if (existingExample) {
      return NextResponse.json({ scanId: existingExample.id });
    }

    // Create scan record labeled "Example project" (does NOT count towards daily limit)
    const [scanRow] = await db
      .insert(scans)
      .values({
        userId: user.id,
        source: "url",
        repoName: "Example project",
        status: "running",
      })
      .returning();

    // Run audit on in-memory leaky sample project
    const result = audit(sampleLeakyProject);

    // Save metadata ONLY (path, bytes, findingCount) - Never store code content!
    const fileFindingCounts: Record<string, number> = {};
    for (const f of result.findings) {
      fileFindingCounts[f.file] = (fileFindingCounts[f.file] || 0) + 1;
    }

    const textEncoder = new TextEncoder();
    const fileRecords = sampleLeakyProject.map((file) => ({
      scanId: scanRow.id,
      path: file.path,
      bytes: textEncoder.encode(file.content || "").length,
      findingCount: fileFindingCounts[file.path] || 0,
    }));

    await db.insert(scanFiles).values(fileRecords);

    // Save findings
    if (result.findings.length > 0) {
      await db.insert(findings).values(
        result.findings.map((f) => ({
          scanId: scanRow.id,
          severity: f.severity,
          check: f.check,
          title: f.title,
          explanation: f.explanation,
          fix: f.fix,
          file: f.file,
          line: f.line,
        }))
      );
    }

    // Update scan status
    await db
      .update(scans)
      .set({ status: "done", score: result.score })
      .where(eq(scans.id, scanRow.id));

    return NextResponse.json({ scanId: scanRow.id });
  } catch (err: unknown) {
    console.error("Example scan error:", err);
    return NextResponse.json(
      { error: "Could not create example scan. Please try again." },
      { status: 500 }
    );
  }
}
