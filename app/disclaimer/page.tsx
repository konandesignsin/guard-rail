import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import { CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE, OWNER_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Disclaimer | Guardrail",
  description: "Important limits of Guardrail's automated security scan results.",
};

const sectionHeading = "font-display text-xl font-medium text-[var(--fg)]";

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      description={`Important information about automated results produced by Guardrail, operated by ${OWNER_NAME}.`}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    >
      <section>
        <h2 className={sectionHeading}>Automated results</h2>
        <p className="mt-3">
          Guardrail uses automated checks. Its findings and suggested fixes are generated from those checks and may not reflect every detail of your code or system.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>False positives and missed issues</h2>
        <p className="mt-3">
          Results may include false positives, and Guardrail may miss vulnerabilities, configuration problems, or other issues.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>No security guarantee</h2>
        <p className="mt-3">
          A scan result or score is not a guarantee that code is secure or free from vulnerabilities.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Not a professional audit</h2>
        <p className="mt-3">
          Guardrail is not a professional security audit and is not a substitute for review by a qualified security professional.
        </p>
      </section>

      <section>
        <h2 className={sectionHeading}>Questions</h2>
        <p className="mt-3">
          Questions about this disclaimer may be sent to <a className="text-[var(--fg)] underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
