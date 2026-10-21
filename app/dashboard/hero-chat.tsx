"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

const SpaceScene = dynamic(() => import("@/app/dashboard/space-scene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a]" />
  ),
});

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
  { text: "Scan my GitHub repo", primary: true },
  { text: "What security issues should I check first?", primary: true },
  { text: "Explain exposed API keys", primary: false },
  { text: "How does scoring work?", primary: false },
];

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 6;

export function HeroChat({ isAiEnabled, userOptIn, onRepoScan }: HeroChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptIn, setShowOptIn] = useState(!userOptIn && isAiEnabled);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
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

    try {
      const res = await fetch("/api/ai/dashboard-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: newMessages.slice(-MAX_HISTORY - 1, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Your session expired. Refresh the page and try again.");
        } else if (data.requiresOptIn) {
          setShowOptIn(true);
        } else {
          setError(data.error || "Failed to get response.");
        }
        setIsLoading(false);
        return;
      }

      setMessages([...newMessages, { role: "assistant", content: data.response || "" }]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, showOptIn, isAiEnabled, onRepoScan]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (text: string) => {
    if (text === "Scan my GitHub repo") {
      setShowRepoPicker(true);
      return;
    }
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ minHeight: "520px" }}>
      {/* 3D Background */}
      <div className="absolute inset-0">
        <SpaceScene />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-10 md:py-14" style={{ minHeight: "520px" }}>
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-white drop-shadow-lg">
            Ask GuardRail before you ship.
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/70 max-w-lg mx-auto drop-shadow">
            Paste a GitHub repo URL to scan, or ask a security question. Your code is checked in memory and never stored.
          </p>
        </motion.div>

        {/* Glassmorphism chat box */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-2xl"
          style={{
            animation: "heroFloat 6s ease-in-out infinite",
          }}
        >
          <div
            className="overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 100%)",
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderTopColor: "rgba(255,255,255,0.28)",
              borderRadius: "28px",
              boxShadow: "0 20px 80px rgba(109,74,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            {/* Messages area */}
            <div
              ref={messagesContainerRef}
              className="px-5 pt-5 overflow-y-auto"
              style={{
                maxHeight: "300px",
                maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 100%)",
              }}
            >
              {showOptIn ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 rounded-full bg-white/10 p-3">
                    <svg className="h-6 w-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/80 mb-3 max-w-xs">
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
              ) : messages.length === 0 ? (
                <div className="py-6">
                  <p className="text-xs text-white/50 mb-3 font-mono uppercase tracking-wider">Try asking</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.text}
                        type="button"
                        onClick={() => handleSuggestion(s.text)}
                        className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                          s.primary
                            ? "border border-[#ff8a5c]/60 text-[#ff8a5c] hover:bg-[#ff8a5c]/10"
                            : "border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
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

            {/* Input area */}
            {!showOptIn && (
              <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                      onKeyDown={handleKeyDown}
                      placeholder="Paste a GitHub URL or ask a security question..."
                      disabled={isLoading}
                      rows={1}
                      className="w-full resize-none rounded-2xl bg-white/10 px-4 py-3 pr-14 text-sm text-white placeholder:text-white/40 outline-none border border-white/15 focus:border-white/30 transition-colors disabled:opacity-50"
                      style={{
                        backdropFilter: "blur(8px)",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
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
              </form>
            )}
          </div>
        </motion.div>
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

      <style jsx global>{`
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
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
