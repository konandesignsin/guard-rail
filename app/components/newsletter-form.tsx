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
        Thanks — we will email you when new checks launch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
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
        className="w-40 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--fg)] placeholder:text-[var(--muted-subtle)] outline-none focus:border-[var(--muted)] transition-colors"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
      >
        Notify me
      </button>
    </form>
  );
}
