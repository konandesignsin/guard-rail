import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { isEmailAllowed, resolveProviderConfig, callNvidiaChat } from "@/lib/ai";
import { redactSnippet } from "@/lib/ai/redact";

const DAILY_LIMIT = 20;
const MAX_MESSAGE_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 20000;

const requestSchema = z.object({
  message: z.string().max(MAX_MESSAGE_LENGTH).min(1),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(6).default([]),
});

const systemPrompt = `You are GuardRail's security assistant on the dashboard. You help developers understand application security concepts, best practices, and general security questions.

CRITICAL RULES:
1. Answer ONLY questions about application security, code security, and related topics.
2. Be concise and practical. Give actionable advice.
3. NEVER ask for or repeat secrets. If a key was mentioned, remind the user to rotate it.
4. If unsure, say so. Never invent information.
5. Refuse unrelated requests politely (e.g., "I can only help with security questions").
6. Keep responses focused and under 200 words.
7. Use markdown formatting for clarity (bold, code blocks, lists).`;

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { message, history } = parsed.data;

    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("ignore previous instructions") ||
      lowerMessage.includes("ignore all instructions") ||
      lowerMessage.includes("system prompt") ||
      lowerMessage.includes("repeat your instructions")
    ) {
      return NextResponse.json(
        { error: "I can only help with security questions." },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser();
    if (!user.aiOptIn) {
      return NextResponse.json({ error: "AI opt-in required", requiresOptIn: true }, { status: 403 });
    }

    // Email allowlist check (server-side only, case-insensitive)
    if (!isEmailAllowed(user.email)) {
      return NextResponse.json({ error: "AI is disabled" }, { status: 403 });
    }

    const config = resolveProviderConfig();
    if (!config.enabled) {
      return NextResponse.json({ error: "AI is disabled" }, { status: 403 });
    }

    const { provider, model, apiKey } = config;
    const resolvedModel = provider === "gemini" ? (model || "gemini-3.8-flash") : model;
    if (!resolvedModel && provider !== "gemini") {
      return NextResponse.json({ error: "AI model not configured" }, { status: 500 });
    }

    // Redact user message before sending to AI
    const redactedMessage = redactSnippet(message);
    const redactedHistory = history.map((h) => ({
      role: h.role,
      content: h.role === "user" ? redactSnippet(h.content) : h.content,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...redactedHistory.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: redactedMessage },
    ];

    let responseText = "";

    try {
      if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const contents = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
        const systemMessages = messages.filter((m) => m.role === "system");
        const systemInstruction = systemMessages.map((m) => m.content).join("\n\n");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemInstruction }] },
              generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Gemini API error ${response.status}`);
          }

          const data = await response.json();
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } finally {
          clearTimeout(timeoutId);
        }
      } else if (provider === "nvidia") {
        const result = await callNvidiaChat(apiKey, resolvedModel, messages, REQUEST_TIMEOUT_MS);
        responseText = result.text;
      } else {
        const url = "https://api.groq.com/openai/v1/chat/completions";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: resolvedModel,
              messages,
              temperature: 0.7,
              max_tokens: 800,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Groq API error ${response.status}`);
          }

          const data = await response.json();
          responseText = data?.choices?.[0]?.message?.content || "";
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const statusMatch = errMsg.match(/API error\s+(\d{3})/i);
      const providerStatus = statusMatch ? statusMatch[1] : "unknown";
      console.error(`[Dashboard Chat] Provider failure: provider=${provider} status=${providerStatus}`);
      const statusSuffix = providerStatus !== "unknown" ? ` (${providerStatus})` : "";
      return NextResponse.json(
        { error: `AI service temporarily unavailable${statusSuffix}. Please try again.` },
        { status: 503 }
      );
    }

    return NextResponse.json({ response: responseText });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const statusMatch = errMsg.match(/status\s+(\d{3})/i);
    console.error(`[Dashboard Chat] Unexpected error: status=${statusMatch ? statusMatch[1] : "unknown"}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
