import assert from "node:assert";
import { redactSnippet, isForbiddenFile } from "../lib/ai/redact";
import {
  validateAndSanitizeAiResponse,
  extractJsonFromResponse,
} from "../lib/ai/schema";
import {
  computeCacheKey,
  PROMPT_VERSION,
  getCircuitBreakerStatus,
  recordAiFailure,
  recordAiSuccess,
  resetCircuitBreakerForTesting,
} from "../lib/ai";

console.log("=== Running AI Explanations Unit Tests ===");

// 1. Redaction tests
console.log("\n[1] Testing Redaction...");

// OpenAI key
const openAiKey = ["sk-", "1234567890abcdef1234567890abcdef"].join("");
const redactedOpenAi = redactSnippet(`const key = "${openAiKey}";`);
assert(!redactedOpenAi.includes(openAiKey), "OpenAI key must be redacted");
assert(redactedOpenAi.includes("[REDACTED_API_KEY]"), "Should have [REDACTED_API_KEY] replacement");

// Stripe secret key
const stripeKey = ["sk", "_", "live_", "1234567890abcdef1234567890"].join("");
const redactedStripe = redactSnippet(`const stripeSecret = '${stripeKey}';`);
assert(!redactedStripe.includes(stripeKey), "Stripe secret key must be redacted");

// AWS access key
const awsKey = ["AK", "IA", "IOSFODNN7EXAMPLE"].join("");
const redactedAws = redactSnippet(`AWS_KEY = "${awsKey}"`);
assert(!redactedAws.includes(awsKey), "AWS key must be redacted");
assert(redactedAws.includes("[REDACTED_AWS_KEY]"), "Should have [REDACTED_AWS_KEY] replacement");

// GitHub PAT
const ghpToken = ["gh", "p_", "1234567890abcdefghijklmnopqrstuvwxyz"].join("");
const redactedGhp = redactSnippet(`git token: ${ghpToken}`);
assert(!redactedGhp.includes(ghpToken), "ghp token must be redacted");
assert(redactedGhp.includes("[REDACTED_GITHUB_TOKEN]"), "Should have [REDACTED_GITHUB_TOKEN] replacement");

// Google API Key
const googleKey = ["AI", "za", "SyD-1234567890abcdef1234567890abcd"].join("");
const redactedGoogle = redactSnippet(`google key: ${googleKey}`);
assert(!redactedGoogle.includes(googleKey), "Google key must be redacted");
assert(redactedGoogle.includes("[REDACTED_GOOGLE_KEY]"), "Should have [REDACTED_GOOGLE_KEY] replacement");

// JWT like eyJ...
const jwt = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9",
  "abcdefghijklmnopqrstuvwxyz",
].join(".");
const redactedJwt = redactSnippet(`const jwt = "${jwt}";`);
assert(!redactedJwt.includes(jwt), "JWT must be redacted");
assert(redactedJwt.includes("[REDACTED_JWT]"), "Should have [REDACTED_JWT] replacement");

// Private Key Block
const pemKey = [
  ["-----", "BEGIN", " RSA ", "PRIVATE ", "KEY-----"].join(""),
  "MIIEowIBAAKCAQEA0Y1234567890abcdef...",
  ["-----", "END", " RSA ", "PRIVATE ", "KEY-----"].join(""),
].join("\n");
const redactedPem = redactSnippet(`Cert:\n${pemKey}`);
assert(!redactedPem.includes("MIIEow"), "Private key block must be redacted");
assert(redactedPem.includes("[REDACTED_PRIVATE_KEY]"), "Should have [REDACTED_PRIVATE_KEY] replacement");

// Long hex strings
const longHex = "0123456789abcdef0123456789abcdef01234567";
const redactedHex = redactSnippet(`hash = "${longHex}"`);
assert(!redactedHex.includes(longHex), "Long hex must be redacted");

// Prohibited files
assert(isForbiddenFile(".env"), ".env must be forbidden");
assert(isForbiddenFile(".env.local"), ".env.local must be forbidden");
assert(isForbiddenFile(".env.production"), ".env.production must be forbidden");
assert(isForbiddenFile("package-lock.json"), "package-lock.json must be forbidden");
assert(isForbiddenFile("yarn.lock"), "yarn.lock must be forbidden");
assert(!isForbiddenFile("src/components/button.tsx"), "Normal file must be allowed");

console.log("✓ Redaction and file protection tests passed.");

// 2. JSON Validation tests
console.log("\n[2] Testing JSON Validation and Sanitization...");

// Valid JSON object
const validRaw = {
  verdict: "likely_real",
  confidence: 0.95,
  summary: "This is a real leaked key.",
  why_it_matters: "An attacker could gain full administrative access.",
  fix_steps: ["Revoke the key immediately", "Use environment variables"],
  fixed_code: "const key = process.env.API_KEY;",
};
const sanitized = validateAndSanitizeAiResponse(validRaw);
assert(sanitized !== null, "Valid response must be accepted");
assert.strictEqual(sanitized?.verdict, "likely_real");
assert.strictEqual(sanitized?.confidence, 0.95);
assert.strictEqual(sanitized?.fix_steps.length, 2);

// Invalid verdict
const invalidVerdict = { ...validRaw, verdict: "not_a_valid_verdict" };
assert.strictEqual(validateAndSanitizeAiResponse(invalidVerdict), null, "Invalid verdict must be rejected");

// Out of bounds confidence
const outOfBoundsConf = { ...validRaw, confidence: 1.5 };
assert.strictEqual(validateAndSanitizeAiResponse(outOfBoundsConf), null, "Confidence > 1 must be rejected");

// Long strings truncation
const overlyLongSummary = "A".repeat(300);
const longData = { ...validRaw, summary: overlyLongSummary };
const sanitizedLong = validateAndSanitizeAiResponse(longData);
assert.strictEqual(sanitizedLong?.summary.length, 200, "Summary must be capped at 200 chars");

// JSON extraction from markdown code fences
const fencedMarkdown = "```json\n" + JSON.stringify(validRaw) + "\n```";
const extracted = extractJsonFromResponse(fencedMarkdown);
assert.deepStrictEqual(extracted, validRaw, "Markdown fences must be parsed properly");

console.log("✓ JSON validation and sanitization tests passed.");

// 3. Cache Key tests
console.log("\n[3] Testing Caching Key Consistency...");
const key1 = computeCacheKey("secrets", "line 1\nline 2", PROMPT_VERSION);
const key2 = computeCacheKey("secrets", "line 1\nline 2", PROMPT_VERSION);
const key3 = computeCacheKey("secrets", "different snippet", PROMPT_VERSION);
assert.strictEqual(key1, key2, "Same inputs must yield identical cache keys");
assert.notStrictEqual(key1, key3, "Different snippets must yield different cache keys");
assert.strictEqual(typeof key1, "string");
assert.strictEqual(key1.length, 64, "SHA-256 hash must be 64 characters");

console.log("✓ Cache key tests passed.");

// 4. Circuit Breaker tests
console.log("\n[4] Testing Circuit Breaker...");
resetCircuitBreakerForTesting();
assert(!getCircuitBreakerStatus().isOpen, "Circuit must initially be closed");

recordAiFailure();
assert(!getCircuitBreakerStatus().isOpen, "Circuit still closed after 1 failure");

recordAiFailure();
assert(!getCircuitBreakerStatus().isOpen, "Circuit still closed after 2 failures");

recordAiFailure();
assert(getCircuitBreakerStatus().isOpen, "Circuit must open after 3 consecutive failures");

recordAiSuccess();
assert(!getCircuitBreakerStatus().isOpen, "Circuit must reset upon success");

console.log("✓ Circuit breaker tests passed.");

console.log("\n ALL TESTS COMPLETED SUCCESSFULLY! \n");
