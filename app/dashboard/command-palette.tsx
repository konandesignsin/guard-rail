"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Actions" | "Recent Scans" | "Tools";
  onSelect: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const filtered = commands.filter((cmd) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Keyboard navigation & trap focus
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].onSelect();
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Keep selected item in view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans">
        {/* Search header */}
        <div className="flex items-center border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]">
          <svg
            className="h-4 w-4 text-[var(--muted)] shrink-0 mr-3"
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
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search scans..."
            className="w-full bg-transparent text-xs sm:text-sm text-[var(--fg)] placeholder:text-[var(--muted-subtle)] outline-none"
          />
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)] font-mono">
              No matching actions found
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-[var(--surface-hover)] text-[var(--fg)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted-subtle)]">
                      {item.category}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--fg)] truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[10px] text-[var(--muted-subtle)] truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2 text-[10px] font-mono text-[var(--muted-subtle)]">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <span>Guardrail CLI</span>
        </div>
      </div>
    </div>
  );
}
