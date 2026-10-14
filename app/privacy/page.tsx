import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import {
  AI_PROVIDER_NAME,
  CONTACT_EMAIL,
  GRIEVANCE_OFFICER,
  LEGAL_EFFECTIVE_DATE,
  OWNER_NAME,
  SCAN_RETENTION_DAYS,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | Guardrail",
  description: "How Guardrail collects, uses, shares, retains, and responds to requests about personal data.",
};

const sectionHeading = "font-display text-xl font-medium text-[var(--fg)]";
const listStyle = "mt-3 list-disc space-y-2 pl-5";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description={`This policy explains how Guardrail, operated by ${OWNER_NAME}, handles personal data when you use the service.`}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    >
      <nav aria-label="Table of contents" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-medium text-[var(--fg)]">Contents</h2>
        <ol className="mt-3 grid gap-1.5 font-mono text-xs sm:grid-cols-2">
          <li><a href="#data" className="hover:text-[var(--fg)]">1. Data we collect</a></li>
          <li><a href="#purposes" className="hover:text-[var(--fg)]">2. Why we use it</a></li>
          <li><a href="#ai-explanations" className="hover:text-[var(--fg)]">3. AI explanations</a></li>
          <li><a href="#processors" className="hover:text-[var(--fg)]">4. Service processors</a></li>
          <li><a href="#retention" className="hover:text-[var(--fg)]">5. Retention</a></li>
          <li><a href="#rights" className="hover:text-[var(--fg)]">6. Your rights</a></li>
          <li><a href="#grievance" className="hover:text-[var(--fg)]">7. Grievance contact</a></li>
        </ol>
      </nav>

      <section id="data" className="scroll-mt-20">
        <h2 className={sectionHeading}>1. Data we collect</h2>
        <p className="mt-3">Guardrail may collect the following information:</p>
        <ul className={listStyle}>
          <li>Your email address and name.</li>
          <li>Repository URLs that you submit or select for scanning.</li>
          <li>Scan results, including findings, scores, and suggested fixes.</li>
        </ul>
      </section>

      <section id="purposes" className="scroll-mt-20">
        <h2 className={sectionHeading}>2. Why we use it</h2>
        <p className="mt-3">We use this information to:</p>
        <ul className={listStyle}>
          <li>Create and manage your account.</li>
          <li>Run the scans you request and show the results to you.</li>
          <li>Associate repository URLs and scan results with your account.</li>
          <li>Send service or account emails when applicable.</li>
        </ul>
      </section>

      <section id="ai-explanations" className="scroll-mt-20">
        <h2 className={sectionHeading}>3. AI explanations</h2>
        <p className="mt-3">
          AI explanations are strictly optional and disabled by default. If you choose to enable AI explanations and click &ldquo;Explain with AI&rdquo; on a finding, Guardrail sends a redacted snippet of approximately 10 lines of code surrounding the finding to {AI_PROVIDER_NAME} to produce an advisory explanation.
        </p>
        <p className="mt-3">
          The code snippet is redacted to remove common secret patterns and known sensitive values before transmission. {AI_PROVIDER_NAME} processes this snippet solely to generate the requested explanation. No full files or other repository contents leave Guardrail.
        </p>
      </section>

      <section id="processors" className="scroll-mt-20">
        <h2 className={sectionHeading}>3. Service processors</h2>
        <p className="mt-3">Guardrail uses the following services to operate:</p>
        <ul className={listStyle}>
          <li>Clerk for authentication and account access.</li>
          <li>Neon for database services.</li>
          <li>Vercel for hosting and delivery.</li>
          <li>Resend for email delivery.</li>
          <li>GitHub for repository connections and repository access that you authorize.</li>
        </ul>
      </section>

      <section id="retention" className="scroll-mt-20">
        <h2 className={sectionHeading}>4. Retention</h2>
        <p className="mt-3">
          Repository URLs and scan results are retained for up to {SCAN_RETENTION_DAYS} days. You may request deletion of your personal data by contacting us.
        </p>
      </section>

      <section id="rights" className="scroll-mt-20">
        <h2 className={sectionHeading}>5. Your rights</h2>
        <p className="mt-3">You may ask to:</p>
        <ul className={listStyle}>
          <li>Access the personal data held about you.</li>
          <li>Correct inaccurate personal data.</li>
          <li>Delete your personal data.</li>
          <li>Withdraw consent where processing depends on your consent.</li>
        </ul>
        <p className="mt-3">
          Send requests to <a className="text-[var(--fg)] underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section id="grievance" className="scroll-mt-20">
        <h2 className={sectionHeading}>6. Grievance contact</h2>
        <p className="mt-3">
          For a privacy concern or grievance, contact the grievance officer: {GRIEVANCE_OFFICER}.
        </p>
      </section>
    </LegalPage>
  );
}
