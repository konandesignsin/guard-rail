import Link from "next/link";
import { GITHUB_REPO_URL } from "@/lib/github";

interface TrustSectionProps {
  starCount?: number | null;
}

export function TrustSection({ starCount }: TrustSectionProps) {
  const PILLARS = [
    {
      title: "Read in memory, never stored",
      description:
        "Scans analyze files in ephemeral worker memory. Finding locations and titles are reported, never your raw code or repository assets.",
      tag: "Memory Isolation",
    },
    {
      title: "Redacted before optional AI",
      description:
        "If you request an AI explanation or remediation prompt, all secret patterns and credentials are systematically masked with placeholders before transmission.",
      tag: "Data Privacy",
    },
    {
      title: "The GitHub Action is open source (MIT)",
      description:
        "Audit the entire scanner codebase on GitHub. Run it entirely inside your private CI runners without sharing secrets or code externally.",
      tag: "Open Source",
    },
  ];

  return (
    <section className="relative py-24 bg-[#08090d] border-t border-[#222634] text-[#ededf0]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <header className="max-w-xl">
            <span className="font-mono text-xs uppercase tracking-wider text-sky-400 font-semibold">
              Security &amp; Integrity
            </span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededf0]">
              Built for trust from day zero
            </h2>
            <p className="mt-3 text-base text-[#8e95a5] leading-relaxed">
              We know code is your most valuable asset. GuardRail is engineered around strict data boundaries and verifiable code.
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            {typeof starCount === "number" && (
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#222634] bg-[#11131a] px-3.5 py-1.5 text-xs font-mono text-[#ededf0] transition-colors hover:border-[#555c6d] hover:bg-[#1c1f2c]"
              >
                <svg className="h-3.5 w-3.5 text-amber-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span>GitHub Stars</span>
                <span className="rounded bg-[#222634] px-1.5 py-0.5 text-[10px] text-white font-bold">
                  {starCount}
                </span>
              </a>
            )}

            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#222634] bg-[#11131a] px-3.5 py-1.5 text-xs font-mono text-[#8e95a5] transition-colors hover:text-[#ededf0] hover:border-[#555c6d]"
            >
              Privacy Policy &rarr;
            </Link>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#222634] bg-[#11131a] px-3.5 py-1.5 text-xs font-mono text-[#8e95a5] transition-colors hover:text-[#ededf0] hover:border-[#555c6d]"
            >
              View Repository &rarr;
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-[#222634] bg-[#0c0e14] p-7 transition-all duration-300 hover:border-[#555c6d] hover:bg-[#11131a]"
            >
              <span className="rounded-full border border-[#222634] bg-[#161822] px-2.5 py-1 font-mono text-[10px] uppercase text-sky-400 font-semibold tracking-wider">
                {pillar.tag}
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-[#ededf0]">
                {pillar.title}
              </h3>
              <p className="mt-2.5 text-sm text-[#8e95a5] leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
