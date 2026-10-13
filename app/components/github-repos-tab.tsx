"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  updated_at: string;
  default_branch: string;
  private: boolean;
}

type TabState = "loading" | "not-connected" | "empty" | "list" | "scanning" | "error";

interface GitHubReposTabProps {
  onScanStart?: () => void;
  onScanComplete?: () => void;
}

export function GitHubReposTab({ onScanStart, onScanComplete }: GitHubReposTabProps) {
  const router = useRouter();
  const [state, setState] = useState<TabState>("loading");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scanningRepo, setScanningRepo] = useState<string | null>(null);

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    setState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "NOT_CONNECTED") {
          setState("not-connected");
          return;
        }
        if (data.error === "TOKEN_EXPIRED") {
          setErrorMessage("Your GitHub connection has expired. Please reconnect.");
          setState("not-connected");
          return;
        }
        setErrorMessage(data.message || "Could not load repositories.");
        setState("error");
        return;
      }

      if (data.repos.length === 0) {
        setState("empty");
      } else {
        setRepos(data.repos);
        setState("list");
      }
    } catch {
      setErrorMessage("Could not reach the server. Please check your connection.");
      setState("error");
    }
  }

  async function handleScan(repo: GitHubRepo) {
    setScanningRepo(repo.full_name);
    setState("scanning");
    onScanStart?.();

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "github", repo: repo.full_name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Could not scan repository.");
        setState("error");
        setScanningRepo(null);
        onScanComplete?.();
        return;
      }

      router.push(`/dashboard/scans/${data.scanId}`);
    } catch {
      setErrorMessage("Could not reach the scan service. Please check your connection.");
      setState("error");
      setScanningRepo(null);
      onScanComplete?.();
    }
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  const filteredRepos = repos.filter((repo) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(query) ||
      repo.owner.login.toLowerCase().includes(query) ||
      (repo.description && repo.description.toLowerCase().includes(query)) ||
      (repo.language && repo.language.toLowerCase().includes(query))
    );
  });

  // Not connected state
  if (state === "not-connected") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <svg
          className="mx-auto h-8 w-8 text-[var(--muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <h3 className="mt-3 text-sm font-medium text-[var(--fg)]">
          Connect your GitHub account
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Link your GitHub account to scan your repositories directly.
        </p>
        <a
          href="/api/auth/github"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--fg)] hover:bg-white text-[var(--bg)] px-4 py-2 text-xs font-medium transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          Connect GitHub
        </a>
        {errorMessage && (
          <p className="mt-3 text-xs text-[var(--squiggle-red)]">{errorMessage}</p>
        )}
      </div>
    );
  }

  // Loading state
  if (state === "loading") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--fg)]" />
        <p className="mt-3 text-xs text-[var(--muted)]">Loading your repositories...</p>
      </div>
    );
  }

  // Empty state
  if (state === "empty") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <svg
          className="mx-auto h-8 w-8 text-[var(--muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 className="mt-3 text-sm font-medium text-[var(--fg)]">
          No public repositories found
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          We couldn't find any public repositories in your GitHub account.
        </p>
        <button
          type="button"
          onClick={loadRepos}
          className="mt-4 rounded-md bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--fg)] transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <svg
          className="mx-auto h-8 w-8 text-[var(--squiggle-red)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="mt-3 text-sm font-medium text-[var(--fg)]">
          Something went wrong
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">{errorMessage}</p>
        <button
          type="button"
          onClick={loadRepos}
          className="mt-4 rounded-md bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--fg)] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // Scanning state
  if (state === "scanning") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--fg)]" />
        <p className="mt-3 text-xs text-[var(--muted)]">
          Scanning {scanningRepo}...
        </p>
      </div>
    );
  }

  // List state
  return (
    <div className="space-y-4">
      {/* Search and refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] pl-9 pr-3 py-2 text-xs text-[var(--fg)] placeholder:text-[var(--muted-subtle)] outline-none focus:border-[var(--muted)] focus:ring-1 focus:ring-[var(--muted)] transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={loadRepos}
          className="rounded-md bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--fg)] transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Repository list */}
      <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg bg-[var(--surface)] overflow-hidden">
        {filteredRepos.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--muted)]">
            No repositories match your search.
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <div
              key={repo.full_name}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs font-medium text-[var(--fg)] truncate">
                    {repo.owner.login}/<span className="font-bold">{repo.name}</span>
                  </p>
                  {repo.language && (
                    <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                      {repo.language}
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="mt-1 text-[11px] text-[var(--muted)] truncate">
                    {repo.description}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-[var(--muted-subtle)]">
                  Updated {formatRelativeTime(repo.updated_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleScan(repo)}
                disabled={scanningRepo === repo.full_name}
                className="ml-4 rounded bg-[var(--fg)] hover:bg-white text-[var(--bg)] px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Scan
              </button>
            </div>
          ))
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1 text-[11px] text-[var(--muted)]">
        <p>We only read the repo to scan it. We don't store your code.</p>
        <p>Private repositories are coming soon.</p>
      </div>
    </div>
  );
}
