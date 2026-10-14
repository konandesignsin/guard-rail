import { z } from "zod";

/**
 * Expected JSON output schema from AI explanations.
 * Strict zod validation with length constraints.
 */
export const explanationOutputSchema = z.object({
  verdict: z.enum(["likely_real", "likely_safe", "unsure"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(200),
  why_it_matters: z.string().max(500),
  fix_steps: z.array(z.string().max(200)).max(5),
  fixed_code: z.string().max(1500).optional(),
});

export type ExplanationOutput = z.infer<typeof explanationOutputSchema>;

/**
 * Validates and normalizes/truncates untrusted AI responses.
 * Returns null if the structure cannot be safely parsed.
 */
export function validateAndSanitizeAiResponse(rawJson: unknown): ExplanationOutput | null {
  try {
    if (!rawJson || typeof rawJson !== "object") return null;
    const obj = rawJson as Record<string, unknown>;

    // Pre-sanitize and truncate strings
    const sanitizedObj = {
      verdict: obj.verdict,
      confidence: typeof obj.confidence === "number" ? obj.confidence : Number(obj.confidence),
      summary: typeof obj.summary === "string" ? obj.summary.slice(0, 200).trim() : "",
      why_it_matters: typeof obj.why_it_matters === "string" ? obj.why_it_matters.slice(0, 500).trim() : "",
      fix_steps: Array.isArray(obj.fix_steps)
        ? obj.fix_steps.slice(0, 5).map((s) => (typeof s === "string" ? s.slice(0, 200).trim() : String(s).slice(0, 200)))
        : [],
      fixed_code: typeof obj.fixed_code === "string" ? obj.fixed_code.slice(0, 1500).trim() : undefined,
    };

    const parsed = explanationOutputSchema.safeParse(sanitizedObj);
    if (!parsed.success) {
      return null;
    }

    const data = parsed.data;
    return {
      verdict: data.verdict,
      confidence: Number(data.confidence.toFixed(2)),
      summary: data.summary,
      why_it_matters: data.why_it_matters,
      fix_steps: data.fix_steps,
      fixed_code: data.fixed_code,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and parses JSON from markdown-wrapped or raw text returned by LLMs.
 */
export function extractJsonFromResponse(text: string): unknown | null {
  if (!text) return null;
  let cleaned = text.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    // If wrapped in fences anywhere, extract the first fenced block
    const innerBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (innerBlock) {
      cleaned = innerBlock[1].trim();
    }
  }

  // Find the first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
