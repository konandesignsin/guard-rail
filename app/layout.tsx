import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { requireEnv } from "@/lib/env";
import "./globals.css";

const bricolageGrotesque = localFont({
  src: "./fonts/BricolageGrotesque.ttf",
  variable: "--font-bricolage",
  display: "swap",
});

const instrumentSans = localFont({
  src: "./fonts/InstrumentSans.ttf",
  variable: "--font-instrument",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono.ttf",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "guardrail — security spell-checker for AI-built apps",
  description:
    "Check apps built with Lovable and Bolt for leaked secrets, open database rules, and messy code with plain-English notes and exact fixes.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "guardrail — security spell-checker for AI-built apps",
    description:
      "Find leaked keys, wide-open database tables, and messy code in your AI-built applications with instant in-browser checks.",
    siteName: "guardrail",
  },
  twitter: {
    card: "summary_large_image",
    title: "guardrail — security spell-checker for AI-built apps",
    description:
      "Find leaked keys, wide-open database tables, and messy code in your AI-built applications with instant in-browser checks.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--squiggle-red-subtle)] selection:text-[var(--fg)]">
        <ClerkProvider
          publishableKey={requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
