/**
 * Redaction utility for AI Explanations.
 *
 * Ensures NO secrets or sensitive tokens leave Guardrail.
 * Unit tested and strictly enforced before any prompt creation.
 */

// Common secret patterns specified in requirements:
// sk_, sk-, AKIA, ghp_, AIza, JWT-like eyJ... strings, long hex or base64 strings, private key blocks
const REDACTION_PATTERNS: { regex: RegExp; replacement: string }[] = [
  // Private key blocks (PEM blocks)
  {
    regex: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----/gi,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  // JWT-like eyJ... strings (header.payload.signature)
  {
    regex: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    replacement: "[REDACTED_JWT]",
  },
  // OpenAI / Stripe / modern API keys: sk-..., sk_live_..., sk_test_...
  {
    regex: /\bsk[-_][A-Za-z0-9_-]{16,}\b/g,
    replacement: "[REDACTED_API_KEY]",
  },
  // AWS Access Key ID
  {
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: "[REDACTED_AWS_KEY]",
  },
  // GitHub Personal Access Token
  {
    regex: /\bghp_[A-Za-z0-9]{30,}\b/g,
    replacement: "[REDACTED_GITHUB_TOKEN]",
  },
  // Google API Key
  {
    regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
    replacement: "[REDACTED_GOOGLE_KEY]",
  },
  // Long hex strings (32 or more hex characters, e.g. md5/sha256/hashes/secret keys)
  {
    regex: /\b[0-9a-fA-F]{32,}\b/g,
    replacement: "[REDACTED_HEX]",
  },
  // Long base64 strings (40 or more chars ending with optional ==)
  {
    regex: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,
    replacement: "[REDACTED_BASE64]",
  },
];

/**
 * Redacts common secrets and sensitive tokens from source code snippets.
 * Safe to call on any text before passing to external AI providers.
 */
export function redactSnippet(snippet: string): string {
  if (!snippet) return "";
  let redacted = snippet;

  for (const { regex, replacement } of REDACTION_PATTERNS) {
    // Reset regex index if global
    regex.lastIndex = 0;
    redacted = redacted.replace(regex, replacement);
  }

  return redacted;
}

/**
 * Checks whether a file path is forbidden from being sent to AI providers.
 * Requirement: Never whole files, never .env* files, never package-lock files.
 */
export function isForbiddenFile(filePath: string): boolean {
  if (!filePath) return true;
  const normalized = filePath.toLowerCase().replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() || "";

  if (fileName.startsWith(".env")) return true;
  if (fileName === "package-lock.json") return true;
  if (fileName === "pnpm-lock.yaml") return true;
  if (fileName === "yarn.lock") return true;
  if (fileName === "bun.lockb") return true;

  return false;
}
