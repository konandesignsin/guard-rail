import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseExtraBody,
  stripReasoningContent,
  isEmailAllowed,
  checkNvidiaRateLimit,
  resetNvidiaRateLimitForTesting,
  callNvidia,
  callNvidiaChat,
} from "@/lib/ai";

// --- parseExtraBody ---
describe("parseExtraBody", () => {
  const orig = process.env.AI_EXTRA_BODY;

  afterEach(() => {
    if (orig === undefined) delete process.env.AI_EXTRA_BODY;
    else process.env.AI_EXTRA_BODY = orig;
  });

  it("returns empty object when env var is not set", () => {
    delete process.env.AI_EXTRA_BODY;
    expect(parseExtraBody()).toEqual({});
  });

  it("returns empty object for invalid JSON", () => {
    process.env.AI_EXTRA_BODY = "not json";
    expect(parseExtraBody()).toEqual({});
  });

  it("returns empty object for JSON array", () => {
    process.env.AI_EXTRA_BODY = "[1,2,3]";
    expect(parseExtraBody()).toEqual({});
  });

  it("parses valid JSON object", () => {
    process.env.AI_EXTRA_BODY = '{"reasoning_effort":"low"}';
    expect(parseExtraBody()).toEqual({ reasoning_effort: "low" });
  });
});

// --- stripReasoningContent ---
describe("stripReasoningContent", () => {
  it("removes reasoning_content field from message", () => {
    const data = {
      choices: [
        {
          message: {
            content: "final answer",
            reasoning_content: "hidden reasoning",
          },
        },
      ],
    };
    const result = stripReasoningContent(data) as any;
    expect(result.choices[0].message.content).toBe("final answer");
    expect(result.choices[0].message.reasoning_content).toBeUndefined();
  });

  it("removes top-level reasoning field", () => {
    const data = { content: "hello", reasoning: "secret thoughts" };
    const result = stripReasoningContent(data) as any;
    expect(result.content).toBe("hello");
    expect(result.reasoning).toBeUndefined();
  });

  it("handles nested arrays", () => {
    const data = {
      items: [{ reasoning_content: "x", content: "y" }],
    };
    const result = stripReasoningContent(data) as any;
    expect(result.items[0].content).toBe("y");
    expect(result.items[0].reasoning_content).toBeUndefined();
  });

  it("passes through non-object values", () => {
    expect(stripReasoningContent("hello")).toBe("hello");
    expect(stripReasoningContent(null)).toBe(null);
    expect(stripReasoningContent(42)).toBe(42);
  });
});

// --- isEmailAllowed ---
describe("isEmailAllowed", () => {
  const orig = process.env.AI_ALLOWED_EMAILS;

  afterEach(() => {
    if (orig === undefined) delete process.env.AI_ALLOWED_EMAILS;
    else process.env.AI_ALLOWED_EMAILS = orig;
  });

  it("allows all when env var is not set", () => {
    delete process.env.AI_ALLOWED_EMAILS;
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
  });

  it("allows all when env var is empty", () => {
    process.env.AI_ALLOWED_EMAILS = "";
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
  });

  it("allows matching email (case-insensitive)", () => {
    process.env.AI_ALLOWED_EMAILS = "alice@example.com, bob@test.com";
    expect(isEmailAllowed("ALICE@EXAMPLE.COM")).toBe(true);
    expect(isEmailAllowed("bob@test.com")).toBe(true);
  });

  it("blocks non-matching email", () => {
    process.env.AI_ALLOWED_EMAILS = "alice@example.com";
    expect(isEmailAllowed("eve@evil.com")).toBe(false);
  });

  it("blocks null/undefined email when allowlist is set", () => {
    process.env.AI_ALLOWED_EMAILS = "alice@example.com";
    expect(isEmailAllowed(null)).toBe(false);
    expect(isEmailAllowed(undefined)).toBe(false);
  });
});

// --- checkNvidiaRateLimit ---
describe("checkNvidiaRateLimit", () => {
  beforeEach(() => {
    resetNvidiaRateLimitForTesting();
  });

  it("allows requests under the limit", () => {
    const result = checkNvidiaRateLimit();
    expect(result.allowed).toBe(true);
  });

  it("blocks after 40 requests in a window", () => {
    for (let i = 0; i < 40; i++) {
      checkNvidiaRateLimit();
    }
    const result = checkNvidiaRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });
});

// --- callNvidia with mocked fetch ---
describe("callNvidia", () => {
  const origFetch = globalThis.fetch;
  const origBaseUrl = process.env.NVIDIA_BASE_URL;
  const origExtraBody = process.env.AI_EXTRA_BODY;

  afterEach(() => {
    globalThis.fetch = origFetch;
    if (origBaseUrl === undefined) delete process.env.NVIDIA_BASE_URL;
    else process.env.NVIDIA_BASE_URL = origBaseUrl;
    if (origExtraBody === undefined) delete process.env.AI_EXTRA_BODY;
    else process.env.AI_EXTRA_BODY = origExtraBody;
  });

  it("returns text and token count on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "hello world" } }],
        usage: { total_tokens: 10 },
      }),
    });

    const result = await callNvidia("test-key", "test-model", "sys", "user");
    expect(result.text).toBe("hello world");
    expect(result.tokenCount).toBe(10);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "server error",
    });

    await expect(
      callNvidia("test-key", "test-model", "sys", "user")
    ).rejects.toThrow("NVIDIA API error status 500");
  });

  it("retries with higher cap on empty content", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "" } }],
            usage: { total_tokens: 5 },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "retry response" } }],
          usage: { total_tokens: 20 },
        }),
      };
    });

    const result = await callNvidia("test-key", "test-model", "sys", "user");
    expect(result.text).toBe("retry response");
    expect(callCount).toBe(2);
  });

  it("strips reasoning content from response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "final",
              reasoning_content: "hidden",
            },
          },
        ],
        usage: { total_tokens: 10 },
      }),
    });

    const result = await callNvidia("test-key", "test-model", "sys", "user");
    expect(result.text).toBe("final");
  });

  it("merges AI_EXTRA_BODY into request", async () => {
    process.env.AI_EXTRA_BODY = '{"reasoning_effort":"low"}';
    let capturedBody: any;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
      capturedBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "ok" } }],
          usage: { total_tokens: 5 },
        }),
      };
    });

    await callNvidia("test-key", "test-model", "sys", "user", { jsonMode: true });
    expect(capturedBody.reasoning_effort).toBe("low");
    expect(capturedBody.response_format).toEqual({ type: "json_object" });
  });

  it("uses custom NVIDIA_BASE_URL", async () => {
    process.env.NVIDIA_BASE_URL = "https://custom.api.com/v1";
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "ok" } }],
          usage: { total_tokens: 5 },
        }),
      };
    });

    await callNvidia("test-key", "test-model", "sys", "user");
    expect(capturedUrl).toBe("https://custom.api.com/v1/chat/completions");
  });
});

// --- callNvidiaChat streaming ---
describe("callNvidiaChat", () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it("parses SSE stream and returns concatenated text", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n')
        );
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n')
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const result = await callNvidiaChat("key", "model", [
      { role: "user", content: "hi" },
    ], 10000);
    expect(result.text).toBe("hello world");
  });

  it("falls back to non-streaming on stream error", async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        body: null, // no body — triggers fallback
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "fallback response" } }],
          usage: { total_tokens: 15 },
        }),
      });

    const result = await callNvidiaChat("key", "model", [
      { role: "user", content: "hi" },
    ], 10000);
    expect(result.text).toBe("fallback response");
  });
});
