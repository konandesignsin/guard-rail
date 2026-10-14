import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/db";
import { scans, findings, aiExplanations, aiUsage, users } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { redactSnippet, isForbiddenFile } from "@/lib/ai/redact";
import { PROMPT_VERSION, AI_DAILY_LIMIT } from "@/lib/ai";

const fixPromptOutputSchema = z.object({
  title: z.string().max(200),
  prompt: z.string().max(3000),
  warnings: z.array(z.string().max(200)).max(5),
});

const fixPromptRequestSchema = z.object({
  scanId: z.string().uuid(),
  findingIds: z.array(z.string().uuid()).min(1).max(50),
  mode: z.enum(["single", "all"]).default("single"),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Auth check
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await req.json();
    const parsed = fixPromptRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { scanId, findingIds, mode } = parsed.data;

    // 3. Get user and check AI opt-in
    const user = await getOrCreateUser();
    if (!user.aiOptIn) {
      return NextResponse.json(
        { error: "AI opt-in required", requiresOptIn: true },
        { status: 403 }
      );
    }

    // 4. Check AI_ENABLED
    const aiEnabled = process.env.AI_ENABLED === "true";
    if (!aiEnabled) {
      return NextResponse.json({ error: "AI is disabled" }, { status: 403 });
    }

    // 5. Verify scan ownership
    const [scan] = await db
      .select()
      .from(scans)
      .where(and(eq(scans.id, scanId), eq(scans.userId, user.id)))
      .limit(1);

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // 6. Check daily limit
    const today = new Date().toISOString().split("T")[0];
    const [usageRow] = await db
      .select()
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, user.id), eq(aiUsage.date, today)))
      .limit(1);

    const currentCount = usageRow?.requestCount ?? 0;
    if (currentCount >= AI_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${AI_DAILY_LIMIT} requests). Try again tomorrow.`,
          limitReached: true,
        },
        { status: 429 }
      );
    }

    // 7. Fetch findings
    const scanFindings = await db
      .select()
      .from(findings)
      .where(eq(findings.scanId, scanId));

    const targetFindings = scanFindings.filter((f) => findingIds.includes(f.id));
    if (targetFindings.length === 0) {
      return NextResponse.json({ error: "No findings found" }, { status: 404 });
    }

    // 8. Check for forbidden files
    const forbiddenFinding = targetFindings.find((f) => isForbiddenFile(f.file));
    if (forbiddenFinding) {
      return NextResponse.json(
        { error: "Cannot generate fix prompt for this file type" },
        { status: 400 }
      );
    }

    // 9. Build the fix prompt
    let fixPrompt: string;
    let title: string;
    let warnings: string[] = [];

    if (mode === "all" || targetFindings.length > 1) {
      // Group findings by file
      const findingsByFile = new Map<string, typeof targetFindings>();
      for (const finding of targetFindings) {
        const existing = findingsByFile.get(finding.file) || [];
        existing.push(finding);
        findingsByFile.set(finding.file, existing);
      }

      // Sort by severity (high first)
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const sortedFindings = [...targetFindings].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );

      const top10 = sortedFindings.slice(0, 10);
      const remaining = sortedFindings.length - top10.length;

      title = `Fix ${sortedFindings.length} security finding${sortedFindings.length !== 1 ? "s" : ""}`;
      
      fixPrompt = `I have ${sortedFindings.length} security finding${sortedFindings.length !== 1 ? "s" : ""} to fix in my codebase.\n\n`;
      
      if (remaining > 0) {
        fixPrompt += `Showing top ${top10.length} by severity (${remaining} more not shown):\n\n`;
      }

      // Group by file
      for (const [file, fileFindings] of findingsByFile.entries()) {
        fixPrompt += `File: ${file}\n`;
        for (const finding of fileFindings) {
          const hasSecret = finding.title.toLowerCase().includes("secret") ||
                           finding.title.toLowerCase().includes("key") ||
                           finding.title.toLowerCase().includes("token");
          
          if (hasSecret) {
            fixPrompt += `- Line ${finding.line}: [${finding.severity.toUpperCase()}] ${finding.title}\n`;
            fixPrompt += `  ⚠️ ROTATE THIS KEY FIRST, then remove it from the code and move it to an environment variable.\n`;
            warnings.push(`Secret exposed in ${file}:${finding.line} - rotate immediately`);
          } else {
            fixPrompt += `- Line ${finding.line}: [${finding.severity.toUpperCase()}] ${finding.title}\n`;
          }
        }
        fixPrompt += `\n`;
      }

      fixPrompt += `For each finding:\n`;
      fixPrompt += `1. Explain what is wrong and why it matters\n`;
      fixPrompt += `2. Show the exact code changes needed\n`;
      fixPrompt += `3. Change ONLY what is needed to fix the issue\n`;
      fixPrompt += `4. Do not touch unrelated files or code\n`;
      fixPrompt += `5. Never print or commit secrets\n`;
      fixPrompt += `6. Keep existing behavior intact\n`;
      fixPrompt += `7. After all fixes, run the build and tests to verify nothing broke\n`;
    } else {
      // Single finding
      const finding = targetFindings[0];
      const hasSecret = finding.title.toLowerCase().includes("secret") ||
                       finding.title.toLowerCase().includes("key") ||
                       finding.title.toLowerCase().includes("token");

      title = `Fix: ${finding.title}`;

      if (hasSecret) {
        fixPrompt = `⚠️ ROTATE THIS KEY FIRST, then remove it from the code and move it to an environment variable.\n\n`;
        warnings.push(`Secret exposed in ${finding.file}:${finding.line} - rotate immediately`);
      } else {
        fixPrompt = "";
      }

      fixPrompt += `Fix this security finding:\n\n`;
      fixPrompt += `File: ${finding.file}\n`;
      fixPrompt += `Line: ${finding.line}\n`;
      fixPrompt += `Severity: ${finding.severity}\n`;
      fixPrompt += `Issue: ${finding.title}\n\n`;
      fixPrompt += `Context:\n${finding.explanation}\n\n`;
      fixPrompt += `Suggested approach:\n${finding.fix}\n\n`;
      fixPrompt += `Requirements:\n`;
      fixPrompt += `1. Show the exact code changes needed\n`;
      fixPrompt += `2. Change ONLY what is needed to fix this issue\n`;
      fixPrompt += `3. Do not touch unrelated files or code\n`;
      fixPrompt += `4. Never print or commit secrets\n`;
      fixPrompt += `5. Keep existing behavior intact\n`;
      fixPrompt += `6. Explain what you changed and why\n`;
      fixPrompt += `7. After the fix, run the build and tests to verify nothing broke\n`;
    }

    // 10. Try to enhance with AI (optional, can fail gracefully)
    let enhancedPrompt = fixPrompt;
    let usedAI = false;

    try {
      const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
      let model = process.env.AI_MODEL;
      let apiKey = "";

      if (provider === "gemini") {
        model = model || "gemini-2.5-flash";
        apiKey = process.env.GEMINI_API_KEY || "";
      } else if (provider === "groq") {
        apiKey = process.env.GROQ_API_KEY || "";
        if (!model) {
          throw new Error("AI_MODEL not configured for Groq");
        }
      } else {
        throw new Error("Unknown provider");
      }

      if (apiKey) {
        // Build AI request to enhance the prompt
        const systemPrompt = `You are a security code review assistant. You help developers create clear, actionable fix prompts for AI coding tools.

Given a security finding, generate a concise prompt that a developer can paste into ANY AI coding assistant to get help fixing the issue.

The prompt must:
1. Clearly state what is wrong
2. Include the file path and line number
3. Include a redacted snippet (replace secrets with [REDACTED])
4. State the exact outcome wanted
5. Include constraints: change only what is needed, do not touch unrelated files, never print or commit secrets, keep existing behavior
6. Request a short explanation of what changed
7. End with a final step: "run the build and tests"

For exposed secrets, the prompt MUST start with: "Rotate this key first, then remove it from the code and move it to an environment variable."

Output ONLY valid JSON with this structure:
{
  "title": "short title (max 200 chars)",
  "prompt": "the fix prompt (max 3000 chars)",
  "warnings": ["array of warning strings, max 5"]
}`;

        const userPrompt = `Generate a fix prompt for this finding:

File: ${targetFindings[0].file}
Line: ${targetFindings[0].line}
Severity: ${targetFindings[0].severity}
Title: ${targetFindings[0].title}
Explanation: ${targetFindings[0].explanation}
Suggested fix: ${targetFindings[0].fix}`;

        let aiResponse: string;
        if (provider === "gemini") {
          aiResponse = await callGeminiForFixPrompt(apiKey, model, systemPrompt, userPrompt);
        } else {
          aiResponse = await callGroqForFixPrompt(apiKey, model, systemPrompt, userPrompt);
        }

        // Parse and validate JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const validated = fixPromptOutputSchema.safeParse(parsed);
          if (validated.success) {
            enhancedPrompt = validated.data.prompt;
            title = validated.data.title;
            warnings = validated.data.warnings;
            usedAI = true;
          }
        }
      }
    } catch (err) {
      // AI enhancement failed, use the static prompt
      console.log(`[AI Fix Prompt] Enhancement failed, using static prompt: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 11. Update usage tracking
    if (usedAI) {
      if (usageRow) {
        await db
          .update(aiUsage)
          .set({
            requestCount: sql`${aiUsage.requestCount} + 1`,
          })
          .where(eq(aiUsage.id, usageRow.id));
      } else {
        await db.insert(aiUsage).values({
          userId: user.id,
          date: today,
          requestCount: 1,
        });
      }
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[AI Fix Prompt] Request complete: latencyMs=${latencyMs} usedAI=${usedAI} findings=${targetFindings.length}`);

    // 12. Return response
    return NextResponse.json({
      title,
      prompt: enhancedPrompt,
      warnings,
      usedAI,
      fallback: !usedAI,
    });
  } catch (error) {
    console.error("[AI Fix Prompt] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function callGeminiForFixPrompt(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 2000,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGroqForFixPrompt(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Groq API error ${response.status}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeoutId);
  }
}
