import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import { CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE, OWNER_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Security | GuardRail",
  description: "How GuardRail handles security, in-memory scanning, and vulnerability disclosure.",
};

const sectionHeading = "font-display text-xl font-medium text-[var(--fg)]";

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      description={`Security architecture, data handling, and vulnerability disclosure for GuardRail, operated by ${OWNER_NAME}.`}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    >
      <section>
        <h2 className={sectionHeading}>In-Memory Processing</h2>
        <p className="mt-3">
          Security is built into GuardRail’s core design. Repository analysis reads code files in-memory to evaluate static AST and regex rules. We store finding metadata and line references, never your raw codebase or proprietary files.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Redaction &amp; Privacy</h2>
        <p className="mt-3">
          If you choose to use optional AI explanations, code snippets are thoroughly redacted on the server before dispatch. Any recognized token patterns, key formats, or personal identifiers are masked with placeholder tokens.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Open Source GitHub Action</h2>
        <p className="mt-3">
          The GuardRail GitHub Action runs within your own GitHub Actions execution environment. For private repositories or sensitive pipelines, all scanning happens locally inside your runner without dispatching code to external servers.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Vulnerability Disclosure</h2>
        <p className="mt-3">
          We welcome security researchers and community feedback. If you discover a vulnerability or security flaw in GuardRail, please report it directly to <a className="text-[var(--fg)] underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We respond promptly and investigate all reports responsibly.
        </p>
      </section>
    </LegalPage>
  );
}
