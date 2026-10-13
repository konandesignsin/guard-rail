import { unzipSync } from "fflate";
import type { FileInput } from "@/lib/guardrail/types";

const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 1 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".cache", "coverage", "__pycache__"]);

const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif", ".bmp", ".tiff",
  ".mp4", ".webm", ".mov", ".avi", ".mp3", ".wav", ".ogg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".lock",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg",
  ".html", ".htm", ".css", ".scss", ".sass", ".less",
  ".sql", ".graphql", ".gql",
  ".md", ".mdx", ".txt", ".csv",
  ".env", ".example",
  ".gitignore", ".dockerignore", ".editorconfig",
  ".svelte", ".vue", ".astro",
  ".py", ".rb", ".go", ".rs", ".java", ".kt",
  ".sh", ".bash", ".zsh", ".fish",
  ".xml", ".plist",
]);

function shouldSkipPath(parts: string[]): boolean {
  for (const part of parts) {
    if (part === "..") return true;
    if (SKIP_DIRS.has(part)) return true;
  }
  return false;
}

function shouldSkipFile(name: string): boolean {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1) {
    // No extension — include lockfiles by name pattern
    if (lower.endsWith("-lock") || lower === "lockfile" || lower === "yarn.lock" || lower === "pnpm-lock.yaml") {
      return true;
    }
    return false;
  }
  const ext = lower.slice(dot);
  if (SKIP_EXTENSIONS.has(ext)) return true;
  // Lockfiles by name
  if (lower === "package-lock.json" || lower === "yarn.lock" || lower === "pnpm-lock.yaml") return true;
  return false;
}

function isTextFile(name: string): boolean {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1) {
    // Include common extensionless text files
    return lower === ".gitignore" || lower === ".env" || lower === ".env.example" ||
      lower === "dockerfile" || lower === "makefile" || lower === "license" || lower === "readme";
  }
  const ext = lower.slice(dot);
  return TEXT_EXTENSIONS.has(ext) || ext === ".json" || ext === ".lock";
}

export async function fetchRepoFiles(zipUrl: string): Promise<FileInput[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(zipUrl, {
      signal: controller.signal,
      headers: { Accept: "application/zip" },
      redirect: "follow",
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Timed out downloading the repository. It may be too large.");
    }
    throw new Error("Could not download the repository. Make sure it is public and the link is correct.");
  }
  clearTimeout(timer);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("We couldn't find that repo. Make sure it's public and the link is correct.");
    }
    throw new Error(`GitHub returned an error (${response.status}). The repository may be private or unavailable.`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_TOTAL_BYTES) {
    throw new Error("This repository is larger than 50 MB and can't be scanned.");
  }

  const buffer = new Uint8Array(await response.arrayBuffer());

  if (buffer.byteLength > MAX_TOTAL_BYTES) {
    throw new Error("This repository is larger than 50 MB and can't be scanned.");
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buffer);
  } catch {
    throw new Error("Could not read the repository archive. Please try again.");
  }

  const fileNames = Object.keys(entries);
  if (fileNames.length > MAX_FILES) {
    throw new Error(`This repository has ${fileNames.length} files, which exceeds the 2,000 file limit.`);
  }

  // Detect the root directory prefix (GitHub zips have a top-level folder like "repo-main/")
  const topDirs = new Set<string>();
  for (const name of fileNames) {
    const slash = name.indexOf("/");
    if (slash !== -1) topDirs.add(name.slice(0, slash + 1));
  }
  const rootPrefix = topDirs.size === 1 ? [...topDirs][0] : "";

  const files: FileInput[] = [];

  for (const name of fileNames) {
    if (name.endsWith("/")) continue; // skip directories

    const data = entries[name];
    if (!data) continue;
    if (data.byteLength > MAX_FILE_BYTES) continue;

    const relativePath = rootPrefix && name.startsWith(rootPrefix)
      ? name.slice(rootPrefix.length)
      : name;

    if (!relativePath) continue;

    const parts = relativePath.split("/");
    if (shouldSkipPath(parts)) continue;

    const fileName = parts[parts.length - 1];
    if (shouldSkipFile(fileName)) continue;

    if (!isTextFile(fileName)) continue;

    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: false }).decode(data);
    } catch {
      continue;
    }

    // Skip binary-looking files (files with null bytes)
    if (content.includes("\0")) continue;

    files.push({ path: relativePath, content });
  }

  if (files.length === 0) {
    throw new Error("No scannable files found in this repository.");
  }

  return files;
}
