"use client";

import { useState } from "react";

interface FixPromptGeneratorProps {
  scanId: string;
  findingIds: string[];
  mode: "single" | "all";
  isAiGlobalEnabled: boolean;
  userOptIn: boolean;
  staticPrompt: string;
}

export function FixPromptGenerator({
  scanId,
  findingIds,
  mode,
  isAiGlobalEnabled,
  userOptIn,
  staticPrompt,
}: FixPromptGeneratorProps) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [usedAI, setUsedAI] = useState(false);

  const generatePrompt = async () => {
    if (!isAiGlobalEnabled || !userOptIn) {
      setPrompt(staticPrompt);
      setTitle(mode === "all" ? "Fix all findings" : "Fix finding");
      setUsedAI(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/fix-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          findingIds,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Your session expired. Refresh the page and try again.");
          setPrompt(staticPrompt);
          setUsedAI(false);
        } else if (data.limitReached) {
          setError(data.error);
          setPrompt(staticPrompt);
          setUsedAI(false);
        } else {
          setError(data.error || "Failed to generate prompt");
          setPrompt(staticPrompt);
          setUsedAI(false);
        }
        return;
      }

      setPrompt(data.prompt);
      setTitle(data.title);
      setWarnings(data.warnings || []);
      setUsedAI(data.usedAI);
    } catch (err) {
      setError("Network error. Using static prompt.");
      setPrompt(staticPrompt);
      setUsedAI(false);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!prompt) {
    return (
      <button
        type="button"
        onClick={generatePrompt}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fg)] hover:opacity-90 text-[var(--bg)] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--bg)] border-t-transparent" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Generate fix prompt</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <h4 className="text-sm font-medium text-[var(--fg)]">{title}</h4>
      )}
      
      {warnings.length > 0 && (
        <div className="rounded-lg border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-3">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-[var(--squiggle-red)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-[var(--squiggle-red)]">Important warnings:</p>
              <ul className="mt-1 space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-xs text-[var(--squiggle-red)]">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
        <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--fg)] leading-relaxed select-all">
          {prompt}
        </pre>
      </div>

      {error && (
        <p className="text-xs text-[var(--squiggle-amber)]">
          {error} Showing static prompt instead.
        </p>
      )}

      <div className="flex items-center justify-between">
        {usedAI && (
          <span className="text-xs text-[var(--muted)]">
            ✨ Generated with AI
          </span>
        )}
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fg)] hover:opacity-90 text-[var(--bg)] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ml-auto"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>{copied ? "✓ Copied" : "Copy prompt"}</span>
        </button>
      </div>
    </div>
  );
}
