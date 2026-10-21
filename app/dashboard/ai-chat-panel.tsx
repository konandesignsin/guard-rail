"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import type { FindingReportItem } from "@/app/dashboard/split-report-view";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiChatPanelProps {
  scanId: string;
  findings: FindingReportItem[];
  isAiGlobalEnabled: boolean;
  initialUserOptIn: boolean;
  providerName: string;
}

const STARTER_SUGGESTIONS = [
  "Why does this matter?",
  "Is this a false positive?",
  "How do I fix this?",
  "What should I fix first?",
];

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 6;

export function AiChatPanel({
  scanId,
  findings,
  isAiGlobalEnabled,
  initialUserOptIn,
  providerName,
}: AiChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedFinding, setFocusedFinding] = useState<FindingReportItem | null>(null);
  const [userOptIn, setUserOptIn] = useState(initialUserOptIn);
  const [showOptInNotice, setShowOptInNotice] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(30);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !showOptInNotice && !limitReached) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showOptInNotice, limitReached]);

  const handleOptIn = async () => {
    try {
      const response = await fetch("/api/ai/opt-in", { method: "POST" });
      if (response.ok) {
        setUserOptIn(true);
        setShowOptInNotice(false);
      }
    } catch (err) {
      setError("Failed to opt in. Please try again.");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !userOptIn || limitReached) return;

    const message = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    // Add user message
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(newMessages);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          findingId: focusedFinding?.id,
          message,
          history: newMessages.slice(-MAX_HISTORY - 1, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Your session expired. Refresh the page and try again.");
        } else if (data.limitReached) {
          setLimitReached(true);
          setLimitMessage(data.error);
        } else if (data.requiresOptIn) {
          setShowOptInNotice(true);
        } else {
          setError(data.error || "Failed to send message");
        }
        setIsLoading(false);
        return;
      }

      // Add assistant message
      setMessages([...newMessages, { role: "assistant", content: data.response }]);
      
      if (data.usage) {
        setDailyUsed(data.usage.dailyUsed);
        setDailyLimit(data.usage.dailyLimit);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setFocusedFinding(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isAiGlobalEnabled) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => {
          if (!userOptIn) {
            setShowOptInNotice(true);
            setIsOpen(true);
          } else {
            setIsOpen(true);
          }
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--squiggle-red)] text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[var(--squiggle-red)]/30"
        aria-label="Open AI chat assistant"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl md:w-96"
            ref={panelRef}
            role="dialog"
            aria-label="AI chat assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-[var(--fg)]">Ask GuardRail</h2>
                {focusedFinding && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-subtle)] px-2 py-0.5 text-xs text-[var(--muted)]">
                    {focusedFinding.file.split("/").pop()}:{focusedFinding.line}
                    <button
                      type="button"
                      onClick={() => setFocusedFinding(null)}
                      className="ml-1 text-[var(--muted-subtle)] hover:text-[var(--fg)]"
                      aria-label="Clear focused finding"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                  aria-label="New chat"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                  aria-label="Close chat"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {showOptInNotice ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-[var(--squiggle-red-subtle)] p-3">
                    <svg className="h-6 w-6 text-[var(--squiggle-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--fg)]">AI Assistant</h3>
                  <p className="mb-4 max-w-xs text-xs text-[var(--muted)]">
                    Chat messages and a redacted snippet of your code will be sent to {providerName}. Your conversation is not stored by GuardRail.
                  </p>
                  <button
                    type="button"
                    onClick={handleOptIn}
                    className="rounded-md bg-[var(--fg)] px-4 py-2 text-xs font-medium text-[var(--bg)] hover:bg-white"
                  >
                    Enable AI Assistant
                  </button>
                </div>
              ) : limitReached ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-[var(--squiggle-amber-subtle)] p-3">
                    <svg className="h-6 w-6 text-[var(--squiggle-amber)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--fg)]">Limit Reached</h3>
                  <p className="max-w-xs text-xs text-[var(--muted)]">{limitMessage}</p>
                </div>
              ) : (
                <>
                  {messages.length === 0 && !focusedFinding && (
                    <div className="mb-4">
                      <p className="mb-3 text-xs text-[var(--muted)]">Try asking:</p>
                      <div className="flex flex-wrap gap-2">
                        {STARTER_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setInput(suggestion)}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--fg)] hover:bg-[var(--surface-hover)]"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4" aria-live="polite">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-[var(--fg)] text-[var(--bg)]"
                              : "bg-[var(--surface-subtle)] text-[var(--fg)]"
                          }`}
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
                                    <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs" {...props}>{children}</code>
                                  ),
                                  ul: ({ children, ...props }) => (
                                    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0" {...props}>{children}</ul>
                                  ),
                                  ol: ({ children, ...props }) => (
                                    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0" {...props}>{children}</ol>
                                  ),
                                  li: ({ children, ...props }) => (
                                    <li {...props}>{children}</li>
                                  ),
                                  h1: ({ children, ...props }) => (
                                    <h1 className="mb-2 text-base font-semibold" {...props}>{children}</h1>
                                  ),
                                  h2: ({ children, ...props }) => (
                                    <h2 className="mb-2 text-sm font-semibold" {...props}>{children}</h2>
                                  ),
                                  h3: ({ children, ...props }) => (
                                    <h3 className="mb-1 text-sm font-semibold" {...props}>{children}</h3>
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                          {msg.role === "assistant" && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.content)}
                              className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
                              aria-label="Copy response"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "0ms" }} />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "150ms" }} />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    {error && (
                      <div className="rounded-lg border border-[var(--squiggle-red)]/30 bg-[var(--squiggle-red-subtle)] px-3 py-2 text-xs text-[var(--squiggle-red)]">
                        {error}
                        <button
                          type="button"
                          onClick={() => setError(null)}
                          className="ml-2 underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              )}
            </div>

            {/* Input area */}
            {!showOptInNotice && !limitReached && (
              <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{input.length}/{MAX_MESSAGE_LENGTH}</span>
                  <span>{dailyUsed}/{dailyLimit} today</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this scan..."
                    className="flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted-subtle)] focus:border-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--fg)]"
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="rounded-md bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--muted-subtle)]">
                  AI can be wrong. Check before you apply.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
