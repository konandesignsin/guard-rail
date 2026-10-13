import { RevealItem } from "@/app/components/reveal";

const FAQS = [
  {
    question: "Is my code stored?",
    answer:
      "No. The in-browser check runs entirely on your machine and never sends your snippet anywhere. Repository scans read files in memory and keep the findings, not your source.",
  },
  {
    question: "Which tools work?",
    answer:
      "Any of them. The checks read the code, not the editor, so output from Lovable, Bolt, v0, Cursor, Replit, or your own editor is treated the same. JavaScript, TypeScript, and SQL are covered today.",
  },
  {
    question: "Is it free?",
    answer:
      "Yes — free for individual developers and open-source projects. The in-browser check needs no account and no card.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-[var(--border)] py-[var(--section-y)]">
      <div className="mx-auto max-w-6xl px-6">
        <header className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-wide text-[var(--muted)] uppercase">
            Common questions
          </p>
          <h2 className="mt-3 font-display text-[length:var(--step-3)] font-light tracking-tight text-balance text-[var(--fg)]">
            The short version
          </h2>
        </header>

        <ul className="mt-10 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {FAQS.map((faq, index) => (
            <RevealItem key={faq.question} delay={index * 70}>
              <details className="group h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--muted-subtle)]">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-5 outline-offset-[-2px] [&::-webkit-details-marker]:hidden">
                  <h3 className="font-display text-base font-medium text-[var(--fg)]">{faq.question}</h3>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="faq-chevron mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] transition-transform"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--muted)]">{faq.answer}</p>
              </details>
            </RevealItem>
          ))}
        </ul>
      </div>
    </section>
  );
}
