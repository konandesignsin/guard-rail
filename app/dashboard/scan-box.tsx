"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GitHubReposTab } from "@/app/components/github-repos-tab";

type TabId = "github" | "repos";

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

interface ScanBoxProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ScanBox({ inputRef }: ScanBoxProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [detectedFindingCount, setDetectedFindingCount] = useState(0);

  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setCurrentFileIndex((prev) => {
        const next = (prev + 1) % sampleFiles.length;
        if (next === 1 || next === 3 || next === 6) {
          setDetectedFindingCount((c) => c + 1);
        }
        return next;
      });
    }, 380);
    return () => clearInterval(interval);
  }, [isScanning]);

  function handleUrlChange(val: string) {
    setRepoUrl(val);
    setScanError("");
    if (val && !val.includes("github.com/")) {
      setUrlError("URL must begin with https://github.com/owner/repository");
    } else {
      setUrlError("");
    }
  }

  async function handleScan() {
    if (!repoUrl.trim()) {
      setScanError("Please enter a GitHub repository URL first.");
      return;
    }
    if (!repoUrl.includes("github.com/")) {
      setScanError("Please enter a valid GitHub URL, e.g. https://github.com/owner/repo.");
      return;
    }

    setScanError("");
    setIsScanning(true);
    setDetectedFindingCount(0);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error ?? "Could not scan repository. Please verify the URL is public.");
        setIsScanning(false);
        return;
      }

      router.push(`/dashboard/scans/${data.scanId}`);
    } catch {
      setScanError("Could not reach the scan service. Please check your connection.");
      setIsScanning(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xl">
      {/* Tab Navigation: GitHub link + My GitHub repos (Removed 'soon' upload zip tab) */}
      <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface-subtle)] px-2">
        <button
          type="button"
          onClick={() => setActiveTab("github")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono transition-colors border-b-2 -mb-px outline-none cursor-pointer ${
            activeTab === "github"
              ? "border-[var(--fg)] text-[var(--fg)] bg-[var(--surface)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>GitHub link</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("repos")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono transition-colors border-b-2 -mb-px outline-none cursor-pointer ${
            activeTab === "repos"
              ? "border-[var(--fg)] text-[var(--fg)] bg-[var(--surface)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>My GitHub repos</span>
        </button>
      </div>

      {/* Tab Panes */}
      <div className="p-5">
        {activeTab === "github" && (
          <div className="space-y-4">
            <div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 font-mono text-xs text-[var(--muted-subtle)] pointer-events-none select-none">
                  &gt;
                </span>
                <input
                  ref={inputRef}
                  id="dashboard-repo-input"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isScanning) {
                      handleScan();
                    }
                  }}
                  placeholder="https://github.com/owner/repository"
                  disabled={isScanning}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] pl-8 pr-28 py-2.5 font-mono text-xs text-[var(--fg)] placeholder:text-[var(--muted-subtle)] outline-none focus:border-[var(--muted)] focus:ring-1 focus:ring-[var(--muted)] disabled:opacity-50 transition-colors"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning}
                    className="rounded bg-[var(--fg)] hover:bg-white text-[var(--bg)] px-3 py-1 font-sans text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isScanning ? "Scanning..." : "Scan"}
                  </button>
                </div>
              </div>

              {urlError && (
                <p className="mt-2 text-xs font-mono text-[var(--squiggle-red)]">
                  {urlError}
                </p>
              )}
            </div>

            {scanError && (
              <div className="rounded-md border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] p-3 text-xs text-[var(--squiggle-red)] font-sans">
                {scanError}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1">
              <span>Public repositories only. Files are checked in memory and not stored. Optional AI explanations send a redacted snippet to the provider.</span>
              <span className="font-mono text-[var(--muted-subtle)]">Press Enter to scan</span>
            </div>
          </div>
        )}

        {activeTab === "repos" && <GitHubReposTab />}

        {/* Polished Scanning State: Beam animation over faint code lines + file ticking + live count */}
        {isScanning && (
          <div className="relative mt-4 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
            {/* Scan Beam sweep animation */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--squiggle-red)] to-transparent opacity-80"
              style={{
                animation: "scanBeam 1.8s ease-in-out infinite alternate",
              }}
            />

            {/* Faint background code lines */}
            <div className="space-y-1 opacity-20 font-mono text-[10px] select-none pointer-events-none">
              <div className="h-2 w-3/4 bg-[var(--muted)] rounded-xs" />
              <div className="h-2 w-1/2 bg-[var(--muted)] rounded-xs" />
              <div className="h-2 w-5/6 bg-[var(--muted)] rounded-xs" />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--cleared-green)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--cleared-green)]" />
                </span>
                <span className="font-mono text-[var(--fg)] font-medium">
                  Scanning repository files...
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-[var(--squiggle-red)] font-semibold">
                  {detectedFindingCount} {detectedFindingCount === 1 ? "finding" : "findings"}
                </span>
                <span className="text-[var(--muted)]">
                  {currentFileIndex + 1} / {sampleFiles.length}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full rounded-full bg-[var(--surface-subtle)] overflow-hidden">
              <div
                className="h-full bg-[var(--cleared-green)] transition-all duration-300"
                style={{
                  width: `${((currentFileIndex + 1) / sampleFiles.length) * 100}%`,
                }}
              />
            </div>

            <p className="font-mono text-[11px] text-[var(--muted)] truncate">
              Inspecting: <span className="text-[var(--fg)]">{sampleFiles[currentFileIndex]}</span>
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes scanBeam {
          0% {
            transform: translateY(0px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(60px);
            opacity: 0.9;
          }
          100% {
            transform: translateY(110px);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
