"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
  initialOptIn: boolean;
  optedInAt: string | null;
  aiEnabledGlobal: boolean;
  emailAllowed?: boolean;
  providerName: string;
}

export function SettingsClient({
  initialOptIn,
  optedInAt,
  aiEnabledGlobal,
  emailAllowed = true,
  providerName,
}: SettingsClientProps) {
  const router = useRouter();
  const [optIn, setOptIn] = useState(initialOptIn);
  const [savedAt, setSavedAt] = useState<string | null>(optedInAt);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isToggleDisabled = !aiEnabledGlobal || !emailAllowed || isSaving;

  const handleToggle = async (newValue: boolean) => {
    // 1. Optimistic update immediately
    const prevOptIn = optIn;
    const prevSavedAt = savedAt;
    setOptIn(newValue);
    setToast(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/ai/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update setting.");
      }

      setOptIn(data.userOptIn);
      setSavedAt(data.optedInAt);
      setToast({
        message: newValue ? "AI explanations enabled." : "AI explanations disabled.",
        type: "success",
      });

      // Refresh server components / route data so state is synced everywhere
      router.refresh();
    } catch (err: unknown) {
      // 2. Roll back on failure with error toast
      setOptIn(prevOptIn);
      setSavedAt(prevSavedAt);
      const errMsg = err instanceof Error ? err.message : "Network error. Please try again.";
      setToast({
        message: errMsg,
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
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
                {!aiEnabledGlobal ? (
                  <span className="text-[10px] font-mono uppercase bg-[var(--surface-subtle)] text-[var(--muted)] px-2 py-0.5 rounded border border-[var(--border)]">
                    Service disabled on server
                  </span>
                ) : !emailAllowed ? (
                  <span className="text-[10px] font-mono uppercase bg-[var(--surface-subtle)] text-[var(--muted)] px-2 py-0.5 rounded border border-[var(--border)]">
                    Not available for this account
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[var(--muted)] max-w-xl leading-relaxed">
                When enabled, you can optionally request AI explanations, use the AI chat assistant, and generate AI fix prompts for scan findings.
                Redacted snippets of your code and redacted chat messages are sent to {providerName} to generate responses.
                Chat conversations are not stored by Guardrail and exist only in your browser session.
                AI is advisory only: it never alters scan scores or severities.
              </p>
              {!aiEnabledGlobal ? (
                <p className="text-xs text-amber-500/90 font-medium pt-1">
                  AI is disabled on this server.
                </p>
              ) : !emailAllowed ? (
                <p className="text-xs text-amber-500/90 font-medium pt-1">
                  AI isn&apos;t available for this account yet.
                </p>
              ) : null}
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isToggleDisabled}
                  checked={optIn}
                  onChange={(e) => handleToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-[var(--surface-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--cleared-green)] border border-[var(--border)] ${isToggleDisabled ? "opacity-50 cursor-not-allowed" : ""}`}></div>
              </label>
            </div>
          </div>

          {savedAt && optIn && (
            <p className="text-[11px] font-mono text-[var(--muted)] border-t border-[var(--border-subtle)] pt-3">
              Enabled on {new Date(savedAt).toLocaleDateString()} at {new Date(savedAt).toLocaleTimeString()}
            </p>
          )}

          {toast && (
            <div
              role="alert"
              className={`flex items-center justify-between text-xs font-medium p-3 rounded-lg border ${
                toast.type === "error"
                  ? "bg-red-950/70 text-red-200 border-red-500/40"
                  : "bg-[var(--surface-subtle)] text-[var(--fg)] border-[var(--border)]"
              }`}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="ml-3 underline underline-offset-2 opacity-75 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
