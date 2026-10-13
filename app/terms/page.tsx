import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import {
  CONTACT_EMAIL,
  GOVERNING_LAW,
  LEGAL_EFFECTIVE_DATE,
  OWNER_NAME,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | Guardrail",
  description: "The terms that apply when you access or use Guardrail.",
};

const sectionHeading = "font-display text-xl font-medium text-[var(--fg)]";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description={`These terms apply when you access or use Guardrail, operated by ${OWNER_NAME}.`}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    >
      <nav aria-label="Table of contents" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-medium text-[var(--fg)]">Contents</h2>
        <ol className="mt-3 grid gap-1.5 font-mono text-xs sm:grid-cols-2">
          <li><a href="#eligibility" className="hover:text-[var(--fg)]">1. Eligibility</a></li>
          <li><a href="#authorized-use" className="hover:text-[var(--fg)]">2. Authorized code only</a></li>
          <li><a href="#service" className="hover:text-[var(--fg)]">3. Service provided as is</a></li>
          <li><a href="#liability" className="hover:text-[var(--fg)]">4. Limitation of liability</a></li>
          <li><a href="#termination" className="hover:text-[var(--fg)]">5. Termination</a></li>
          <li><a href="#law" className="hover:text-[var(--fg)]">6. Governing law</a></li>
          <li><a href="#contact" className="hover:text-[var(--fg)]">7. Contact</a></li>
        </ol>
      </nav>

      <section id="eligibility" className="scroll-mt-20">
        <h2 className={sectionHeading}>1. Eligibility</h2>
        <p className="mt-3">You must be at least 18 years old to use Guardrail.</p>
      </section>

      <section id="authorized-use" className="scroll-mt-20">
        <h2 className={sectionHeading}>2. Authorized code only</h2>
        <p className="mt-3">
          You may scan only code that you own or that you have clear permission to scan. You are responsible for confirming that permission before submitting a repository or code.
        </p>
      </section>

      <section id="service" className="scroll-mt-20">
        <h2 className={sectionHeading}>3. Service provided as is</h2>
        <p className="mt-3">
          Guardrail is provided as is. The service may not identify every issue, and its availability or results are not guaranteed.
        </p>
      </section>

      <section id="liability" className="scroll-mt-20">
        <h2 className={sectionHeading}>4. Limitation of liability</h2>
        <p className="mt-3">
          To the extent permitted by applicable law, {OWNER_NAME} is not liable for loss or damage arising from your use of, inability to use, or reliance on Guardrail or its results.
        </p>
      </section>

      <section id="termination" className="scroll-mt-20">
        <h2 className={sectionHeading}>5. Termination</h2>
        <p className="mt-3">
          Access may be suspended or terminated if you violate these terms or the Acceptable Use Policy. You may stop using Guardrail at any time.
        </p>
      </section>

      <section id="law" className="scroll-mt-20">
        <h2 className={sectionHeading}>6. Governing law</h2>
        <p className="mt-3">These terms are governed by the {GOVERNING_LAW}.</p>
      </section>

      <section id="contact" className="scroll-mt-20">
        <h2 className={sectionHeading}>7. Contact</h2>
        <p className="mt-3">
          Questions about these terms may be sent to <a className="text-[var(--fg)] underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
