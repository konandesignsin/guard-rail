import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { HeaderNav } from "@/app/components/header-nav";
import { SpaceHero } from "@/app/components/space-hero";
import { SmoothScroll } from "@/app/components/smooth-scroll";
import { SiteFooter } from "@/app/components/site-footer";
import { getGitHubStarCount } from "@/lib/github";

export const metadata: Metadata = {
  title: "GuardRail \u2014 Mission Control for App Security",
  description:
    "Find leaked keys and open database rules before your users do. Autonomous in-memory code radar with instant plain-English remediation.",
  openGraph: {
    title: "GuardRail \u2014 Mission Control for App Security",
    description:
      "Find leaked keys and open database rules before your users do. Autonomous in-memory code radar with instant plain-English remediation.",
  },
  twitter: {
    title: "GuardRail \u2014 Mission Control for App Security",
    description:
      "Find leaked keys and open database rules before your users do. Autonomous in-memory code radar with instant plain-English remediation.",
  },
};

// Lazy-load below-the-fold sections
const BrandShowcase = dynamic(
  () => import("@/app/components/brand-showcase").then((mod) => mod.BrandShowcase),
  {
    loading: () => <div className="h-[700px] w-full bg-[#040508]" />,
  }
);

const MissionLiveScannerStage = dynamic(
  () => import("@/app/components/mission-live-scanner-stage").then((mod) => mod.MissionLiveScannerStage),
  {
    loading: () => <div className="h-96 w-full bg-[#08090d] animate-pulse" />,
  }
);

const BrowserScanner = dynamic(
  () => import("@/app/components/browser-scanner").then((mod) => mod.BrowserScanner),
  {
    loading: () => <div className="h-80 w-full bg-[#08090d] animate-pulse" />,
  }
);

const TrustSection = dynamic(
  () => import("@/app/components/trust-section").then((mod) => mod.TrustSection),
  {
    loading: () => <div className="h-64 w-full bg-[#08090d] animate-pulse" />,
  }
);

const ActionSection = dynamic(
  () => import("@/app/components/action-section").then((mod) => mod.ActionSection),
  {
    loading: () => <div className="h-80 w-full bg-[#08090d] animate-pulse" />,
  }
);

const PricingAndFaqSection = dynamic(
  () => import("@/app/components/pricing-faq-section").then((mod) => mod.PricingAndFaqSection),
  {
    loading: () => <div className="h-80 w-full bg-[#08090d] animate-pulse" />,
  }
);

const FinalMissionCta = dynamic(
  () => import("@/app/components/final-mission-cta").then((mod) => mod.FinalMissionCta),
  {
    loading: () => <div className="h-64 w-full bg-[#08090d] animate-pulse" />,
  }
);

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GuardRail",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cloud, In-browser, GitHub Actions",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Mission Control for app security: spots leaked API keys and misconfigured database rules before deployment.",
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#040508] text-[#ededf0] selection:bg-[#e5484d]/20 selection:text-[#ededf0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SmoothScroll />

      <HeaderNav
        authSlot={
          <Suspense
            fallback={
              <div className="h-7 w-28 rounded-full bg-[#161822] animate-pulse" aria-hidden="true" />
            }
          >
            <NavAuthButtons />
          </Suspense>
        }
      />

      <main className="relative z-10 flex-1">
        <SpaceHero
          authButtons={
            <Suspense
              fallback={
                <div className="h-11 w-36 rounded-full bg-[#161822] animate-pulse" aria-hidden="true" />
              }
            >
              <HeroAuthButtons />
            </Suspense>
          }
        />

        {/* 2. BRAND SHOWCASE: 3D GuardRail logo */}
        <BrandShowcase />

        <MissionLiveScannerStage />

        <section id="demo" className="py-24 bg-[#08090d] border-t border-[#222634]">
          <div className="max-w-6xl mx-auto px-6">
            <header className="max-w-2xl mb-12">
              <span className="font-mono text-xs uppercase tracking-wider text-[#e5484d] font-semibold">
                Interactive Radar Sandbox
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold text-[#ededf0]">
                Test your snippets in-browser
              </h2>
              <p className="mt-3 text-base text-[#8e95a5] leading-relaxed">
                The exact static rules run in your browser client-side. Zero server uploads, zero accounts needed, instant radar telemetry.
              </p>
            </header>

            <BrowserScanner />
          </div>
        </section>

        <Suspense fallback={<TrustSection starCount={null} />}>
          <TrustSectionWithStars />
        </Suspense>

        <ActionSection />

        <PricingAndFaqSection />

        <FinalMissionCta />
      </main>

      <SiteFooter />
    </div>
  );
}

async function NavAuthButtons() {
  const user = await currentUser();

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="rounded-full border border-[#222634] bg-[#11131a] px-4 py-1.5 text-xs font-mono font-medium text-[#ededf0] transition-colors hover:bg-[#1c1f2c] hover:border-[#555c6d]"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/sign-in"
        className="px-2 py-1 text-xs font-medium text-[#8e95a5] transition-colors hover:text-[#ededf0]"
      >
        Log in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-full bg-[#ededf0] px-4 py-1.5 text-xs font-semibold text-[#08090d] shadow-sm transition-all hover:bg-white hover:scale-[1.02]"
      >
        Scan my repo
      </Link>
    </div>
  );
}

async function HeroAuthButtons() {
  const user = await currentUser();

  return (
    <Link
      href={user ? "/dashboard" : "/sign-up"}
      className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#08090d] shadow-xl transition-all hover:bg-neutral-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090d]"
    >
      {user ? "Open Mission Control" : "Scan my repo"}
    </Link>
  );
}

async function TrustSectionWithStars() {
  const starCount = await getGitHubStarCount();
  return <TrustSection starCount={starCount} />;
}
