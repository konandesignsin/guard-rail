import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { isEmailAllowed, resolveProviderConfig, callNvidiaChat } from "@/lib/ai";
import { redactSnippet } from "@/lib/ai/redact";
import { db } from "@/db";
import { scans, findings } from "@/db/schema";

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

const systemPrompt = `You're GuardRail's security assistant — friendly, concise, and practical.

You can help with:
- Security questions about code, web apps, APIs, and infrastructure
- Explaining scan findings and security scores
- Answering questions about the user's recent scans
- General security best practices and recommendations

Be casual and warm. If someone says "hey" or "hi", greet them back naturally and mention what you can help with. Don't be robotic.

Keep responses under ~150 words unless asked for more detail. Use markdown for clarity (bold, bullet lists, inline code).

NEVER ask for or repeat secrets. If a key or credential is mentioned, remind the user to rotate it.
Only politely redirect when the question is clearly unrelated to code, security, or the app.`;

const SCAN_KEYWORDS = [
  /\bmy\s+(last|latest|recent|most\s+recent)\b/i,
  /\bmy\s+(scan|scans|repo|repos|repository|findings|results|score)\b/i,
  /\b(last|latest|recent)\s+scan\b/i,
  /\b(scan\s+result|scan\s+finding|scan\s+score)\b/i,
  /\bexplain\s+my\b/i,
  /\bwhat.*(found|detected|flagged)\b/i,
  /\bhow\s+secure\b/i,
  /\bsecurity\s+score\b/i,
];

function isScanRelated(message: string): boolean {
  return SCAN_KEYWORDS.some((re) => re.test(message));
}

async function buildScanContext(userId: string): Promise<string | null> {
  const [recentScan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, userId), eq(scans.status, "done")))
    .orderBy(desc(scans.createdAt))
    .limit(1);

  if (!recentScan) return null;

  const scanFindings = await db
    .select({
      severity: findings.severity,
      title: findings.title,
      check: findings.check,
      file: findings.file,
    })
    .from(findings)
    .where(eq(findings.scanId, recentScan.id))
    .orderBy(desc(findings.severity))
    .limit(10);

  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of scanFindings) {
    counts[f.severity as keyof typeof counts]++;
  }

  const repoName = recentScan.repoName ?? "a repository";
  const score = recentScan.score ?? "N/A";
  const date = recentScan.createdAt.toISOString().split("T")[0];

  let ctx = `User's most recent scan:\n- Repo: ${repoName}\n- Score: ${score}/100\n- Date: ${date}\n- Findings: ${counts.high} high, ${counts.medium} medium, ${counts.low} low`;

  if (scanFindings.length > 0) {
    ctx += "\n\nTop findings:";
    for (const f of scanFindings.slice(0, 5)) {
      ctx += `\n- [${f.severity.toUpperCase()}] ${f.title} (${f.file})`;
    }
  }

  return ctx;
}

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
      return NextResponse.json(
        { error: "AI is turned off in Settings", code: "ai_opt_in_required", requiresOptIn: true },
        { status: 403 }
      );
    }

    if (!isEmailAllowed(user.email)) {
      return NextResponse.json(
        { error: "AI isn't available for this account yet", code: "ai_email_not_allowed" },
        { status: 403 }
      );
    }

    const config = resolveProviderConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "AI is disabled on this server", code: "ai_server_disabled" },
        { status: 403 }
      );
    }

    const { provider, model, apiKey } = config;
    const resolvedModel = provider === "gemini" ? (model || "gemini-3.8-flash") : model;
    if (!resolvedModel && provider !== "gemini") {
      return NextResponse.json({ error: "AI model not configured" }, { status: 500 });
    }

    const redactedMessage = redactSnippet(message);
    const redactedHistory = history.map((h) => ({
      role: h.role,
      content: h.role === "user" ? redactSnippet(h.content) : h.content,
    }));

    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (isScanRelated(message)) {
      const scanCtx = await buildScanContext(user.id);
      if (scanCtx) {
        aiMessages.push({
          role: "system",
          content: `Scan context (from the user's own account):\n${scanCtx}`,
        });
      } else {
        aiMessages.push({
          role: "system",
          content: "The user has no completed scans yet. Let them know and suggest pasting a public GitHub repo URL to start a scan.",
        });
      }
    }

    aiMessages.push(...redactedHistory.map((h) => ({ role: h.role, content: h.content })));
    aiMessages.push({ role: "user", content: redactedMessage });

    let responseText = "";

    try {
      if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const contents = aiMessages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
        const systemMessages = aiMessages.filter((m) => m.role === "system");
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
        const result = await callNvidiaChat(apiKey, resolvedModel, aiMessages, REQUEST_TIMEOUT_MS);
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
              messages: aiMessages,
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
