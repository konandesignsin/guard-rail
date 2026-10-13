import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import { CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE, OWNER_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | Guardrail",
  description: "The permitted and prohibited uses of Guardrail.",
};

const sectionHeading = "font-display text-xl font-medium text-[var(--fg)]";

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      description={`This policy explains the limits on acceptable use of Guardrail, operated by ${OWNER_NAME}.`}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    >
      <section>
        <h2 className={sectionHeading}>Scan only with permission</h2>
        <p className="mt-3">
          Do not submit or scan code that you do not own or do not have clear permission to scan.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Do not abuse the service</h2>
        <p className="mt-3">
          Do not misuse, disrupt, overload, or attempt to interfere with Guardrail or its supporting services.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Do not use results to attack others</h2>
        <p className="mt-3">
          Do not use scan findings, suggested fixes, or other Guardrail results to attack, compromise, or harm another person or their systems.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Questions</h2>
        <p className="mt-3">
          Questions about acceptable use may be sent to <a className="text-[var(--fg)] underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
