"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-xs text-[var(--cleared-green)] font-medium">
        Thank you. We will email you when new security checks launch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@domain.com"
        required
        className="w-full sm:w-64 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink)] placeholder:text-[var(--muted-light)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)]"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-[var(--paper)] transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)]"
      >
        Get updates
      </button>
    </form>
  );
}
