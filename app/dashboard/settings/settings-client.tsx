"use client";

import { useState } from "react";

interface SettingsClientProps {
  initialOptIn: boolean;
  optedInAt: string | null;
  aiEnabledGlobal: boolean;
  providerName: string;
}

export function SettingsClient({
  initialOptIn,
  optedInAt,
  aiEnabledGlobal,
  providerName,
}: SettingsClientProps) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [savedAt, setSavedAt] = useState<string | null>(optedInAt);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = async (newValue: boolean) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/ai/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newValue }),
      });

      const data = await res.json();
      if (res.ok) {
        setOptIn(data.userOptIn);
        setSavedAt(data.optedInAt);
        setMessage(newValue ? "AI explanations enabled." : "AI explanations disabled.");
      } else {
        setMessage(data.error || "Failed to update setting.");
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your account preferences and advisory security features.
        </p>
      </div>

      <div className="space-y-6">
        {/* AI Explanations section */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-[var(--fg)]">
                  AI Explanations
                </h2>
                {!aiEnabledGlobal && (
                  <span className="text-[10px] font-mono uppercase bg-[var(--surface-subtle)] text-[var(--muted)] px-2 py-0.5 rounded border border-[var(--border)]">
                    Service unavailable
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] max-w-xl leading-relaxed">
                When enabled, you can optionally request AI explanations, use the AI chat assistant, and generate AI fix prompts for scan findings.
                Redacted snippets of your code are sent to {providerName} to generate responses.
                Chat conversations are not stored by Guardrail and exist only in your browser session.
                AI is advisory only: it never alters scan scores or severities.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!aiEnabledGlobal || isSaving}
                  checked={optIn}
                  onChange={(e) => handleToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--surface-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--cleared-green)] border border-[var(--border)]"></div>
              </label>
            </div>
          </div>

          {savedAt && optIn && (
            <p className="text-[11px] font-mono text-[var(--muted)] border-t border-[var(--border-subtle)] pt-3">
              Enabled on {new Date(savedAt).toLocaleDateString()} at {new Date(savedAt).toLocaleTimeString()}
            </p>
          )}

          {message && (
            <p className="text-xs font-medium text-[var(--fg)] bg-[var(--surface-subtle)] p-2 rounded border border-[var(--border)]">
              {message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
