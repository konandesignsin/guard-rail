"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HeroChatProps {
  isAiEnabled: boolean;
  userOptIn: boolean;
  onRepoScan: (repoUrl: string) => void;
}

const GITHUB_REPO_REGEX = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

const SUGGESTIONS = [
  { text: "Paste a public GitHub URL", action: "prefill-repo" as const, primary: true },
  { text: "Select one of your repos", action: "open-picker" as const, primary: true },
  { text: "Is my Supabase database open?", action: "ask" as const, primary: false },
  { text: "What do you scan for?", action: "ask" as const, primary: false },
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

export function HeroChat({ isAiEnabled, userOptIn, onRepoScan }: HeroChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptIn, setShowOptIn] = useState(!userOptIn && isAiEnabled);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();
  const dataSaver = useIsDataSaver();
  const showPosterOnly = reducedMotion || dataSaver || videoFailed;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // IntersectionObserver: pause video when hero is off-screen
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
  }, [showPosterOnly]);

  // Visibility change: pause when tab hidden
  useEffect(() => {
    if (showPosterOnly) return;
    const vid = videoRef.current;
    if (!vid) return;

    const handleVisibility = () => {
      if (document.hidden) {
        vid.pause();
      } else {
        // Only resume if hero is also in viewport
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
  }, [showPosterOnly]);

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
      if (!trimmed || isLoading) return;

      if (GITHUB_REPO_REGEX.test(trimmed)) {
        onRepoScan(trimmed);
        setInput("");
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
    [input, isLoading, messages, showOptIn, isAiEnabled, onRepoScan, callAi]
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

  return (
    <div ref={heroRef} className="relative w-full" style={{ minHeight: "520px" }}>
      {/* Video background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Poster image - shows instantly */}
        <img
          src="/videos/earth-poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[50%_65%]"
          aria-hidden="true"
        />

        {/* Video - fades in over poster */}
        {!showPosterOnly && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/videos/earth-poster.jpg"
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-[50%_65%] transition-opacity duration-[400ms]"
            style={{ opacity: videoLoaded ? 1 : 0 }}
          >
            <source src="/videos/earth.webm" type="video/webm" />
            <source src="/videos/earth.mp4" type="video/mp4" />
          </video>
        )}

        {/* Top gradient mask - blends into dark sky */}
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(4,5,8,0.85) 0%, rgba(4,5,8,0.4) 50%, transparent 100%)",
          }}
        />

        {/* Bottom gradient mask - fades into page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #08090d 0%, rgba(8,9,13,0.8) 40%, transparent 100%)",
          }}
        />

        {/* Subtle dark overlay for text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(4,5,8,0.2)" }}
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-end px-4 pb-10 pt-28 md:pb-14 md:pt-36" style={{ minHeight: "520px" }}>
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h1 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-white drop-shadow-lg">
            Ask GuardRail before you ship.
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/70 max-w-lg mx-auto drop-shadow">
            Paste a GitHub repo URL to scan, or ask a security question. Your code is checked in memory and never stored.
          </p>
        </motion.div>

        {/* Chat area - floating glass bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-[760px]"
        >
          {/* Messages / Suggestions */}
          <div className="mb-3">
            {showOptIn ? (
              <div className="flex justify-center">
                <div
                  className="rounded-2xl px-5 py-4 text-center"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    backdropFilter: "blur(18px) saturate(170%)",
                    WebkitBackdropFilter: "blur(18px) saturate(170%)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <p className="text-sm text-white/80 mb-3 max-w-xs mx-auto">
                    Enable AI assistant to ask security questions. Messages are sent to the configured AI provider.
                  </p>
                  <button
                    type="button"
                    onClick={handleOptIn}
                    className="rounded-full px-5 py-2 text-sm font-medium text-white transition-colors"
                    style={{ background: "rgba(255,138,92,0.9)" }}
                  >
                    Enable AI Assistant
                  </button>
                </div>
              </div>
            ) : !hasMessages ? (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-wrap justify-center gap-2"
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => handleSuggestion(s)}
                      className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                        s.primary
                          ? "border border-[#ff8a5c]/60 text-[#ff8a5c] hover:bg-[#ff8a5c]/10"
                          : "border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {s.text}
                    </button>
                  ))}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div
                ref={messagesContainerRef}
                className="overflow-y-auto space-y-3 px-1"
                style={{ maxHeight: "280px" }}
              >
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/90"
                        }`}
                        style={{
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
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
                                  <code className="rounded bg-black/20 px-1 py-0.5 font-mono text-xs" {...props}>{children}</code>
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
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white/10 px-4 py-3" style={{ backdropFilter: "blur(12px)" }}>
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
                    {error}
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="ml-2 underline hover:text-red-200"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Glass chat bar */}
          {!showOptIn && (
            <form onSubmit={handleSubmit}>
              <div
                className="overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(18px) saturate(170%)",
                  WebkitBackdropFilter: "blur(18px) saturate(170%)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderTopColor: "rgba(255,255,255,0.28)",
                  borderRadius: "32px",
                  boxShadow: "0 8px 40px rgba(109,74,255,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                  padding: "20px 24px",
                }}
              >
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                      onKeyDown={handleKeyDown}
                      placeholder="Paste a GitHub URL or ask a security question..."
                      disabled={isLoading}
                      rows={2}
                      className="w-full resize-none rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none border border-white/15 focus:border-white/30 transition-colors disabled:opacity-50"
                      style={{
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        maxHeight: "120px",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                    style={{ background: "#ff8a5c" }}
                    aria-label="Send message"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-[10px] text-white/30 font-mono">
                    {input.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                  <span className="text-[10px] text-white/30">
                    AI can make mistakes. Verify before applying.
                  </span>
                </div>
              </div>
            </form>
          )}
        </motion.div>

        {/* Credits */}
        <p className="mt-4 text-[10px] text-white/25 text-center">
          Earth imagery: NASA&apos;s Scientific Visualization Studio. Data courtesy of Reto Stockli (NASA/GSFC). Public domain.
        </p>
      </div>

      {/* Repo picker modal */}
      <AnimatePresence>
        {showRepoPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowRepoPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#1a1a2e] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Select a GitHub repository</h2>
                <button
                  type="button"
                  onClick={() => setShowRepoPicker(false)}
                  className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <RepoPickerInner
                onSelect={(url) => {
                  setShowRepoPicker(false);
                  onRepoScan(url);
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
          <span className="absolute left-3.5 font-mono text-xs text-white/40 pointer-events-none">&gt;</span>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); setUrlError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="https://github.com/owner/repository"
            className="w-full rounded-xl border border-white/15 bg-white/5 pl-8 pr-4 py-3 font-mono text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
          />
        </div>
        {urlError && <p className="mt-2 text-xs text-red-400">{urlError}</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors"
          style={{ background: "#ff8a5c" }}
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
        onClick={() => { loadRepos(); }}
        disabled={loading}
        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
      >
        {loading ? "Loading..." : "My repos"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {repos.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/5">
          {repos.map((repo) => (
            <button
              key={repo.url}
              type="button"
              onClick={() => onSelect(repo.url)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="truncate">{repo.name}</span>
              {repo.private && (
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">private</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
