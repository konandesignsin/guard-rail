"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RepoScanResult {
  ok: boolean;
  error?: string;
}

interface HeroChatProps {
  isAiEnabled: boolean;
  userOptIn: boolean;
  onRepoScan: (repoUrl: string) => Promise<RepoScanResult>;
}

const GITHUB_REPO_REGEX = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

const SUGGESTIONS = [
  { text: "Paste a public GitHub URL", action: "prefill-repo" as const },
  { text: "Select one of your repos", action: "open-picker" as const },
  { text: "Is my Supabase database open?", action: "ask" as const },
  { text: "What do you scan for?", action: "ask" as const },
];

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 6;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useIsDataSaver() {
  const [saver, setSaver] = useState(false);
  useEffect(() => {
    const nav = navigator as any;
    if (nav?.connection?.saveData) setSaver(true);
  }, []);
  return saver;
}

/** True while the viewport is phone-sized so we can ship lighter media. */
const SMALL_SCREEN_QUERY = "(max-width: 767px)";

function subscribeSmallScreen(onChange: () => void) {
  const mq = window.matchMedia(SMALL_SCREEN_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSmallScreenSnapshot() {
  return window.matchMedia(SMALL_SCREEN_QUERY).matches;
}

function getSmallScreenServerSnapshot() {
  // Unknown while server-rendering: start with the poster only, never both media.
  return null;
}

function useIsSmallScreen(): boolean | null {
  return useSyncExternalStore(subscribeSmallScreen, getSmallScreenSnapshot, getSmallScreenServerSnapshot);
}

export function HeroChat({ isAiEnabled, userOptIn, onRepoScan }: HeroChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptIn, setShowOptIn] = useState(!userOptIn && isAiEnabled);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();
  const dataSaver = useIsDataSaver();
  const isSmallScreen = useIsSmallScreen();
  const showPosterOnly = reducedMotion || dataSaver || videoFailed;
  const busy = isLoading || isScanning;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, isLoading, isScanning, reducedMotion]);

  // Pause the loop when the hero scrolls out of view
  useEffect(() => {
    if (showPosterOnly) return;
    const el = heroRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showPosterOnly, isSmallScreen]);

  // Pause when the tab is hidden
  useEffect(() => {
    if (showPosterOnly) return;
    const vid = videoRef.current;
    if (!vid) return;

    const handleVisibility = () => {
      if (document.hidden) {
        vid.pause();
      } else {
        const el = heroRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const inView = rect.bottom > 0 && rect.top < window.innerHeight;
          if (inView) vid.play().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [showPosterOnly, isSmallScreen]);

  const handleOptIn = async () => {
    try {
      const res = await fetch("/api/ai/opt-in", { method: "POST" });
      if (res.ok) {
        setShowOptIn(false);
      }
    } catch {
      setError("Failed to opt in. Please try again.");
    }
  };

  const callAi = useCallback(
    async (trimmed: string, history: ChatMessage[], attempt: number): Promise<{ response: string } | { error: string; status?: number; requiresOptIn?: boolean }> => {
      try {
        const res = await fetch("/api/ai/dashboard-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: history.slice(-MAX_HISTORY - 1, -1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            return { error: "Your session expired. Refresh the page and try again.", status: 401 };
          }
          if (data.requiresOptIn) {
            return { error: "", requiresOptIn: true };
          }
          // Retry on 503/429
          if ((res.status === 503 || res.status === 429) && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 2000;
            await new Promise((r) => setTimeout(r, delay));
            return callAi(trimmed, history, attempt + 1);
          }
          if (res.status === 503 || res.status === 429) {
            return { error: "The AI is busy right now. Try again in a moment." };
          }
          return { error: data.error || "Failed to get response.", status: res.status };
        }

        return { response: data.response || "" };
      } catch {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt] || 2000;
          await new Promise((r) => setTimeout(r, delay));
          return callAi(trimmed, history, attempt + 1);
        }
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent, overrideText?: string) => {
      e?.preventDefault();
      const rawText = overrideText ?? input;
      const trimmed = rawText.trim();
      if (!trimmed || busy) return;

      // A GitHub repo URL starts a scan: show what was asked, then hand off
      // to the scan report page once the scan is queued.
      if (GITHUB_REPO_REGEX.test(trimmed)) {
        setInput("");
        setError(null);
        setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
        setIsScanning(true);

        const result = await onRepoScan(trimmed);
        if (!result.ok) {
          setIsScanning(false);
          setError(result.error ?? "Could not start the scan. Please verify the URL is public.");
        }
        return;
      }

      setInput("");
      setError(null);
      setIsLoading(true);

      const newMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(newMessages);

      if (showOptIn || !isAiEnabled) {
        setIsLoading(false);
        setError("AI assistant requires opt-in. Click 'Enable AI' below to continue.");
        return;
      }

      const result = await callAi(trimmed, newMessages, 0);

      if ("response" in result) {
        setMessages([...newMessages, { role: "assistant", content: result.response }]);
      } else {
        if (result.requiresOptIn) {
          setShowOptIn(true);
        } else {
          setError(result.error);
        }
      }

      setIsLoading(false);
    },
    [input, busy, messages, showOptIn, isAiEnabled, onRepoScan, callAi]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (suggestion: (typeof SUGGESTIONS)[number]) => {
    if (suggestion.action === "open-picker") {
      setShowRepoPicker(true);
      return;
    }
    if (suggestion.action === "prefill-repo") {
      setInput("https://github.com/");
      inputRef.current?.focus();
      return;
    }
    // "ask" - auto-submit with the suggestion text
    handleSubmit(undefined, suggestion.text);
  };

  const hasMessages = messages.length > 0;
  const enter = reducedMotion ? 0 : 0.5;

  return (
    <div ref={heroRef} className="relative h-full min-h-[420px] w-full overflow-hidden bg-[#05060a]">
      {/* Earth background */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/videos/earth-poster.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 767px) 100vw, 100vw"
          className="object-cover object-[50%_68%]"
        />

        {!showPosterOnly && isSmallScreen !== null && (
          <video
            key={isSmallScreen ? "earth-sm" : "earth-lg"}
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/videos/earth-poster.jpg"
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-[50%_68%] transition-opacity duration-500"
            style={{ opacity: videoLoaded ? 1 : 0 }}
          >
            <source src={isSmallScreen ? "/videos/earth-sm.webm" : "/videos/earth.webm"} type="video/webm" />
            <source src={isSmallScreen ? "/videos/earth-sm.mp4" : "/videos/earth.mp4"} type="video/mp4" />
          </video>
        )}

        {/* Soft dark scrim so legibility never depends on image brightness */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(4,5,8,0.62) 0%, rgba(4,5,8,0.80) 32%, rgba(4,5,8,0.84) 68%, rgba(4,5,8,0.66) 100%)",
          }}
        />

        {/* Radial scrim directly behind the headline and input */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(72% 48% at 50% 54%, rgba(3,4,9,0.78) 0%, rgba(3,4,9,0.5) 58%, rgba(3,4,9,0) 100%)",
          }}
        />

        {/* Radial vignette for depth at the edges */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(110% 100% at 50% 46%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.72) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col justify-center px-4 py-8 sm:px-6">
            <div className="mx-auto w-full max-w-[680px]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: enter }}
                className="text-center"
              >
                <h1 className="text-balance font-display text-[28px] font-medium leading-tight tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.65)] sm:text-4xl md:text-5xl">
                  Ask GuardRail before you ship.
                </h1>
                <p className="mx-auto mt-3 max-w-[34ch] text-pretty text-sm leading-relaxed text-white/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)] sm:max-w-none sm:text-base">
                  Paste a public GitHub repo to scan, or ask a security question. Nothing is stored.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: enter, delay: reducedMotion ? 0 : 0.12 }}
                className="mt-6"
              >
                {showOptIn ? (
                  <div className="mx-auto max-w-md rounded-2xl border border-white/20 bg-[#0b0e16]/95 p-5 text-center shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <p className="text-sm leading-relaxed text-white/85">
                      Enable the AI assistant to ask security questions. Messages are sent to the configured AI
                      provider.
                    </p>
                    <button
                      type="button"
                      onClick={handleOptIn}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff8a5c] px-5 text-sm font-semibold text-[#160a03] transition-colors hover:bg-[#ffa078] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e16]"
                    >
                      Enable AI Assistant
                    </button>
                  </div>
                ) : !hasMessages ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.text}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        className="inline-flex min-h-11 max-w-full items-center justify-center rounded-full border border-white/25 bg-black/60 px-4 py-2.5 text-center text-sm font-medium text-white backdrop-blur-md transition-colors hover:border-white/40 hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a5c] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    className="max-h-[34svh] space-y-3 overflow-y-auto overscroll-contain px-0.5 py-1"
                    aria-live="polite"
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reducedMotion ? 0 : 0.25 }}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[92%] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed sm:max-w-[85%] ${
                              msg.role === "user"
                                ? "border-white/20 bg-white/15 text-white"
                                : "border-white/15 bg-black/55 text-white/95"
                            } backdrop-blur-md`}
                          >
                            {msg.role === "assistant" ? (
                              <div className="prose-chat">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children, ...props }) => (
                                      <p className="mb-2 last:mb-0" {...props}>{children}</p>
                                    ),
                                    strong: ({ children, ...props }) => (
                                      <strong className="font-semibold" {...props}>{children}</strong>
                                    ),
                                    code: ({ children, ...props }) => (
                                      <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-xs" {...props}>{children}</code>
                                    ),
                                    ul: ({ children, ...props }) => (
                                      <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0" {...props}>{children}</ul>
                                    ),
                                    ol: ({ children, ...props }) => (
                                      <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0" {...props}>{children}</ol>
                                    ),
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="break-words whitespace-pre-wrap">{msg.content}</div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {busy && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-black/55 px-4 py-3 backdrop-blur-md">
                          <div className="flex gap-1.5">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:0ms] motion-reduce:animate-none" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:150ms] motion-reduce:animate-none" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:300ms] motion-reduce:animate-none" />
                          </div>
                          <span className="text-xs text-white/85">
                            {isScanning ? "Scanning repository…" : "Thinking…"}
                          </span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="flex flex-wrap items-start gap-2 rounded-xl border border-red-400/40 bg-red-950/70 px-4 py-2.5 text-xs leading-relaxed text-red-100">
                        <span className="flex-1">{error}</span>
                        <button
                          type="button"
                          onClick={() => setError(null)}
                          className="underline underline-offset-2 hover:text-white"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </motion.div>

              {/* Chat input */}
              {!showOptIn && (
                <form onSubmit={handleSubmit} className="mt-4">
                  <div className="rounded-2xl border border-white/30 bg-[#0b0e16]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md transition-colors focus-within:border-[#ff8a5c]/80 focus-within:ring-2 focus-within:ring-[#ff8a5c]/60">
                    <div className="flex items-end gap-2">
                      <label htmlFor="dashboard-chat-input" className="sr-only">
                        Ask GuardRail
                      </label>
                      <textarea
                        id="dashboard-chat-input"
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                        onKeyDown={handleKeyDown}
                        placeholder="Paste a GitHub repo URL or ask a security question"
                        disabled={busy}
                        rows={2}
                        className="max-h-[120px] min-h-11 w-full flex-1 resize-none bg-transparent px-1.5 py-2 text-base leading-relaxed text-white outline-none placeholder:text-white/60 disabled:opacity-60"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || busy}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff8a5c] text-[#160a03] transition-colors hover:bg-[#ffa078] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e16] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label="Send message"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1.5">
                      <span className="font-mono text-[11px] tabular-nums text-white/60">
                        {input.length}/{MAX_MESSAGE_LENGTH}
                      </span>
                      <span className="text-[11px] text-white/70">
                        AI can make mistakes. Verify before applying.
                      </span>
                    </div>
                  </div>
                </form>
              )}

              <div className="mt-4 text-center">
                <Link
                  href="/dashboard/scans"
                  className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-white/75 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  View your scans
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Image credit */}
        <p className="shrink-0 px-4 pb-3 text-center text-[10px] leading-snug text-white/35">
          Earth imagery: NASA&apos;s Scientific Visualization Studio. Data courtesy of Reto Stockli (NASA/GSFC).
          Public domain.
        </p>
      </div>

      {/* Repo picker modal */}
      <AnimatePresence>
        {showRepoPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm"
            onClick={() => setShowRepoPicker(false)}
          >
            <motion.div
              initial={{ scale: reducedMotion ? 1 : 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: reducedMotion ? 1 : 0.96, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-label="Select a GitHub repository"
              className="max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-[#0b0e16] p-5 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-white sm:text-lg">Select a GitHub repository</h2>
                <button
                  type="button"
                  onClick={() => setShowRepoPicker(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close repository picker"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <RepoPickerInner
                onSelect={(url) => {
                  setShowRepoPicker(false);
                  void handleSubmit(undefined, url);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RepoPickerInner({ onSelect }: { onSelect: (url: string) => void }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  function handleSubmit() {
    if (!repoUrl.trim()) {
      setUrlError("Please enter a GitHub URL.");
      return;
    }
    if (!repoUrl.trim().includes("github.com/")) {
      setUrlError("URL must be a GitHub repository.");
      return;
    }
    onSelect(repoUrl.trim());
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3.5 font-mono text-xs text-white/50">&gt;</span>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value);
              setUrlError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="https://github.com/owner/repository"
            aria-label="GitHub repository URL"
            className="min-h-11 w-full rounded-xl border border-white/25 bg-white/5 py-3 pl-8 pr-4 font-mono text-xs text-white outline-none transition-colors placeholder:text-white/45 focus:border-[#ff8a5c]/80 focus:ring-2 focus:ring-[#ff8a5c]/50"
          />
        </div>
        {urlError && <p className="mt-2 text-xs text-red-300">{urlError}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSubmit}
          className="min-h-11 flex-1 rounded-xl bg-[#ff8a5c] px-4 text-sm font-semibold text-[#160a03] transition-colors hover:bg-[#ffa078]"
        >
          Start scan
        </button>
        <GitHubReposList onSelect={onSelect} />
      </div>
    </div>
  );
}

function GitHubReposList({ onSelect }: { onSelect: (url: string) => void }) {
  const [repos, setRepos] = useState<{ name: string; url: string; private: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function loadRepos() {
    if (loaded) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/github/repos");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Refresh the page.");
        } else {
          setError("Could not load repos.");
        }
        return;
      }
      const data = await res.json();
      setRepos(data.repos || []);
      setLoaded(true);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={() => {
          loadRepos();
        }}
        disabled={loading}
        className="min-h-11 w-full rounded-xl border border-white/25 bg-white/5 px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        {loading ? "Loading..." : "My repos"}
      </button>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      {repos.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/15 bg-white/5">
          {repos.map((repo) => (
            <button
              key={repo.url}
              type="button"
              onClick={() => onSelect(repo.url)}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="truncate">{repo.name}</span>
              {repo.private && (
                <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[10px] text-white/70">private</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
