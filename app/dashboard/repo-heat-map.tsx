"use client";

import { useMemo } from "react";

export interface HeatMapFile {
  path: string;
  bytes: number;
  findingCount: number;
  maxSeverity?: "high" | "medium" | "low" | "none";
}

interface RepoHeatMapProps {
  files: HeatMapFile[];
  onSelectFile?: (filePath: string) => void;
  selectedFile?: string;
}

export function RepoHeatMap({ files, onSelectFile, selectedFile }: RepoHeatMapProps) {
  // Requirement 4: Show the largest files plus all files with findings, max about 150 blocks,
  // and group the rest into one "other files" block.
  const processedBlocks = useMemo(() => {
    if (!files || files.length === 0) return [];

    // Separate files with findings and files without findings
    const withFindings = files.filter((f) => f.findingCount > 0);
    const cleanFiles = files.filter((f) => f.findingCount === 0);

    // Sort clean files by size descending
    cleanFiles.sort((a, b) => b.bytes - a.bytes);

    // Keep max ~150 individual blocks total
    const allowedCleanCount = Math.max(0, 150 - withFindings.length);
    const featuredClean = cleanFiles.slice(0, allowedCleanCount);
    const overflowClean = cleanFiles.slice(allowedCleanCount);

    const blocks: HeatMapFile[] = [...withFindings, ...featuredClean];

    if (overflowClean.length > 0) {
      const overflowBytes = overflowClean.reduce((acc, f) => acc + f.bytes, 0);
      blocks.push({
        path: `+${overflowClean.length} other files`,
        bytes: overflowBytes,
        findingCount: 0,
        maxSeverity: "none",
      });
    }

    // Sort blocks by byte size descending for treemap feel
    blocks.sort((a, b) => b.bytes - a.bytes);
    return blocks;
  }, [files]);

  const totalBytes = useMemo(() => {
    return Math.max(1, processedBlocks.reduce((acc, b) => acc + b.bytes, 0));
  }, [processedBlocks]);

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center text-xs font-mono text-[var(--muted)]">
        No file metadata recorded for this scan.
      </div>
    );
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-[var(--fg)] font-medium flex items-center gap-2">
          <span>Repository file heat map</span>
          <span className="text-[10px] text-[var(--muted-subtle)]">({files.length} scanned files)</span>
        </span>
        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[var(--squiggle-red)]" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[var(--squiggle-amber)]" /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[var(--surface-hover)] border border-[var(--border)]" /> Clean
          </span>
        </div>
      </div>

      {/* Grid Block Map */}
      <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] max-h-72 overflow-y-auto">
        {processedBlocks.map((block) => {
          const isSelected = selectedFile && block.path === selectedFile;
          const isOverflow = block.path.startsWith("+");
          const hasFindings = block.findingCount > 0;
          const severity = block.maxSeverity;

          // Compute relative block size (flex-grow) based on byte weight
          const weight = Math.max(1, Math.min(18, Math.round((block.bytes / totalBytes) * 40)));

          let colorStyles = "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)]/40";
          if (severity === "high") {
            colorStyles =
              "bg-[var(--squiggle-red-subtle)] border-[var(--squiggle-red)]/50 text-[var(--squiggle-red)] shadow-[0_0_10px_rgba(229,72,77,0.2)]";
          } else if (severity === "medium" || hasFindings) {
            colorStyles =
              "bg-[var(--squiggle-amber-subtle)] border-[var(--squiggle-amber)]/50 text-[var(--squiggle-amber)] shadow-[0_0_10px_rgba(245,165,36,0.2)]";
          } else if (isOverflow) {
            colorStyles = "bg-[var(--surface)] border-[var(--border)] text-[var(--muted-subtle)]";
          }

          if (isSelected) {
            colorStyles += " ring-2 ring-[var(--fg)]";
          }

          return (
            <button
              key={block.path}
              type="button"
              disabled={isOverflow}
              onClick={() => !isOverflow && onSelectFile?.(block.path)}
              style={{ flexGrow: weight, minWidth: "70px", height: "42px" }}
              title={`${block.path} (${formatBytes(block.bytes)}) - ${
                block.findingCount > 0 ? `${block.findingCount} finding(s)` : "clean"
              }`}
              className={`group relative rounded px-2 py-1 text-left border text-[11px] font-mono transition-all overflow-hidden flex flex-col justify-between ${colorStyles} ${
                isOverflow ? "cursor-default opacity-70" : "cursor-pointer"
              }`}
            >
              <span className="truncate w-full font-medium leading-tight">
                {block.path.split("/").pop()}
              </span>
              <div className="flex items-center justify-between text-[9px] opacity-75">
                <span>{formatBytes(block.bytes)}</span>
                {block.findingCount > 0 && (
                  <span className="font-bold">!{block.findingCount}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
