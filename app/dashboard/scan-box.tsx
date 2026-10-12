"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TabId = "github" | "zip" | "repos";

const sampleFiles = [
  "src/lib/supabase.ts",
  "src/components/auth-modal.tsx",
  "supabase/migrations/001_schema.sql",
  "src/pages/api/webhook.ts",
  "src/utils/stripe.ts",
  "package.json",
  "src/hooks/useSession.ts",
  "src/services/database.ts",
  "supabase/policies/profiles.sql",
];

export function ScanBox() {
  const [activeTab, setActiveTab] = useState<TabId>("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // File names ticking by when scanning indicator is active
  useEffect(() => {
    if (!isSimulatingScan) return;
    const interval = setInterval(() => {
      setCurrentFileIndex((prev) => (prev + 1) % sampleFiles.length);
    }, 450);
    return () => clearInterval(interval);
  }, [isSimulatingScan]);

  function handleUrlChange(val: string) {
    setRepoUrl(val);
    if (val && !val.includes("github.com/")) {
      setUrlError("URL must begin with https://github.com/owner/repository");
    } else {
      setUrlError("");
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4">
        <button
          type="button"
          onClick={() => setActiveTab("github")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] ${
            activeTab === "github"
              ? "border-[var(--ink)] text-[var(--ink)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          GitHub link
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("zip")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] ${
            activeTab === "zip"
              ? "border-[var(--ink)] text-[var(--ink)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          Upload zip
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("repos")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] ${
            activeTab === "repos"
              ? "border-[var(--ink)] text-[var(--ink)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          My GitHub repos
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {activeTab === "github" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="repo-url" className="block text-xs font-semibold text-[var(--ink)]">
                Repository URL
              </label>
              <input
                id="repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://github.com/username/project"
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted-light)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)]"
              />
              {urlError ? (
                <p className="mt-1.5 text-xs text-[var(--squiggle-red)] font-medium">
                  {urlError}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  Public repositories only. For private repos, use the &quot;My GitHub repos&quot; tab.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--muted-light)]"
              >
                Scanning is coming soon
              </button>

              <button
                type="button"
                onClick={() => setIsSimulatingScan(!isSimulatingScan)}
                className="text-xs text-[var(--link-blue)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isSimulatingScan ? "Hide scan simulator" : "Preview scanning indicator"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "zip" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:bg-[var(--surface-subtle)] transition-colors">
              <svg
                className="mx-auto h-8 w-8 text-[var(--muted-light)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
              <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                Drag and drop your project .zip file here
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Exported from Lovable, Bolt, or v0. Maximum archive size 50 MB.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--muted-light)]"
              >
                Scanning is coming soon
              </button>

              <button
                type="button"
                onClick={() => setIsSimulatingScan(!isSimulatingScan)}
                className="text-xs text-[var(--link-blue)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isSimulatingScan ? "Hide scan simulator" : "Preview scanning indicator"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "repos" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="repo-select" className="block text-xs font-semibold text-[var(--ink)]">
                Choose a repository from your GitHub account
              </label>
              <select
                id="repo-select"
                disabled
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3.5 py-2.5 text-sm text-[var(--muted-light)] outline-none"
              >
                <option>GitHub integration is coming soon</option>
              </select>
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                Connecting GitHub will allow continuous checking whenever you push new branches.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--muted-light)]"
              >
                Scanning is coming soon
              </button>

              <button
                type="button"
                onClick={() => setIsSimulatingScan(!isSimulatingScan)}
                className="text-xs text-[var(--link-blue)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isSimulatingScan ? "Hide scan simulator" : "Preview scanning indicator"}
              </button>
            </div>
          </div>
        )}

        {/* Loading State: Scanning indicator with file names ticking by */}
        {isSimulatingScan && (
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-[var(--link-blue)] animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-[var(--ink)] font-sans">
                    Scanning application files…
                  </span>
                </div>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {currentFileIndex + 1} of {sampleFiles.length}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-[var(--link-blue)] transition-all duration-300"
                  style={{
                    width: `${((currentFileIndex + 1) / sampleFiles.length) * 100}%`,
                  }}
                />
              </div>

              {/* File name ticking by */}
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-xs text-[var(--ink)] truncate max-w-xs sm:max-w-md">
                  Checking: <span className="text-[var(--link-blue)] font-medium">{sampleFiles[currentFileIndex]}</span>
                </p>
                <Link
                  href="/dashboard/preview-report"
                  className="shrink-0 text-xs text-[var(--link-blue)] font-medium hover:underline ml-2"
                >
                  View sample report &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
