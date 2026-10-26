"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette, type CommandItem } from "@/app/dashboard/command-palette";
import { HeroChat, type RepoScanResult } from "@/app/dashboard/hero-chat";

export interface ScanItem {
  id: string;
  repoName: string | null;
  score: number | null;
  createdAt: string;
}

interface WorkspaceLayoutProps {
  scans: ScanItem[];
  isAiEnabled?: boolean;
  userOptIn?: boolean;
}

function formatTimeAgo(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WorkspaceClient({ scans, isAiEnabled, userOptIn }: WorkspaceLayoutProps) {
  const router = useRouter();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleRepoScan(repoUrl: string): Promise<RepoScanResult> {
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error ?? "Could not scan repository. Please verify the URL is public.",
        };
      }
      router.push(`/dashboard/scans/${data.scanId}`);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the scan service. Please check your connection." };
    }
  }

  async function handleRunExample() {
    try {
      const res = await fetch("/api/scan/example", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return;
      router.push(`/dashboard/scans/${data.scanId}`);
    } catch {
      // The example scan is a shortcut only; failures surface on the scans page.
    }
  }

  const commandItems: CommandItem[] = [
    {
      id: "cmd-focus-ask",
      title: "New scan",
      subtitle: "Focus the GuardRail prompt",
      category: "Actions",
      shortcut: "/",
      onSelect: () => document.getElementById("dashboard-chat-input")?.focus(),
    },
    {
      id: "cmd-try-example",
      title: "Try an example",
      subtitle: "Run audit on leaky sample project",
      category: "Actions",
      onSelect: () => void handleRunExample(),
    },
    {
      id: "cmd-nav-scans",
      title: "View all scans",
      subtitle: "Navigate to scans history",
      category: "Actions",
      onSelect: () => router.push("/dashboard/scans"),
    },
    {
      id: "cmd-nav-projects",
      title: "View projects",
      subtitle: "Navigate to projects overview",
      category: "Actions",
      onSelect: () => router.push("/dashboard/projects"),
    },
    {
      id: "cmd-nav-settings",
      title: "Settings",
      subtitle: "Manage account and AI preferences",
      category: "Actions",
      onSelect: () => router.push("/dashboard/settings"),
    },
  ];

  if (process.env.NEXT_PUBLIC_SHOW_PREVIEW_ROUTES === "true") {
    commandItems.push({
      id: "cmd-sample-report",
      title: "Sample report",
      subtitle: "View demo audit report",
      category: "Actions",
      onSelect: () => router.push("/dashboard/preview-report"),
    });
  }

  scans.slice(0, 8).forEach((scan) => {
    commandItems.push({
      id: `scan-${scan.id}`,
      title: scan.repoName ?? "Repository scan",
      subtitle: `Score: ${scan.score ?? 0} • ${formatTimeAgo(scan.createdAt)}`,
      category: "Recent Scans",
      onSelect: () => router.push(`/dashboard/scans/${scan.id}`),
    });
  });

  return (
    <div className="relative h-full w-full">
      <HeroChat
        isAiEnabled={isAiEnabled ?? false}
        userOptIn={userOptIn ?? false}
        onRepoScan={handleRepoScan}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commandItems}
      />
    </div>
  );
}
