import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { requireEnv } from "@/lib/env";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
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
