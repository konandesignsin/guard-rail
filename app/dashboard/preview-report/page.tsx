import { notFound } from "next/navigation";
import { SplitReportView, type FindingReportItem } from "@/app/dashboard/split-report-view";

const sampleFindings: FindingReportItem[] = [
  {
    id: "f1",
    severity: "high",
    title: "Leaked Supabase service_role key",
    file: "src/lib/supabase.ts",
    line: 5,
    snippetLines: [
      { num: 3, code: "export const supabase = createClient(" },
      { num: 4, code: '  "https://xyzcompany.supabase.co",' },
      {
        num: 5,
        code: '  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role_secret_key_91f"',
        isSquiggle: true,
      },
      { num: 6, code: ");" },
    ],
    explanation:
      "This administrative secret key bypasses every database Row-Level Security rule. Anyone who opens your application in a browser can view your page source, copy this key, and alter or erase all customer database tables.",
    fix: "Replace with process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY. If you require service_role privileges, execute those queries exclusively inside a server-side route or secure worker.",
  },
  {
    id: "f2",
    severity: "high",
    title: "Open database table security policy",
    file: "supabase/migrations/002_policies.sql",
    line: 14,
    snippetLines: [
      { num: 12, code: 'create policy "public_profiles_access"' },
      { num: 13, code: "on public.profiles for all" },
      {
        num: 14,
        code: "using (true) with check (true);",
        isSquiggle: true,
      },
    ],
    explanation:
      "Row-Level Security is turned on, but this policy evaluates to true for every single request. Any anonymous user on the web can query, change, or delete every row in profiles.",
    fix: "Change the policy check to verify the authenticated owner: using (auth.uid() = id) with check (auth.uid() = id);",
  },
  {
    id: "f3",
    severity: "medium",
    title: "Stripe webhook lacks signature verification",
    file: "app/api/webhooks/stripe/route.ts",
    line: 9,
    snippetLines: [
      { num: 8, code: "export async function POST(req: Request) {" },
      {
        num: 9,
        code: "  const event = await req.json();",
        isSquiggle: true,
      },
      { num: 10, code: '  if (event.type === "checkout.session.completed") {' },
    ],
    explanation:
      "The webhook route parses JSON without validating the cryptographic signature from Stripe. An attacker could send synthetic checkout completion payloads to gain free access or trigger shipments without paying.",
    fix: "Read the raw request payload buffer and execute stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET) before handling events.",
  },
];

const samplePassed = [
  "No OpenAI or Anthropic tokens exposed in frontend bundles",
  "Environment variable secrets excluded from .gitignore",
  "Database connection strictly enforces HTTPS/TLS encryption",
  "No hardcoded database passwords in migration scripts",
];

export default function PreviewReportPage() {
  if (process.env.NEXT_PUBLIC_SHOW_PREVIEW_ROUTES !== "true") {
    notFound();
  }

  return (
    <SplitReportView
      score={68}
      repoName="bolt-saas-starter (sample report)"
      subtitle="Sample security scan of 28 files"
      findings={sampleFindings}
      passedChecks={samplePassed}
      backHref="/dashboard"
    />
  );
}
