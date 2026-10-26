import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  scans,
  findings,
  aiExplanations,
  aiUsage,
} from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import {
  explainFinding,
  computeCacheKey,
  AI_DAILY_LIMIT,
  PROMPT_VERSION,
  isEmailAllowed,
  resolveProviderConfig,
} from "@/lib/ai";
import { redactSnippet, isForbiddenFile } from "@/lib/ai/redact";
import type { ExplanationOutput } from "@/lib/ai/schema";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();

    // Email allowlist check (server-side only, case-insensitive)
    if (!isEmailAllowed(user.email)) {
      return NextResponse.json(
        { error: "AI explanations are currently disabled." },
        { status: 503 }
      );
    }

    // Kill switch or missing key check
    const config = resolveProviderConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "AI explanations are currently disabled." },
        { status: 503 }
      );
    }

    // Verify user opt-in
    if (!user.aiOptIn) {
      return NextResponse.json(
        { error: "AI explanations have not been enabled for your account." },
        { status: 403 }
      );
    }

    let body: {
      scanId?: string;
      findingId?: string;
      snippet?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { scanId, findingId, snippet } = body;
    if (!scanId || !findingId) {
      return NextResponse.json(
        { error: "scanId and findingId are required." },
        { status: 400 }
      );
    }

    // Security: verify the finding belongs to a scan owned by the user
    const [scanRow] = await db
      .select()
      .from(scans)
      .where(and(eq(scans.id, scanId), eq(scans.userId, user.id)))
      .limit(1);

    if (!scanRow) {
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    }

    const [findingRow] = await db
      .select()
      .from(findings)
      .where(and(eq(findings.id, findingId), eq(findings.scanId, scanRow.id)))
      .limit(1);

    if (!findingRow) {
      return NextResponse.json({ error: "Finding not found." }, { status: 404 });
    }

    // Verify forbidden files
    if (isForbiddenFile(findingRow.file)) {
      return NextResponse.json(
        { error: "AI explanations are not allowed for this file type." },
        { status: 400 }
      );
    }

    // Safe snippet of ~10 lines around the finding
    // If client provided a snippet, take it and cap lines; otherwise provide finding context
    const rawSnippet = snippet && typeof snippet === "string" ? snippet : `${findingRow.title}\n${findingRow.fix}`;
    const lines = rawSnippet.split("\n").slice(0, 15).join("\n");
    const redactedSnippet = redactSnippet(lines);

    // Compute cross-user cache key
    const cacheKey = computeCacheKey(findingRow.check || "default", redactedSnippet, PROMPT_VERSION);

    // Check cache in database
    const [cached] = await db
      .select()
      .from(aiExplanations)
      .where(eq(aiExplanations.cacheKey, cacheKey))
      .limit(1);

    if (cached) {
      let explanation: ExplanationOutput;
      try {
        explanation = JSON.parse(cached.rawResponse);
      } catch {
        explanation = {
          verdict: cached.verdict as "likely_real" | "likely_safe" | "unsure",
          confidence: parseFloat(cached.confidence) || 0.8,
          summary: cached.summary,
          why_it_matters: cached.whyItMatters,
          fix_steps: JSON.parse(cached.fixSteps || "[]"),
          fixed_code: cached.fixedCode || undefined,
        };
      }

      return NextResponse.json({
        cached: true,
        explanation,
        cacheKey,
      });
    }

    // Check user's daily limit in the database (serverless-friendly)
    const today = new Date().toISOString().slice(0, 10);
    const [usageRow] = await db
      .select()
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, user.id), eq(aiUsage.date, today)))
      .limit(1);

    const currentUsage = usageRow?.requestCount ?? 0;
    if (currentUsage >= AI_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `You have reached your daily limit of ${AI_DAILY_LIMIT} AI explanations. Please try again tomorrow.`,
          dailyLimitHit: true,
        },
        { status: 429 }
      );
    }

    // Call provider
    const aiResult = await explainFinding({
      ruleId: findingRow.check,
      severity: findingRow.severity as "high" | "medium" | "low",
      filePath: findingRow.file,
      lineNumber: findingRow.line,
      snippet: redactedSnippet,
    });

    if (!aiResult.success || !aiResult.explanation) {
      const httpStatus = aiResult.providerHttpStatus;
      const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
      // Log provider name and HTTP status only — never log snippets, prompts, or keys
      console.error(`[api/ai/explain] Provider failure: provider=${provider} status=${httpStatus ?? "unknown"}`);
      const statusSuffix = httpStatus ? ` (${httpStatus})` : "";
      return NextResponse.json(
        {
          error: `AI service temporarily unavailable${statusSuffix}. Showing static guidance instead.`,
          fallback: true,
        },
        { status: 502 }
      );
    }

    // Increment daily usage in database
    if (usageRow) {
      await db
        .update(aiUsage)
        .set({ requestCount: usageRow.requestCount + 1 })
        .where(eq(aiUsage.id, usageRow.id));
    } else {
      await db
        .insert(aiUsage)
        .values({
          userId: user.id,
          date: today,
          requestCount: 1,
        });
    }

    // Cache the validated JSON result in database (shared across users)
    const explanation = aiResult.explanation;
    await db
      .insert(aiExplanations)
      .values({
        cacheKey,
        ruleId: findingRow.check,
        promptVersion: PROMPT_VERSION,
        verdict: explanation.verdict,
        confidence: explanation.confidence.toString(),
        summary: explanation.summary,
        whyItMatters: explanation.why_it_matters,
        fixSteps: JSON.stringify(explanation.fix_steps),
        fixedCode: explanation.fixed_code || null,
        rawResponse: JSON.stringify(explanation),
      })
      .onConflictDoNothing();

    return NextResponse.json({
      cached: false,
      explanation,
      cacheKey,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const statusMatch = errMsg.match(/status\s+(\d{3})/i);
    console.error(`[api/ai/explain] Error: status=${statusMatch ? statusMatch[1] : "unknown"}`);
    return NextResponse.json(
      { error: "Internal server error while processing AI explanation." },
      { status: 500 }
    );
  }
}
