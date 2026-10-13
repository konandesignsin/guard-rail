"use client";

import { useCallback, useRef, useState } from "react";

interface CodeLine {
  text: string;
  /** Line was changed by the fix. */
  changed?: boolean;
  note?: string;
}

const BEFORE: CodeLine[] = [
  { text: "// lib/supabase.ts" },
  { text: 'import { createClient } from "@supabase/supabase-js";' },
  { text: "" },
  { text: "export const supabase = createClient(" },
  { text: '  process.env.NEXT_PUBLIC_SUPABASE_URL!,' },
  {
    text: '  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.8Kd2"',
    changed: true,
    note: "admin key in the bundle",
  },
  { text: ");" },
  { text: "" },
  { text: "// policies.sql", changed: true },
  { text: 'create policy "read_all" on orders', changed: true },
  { text: "  for all using (true);", changed: true, note: "every visitor can read" },
];

const AFTER: CodeLine[] = [
  { text: "// lib/supabase.ts" },
  { text: 'import { createClient } from "@supabase/supabase-js";' },
  { text: "" },
  { text: "export const supabase = createClient(" },
  { text: '  process.env.NEXT_PUBLIC_SUPABASE_URL!,' },
  {
    text: '  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!',
    changed: true,
    note: "public key only",
  },
  { text: ");" },
  { text: "" },
  { text: "// policies.sql", changed: true },
  { text: 'create policy "read_own_orders" on orders', changed: true },
  {
    text: "  for select using (auth.uid() = user_id);",
    changed: true,
    note: "scoped to the signed-in user",
  },
];

const KEYBOARD_STEP = 4;

function CodeBlock({ lines, tone }: { lines: CodeLine[]; tone: "before" | "after" }) {
  return (
    <div className="h-full overflow-x-auto p-4 sm:p-5">
      <pre className="min-w-[19rem] font-mono text-[11px] leading-[1.85] sm:text-[12.5px]">
        <code>
          {lines.map((line, index) => (
            <span
              key={index}
              className={`flex whitespace-pre ${
                line.changed
                  ? tone === "before"
                    ? "bg-[var(--squiggle-red-subtle)]"
                    : "bg-[var(--cleared-green-subtle)]"
                  : ""
              }`}
            >
              <span className="w-6 shrink-0 pr-2 text-right text-[10px] text-[var(--muted-subtle)] select-none">
                {index + 1}
              </span>
              <span className={line.changed ? "text-[var(--fg)]" : "text-[var(--muted)]"}>
                {line.text || "\u00A0"}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/**
 * Leaky code on one side, fixed code on the other. Drag the handle, or focus it
 * and use the arrow keys, Home, and End.
 */
export function BeforeAfter() {
  const [position, setPosition] = useState(50);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    updateFromClientX(event.clientX);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    let next: number | null = null;

    if (key === "ArrowLeft") next = position - KEYBOARD_STEP;
    else if (key === "ArrowRight") next = position + KEYBOARD_STEP;
    else if (key === "PageDown") next = position - KEYBOARD_STEP * 3;
    else if (key === "PageUp") next = position + KEYBOARD_STEP * 3;
    else if (key === "Home") next = 0;
    else if (key === "End") next = 100;

    if (next === null) return;
    event.preventDefault();
    setPosition(Math.min(100, Math.max(0, next)));
  }

  const rounded = Math.round(position);

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative h-[21rem] touch-pan-y overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] select-none sm:h-[19rem]"
    >
      {/* The fixed version sits underneath, fully visible. */}
      <div className="absolute inset-0">
        <div className="flex items-center justify-end gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2">
          <span className="rounded-full border border-[color-mix(in_srgb,var(--cleared-green)_35%,transparent)] bg-[var(--cleared-green-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--cleared-green)]">
            fixed
          </span>
          <span className="font-mono text-[11px] text-[var(--fg)]">after</span>
        </div>
        <CodeBlock lines={AFTER} tone="after" />
      </div>

      {/* The leaky version is clipped on top of it. */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - rounded}% 0 0)` }}>
        <div className="flex items-center justify-start gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2">
          <span className="font-mono text-[11px] text-[var(--fg)]">before</span>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--squiggle-red)_35%,transparent)] bg-[var(--squiggle-red-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--squiggle-red)]">
            leaking
          </span>
        </div>
        <CodeBlock lines={BEFORE} tone="before" />
      </div>

      {/* Handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Reveal the fixed code"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}% fixed code shown`}
        onKeyDown={handleKeyDown}
        className="absolute inset-y-0 z-10 w-11 -translate-x-1/2 cursor-ew-resize touch-none"
        style={{ left: `${rounded}%` }}
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--squiggle-red)]" aria-hidden="true" />
        <span
          className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-lg shadow-black/40 transition-transform hover:scale-105"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <path d="M9 6l-4 6 4 6M15 6l4 6-4 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
