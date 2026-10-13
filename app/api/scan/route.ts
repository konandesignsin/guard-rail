import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { scans, findings, usage, scanFiles } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { parseGitHubUrl, buildZipUrl } from "@/lib/github-url";
import { fetchRepoFiles, processZipBuffer } from "@/lib/fetch-repo";
import { audit } from "@/lib/guardrail";
import {
  getGitHubToken,
  downloadRepoZipball,
  ALLOW_PRIVATE_REPOS,
} from "@/lib/github-api";

const MAX_SCANS_PER_DAY = 5;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "You must be signed in to scan." }, { status: 401 });
    }

    const user = await getOrCreateUser();

    // Rate limit check
    const today = new Date().toISOString().slice(0, 10);
    const [todayUsage] = await db
      .select()
      .from(usage)
      .where(and(eq(usage.userId, user.id), eq(usage.date, today)))
      .limit(1);

    const currentCount = todayUsage?.scanCount ?? 0;
    if (currentCount >= MAX_SCANS_PER_DAY) {
      return NextResponse.json(
        {
          error: `You've used all ${MAX_SCANS_PER_DAY} free scans for today. Come back tomorrow!`,
        },
        { status: 429 },
      );
    }

    let body: { repoUrl?: string; source?: string; repo?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Please send a valid JSON body." }, { status: 400 });
    }

    let files;
    let repoName: string;
    let scanSource: "url" | "zip" | "github" = "url";

    // GitHub source: { source: "github", repo: "owner/name" }
    if (body.source === "github" && body.repo) {
      const repo = body.repo;
      if (typeof repo !== "string" || !repo.includes("/")) {
        return NextResponse.json(
          { error: "Please provide a repository in the format 'owner/name'." },
          { status: 400 }
        );
      }

      const [owner, name] = repo.split("/");
      if (!owner || !name) {
        return NextResponse.json(
          { error: "Invalid repository format. Use 'owner/name'." },
          { status: 400 }
        );
      }

      repoName = repo;
      scanSource = "github";

      // Get GitHub token
      let token: string;
      try {
        token = await getGitHubToken(user.clerkId);
      } catch (err) {
        if (err instanceof Error && err.message === "NO_GITHUB_CONNECTION") {
          return NextResponse.json(
            { error: "Please connect your GitHub account first." },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Could not retrieve your GitHub access token." },
          { status: 500 }
        );
      }

      // Verify repo is public (while ALLOW_PRIVATE_REPOS is false)
      if (!ALLOW_PRIVATE_REPOS) {
        const repoInfoResponse = await fetch(
          `https://api.github.com/repos/${owner}/${name}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );

        if (!repoInfoResponse.ok) {
          if (repoInfoResponse.status === 404) {
            return NextResponse.json(
              { error: "Repository not found or you don't have access." },
              { status: 404 }
            );
          }
          if (repoInfoResponse.status === 401) {
            return NextResponse.json(
              { error: "Your GitHub connection has expired. Please reconnect." },
              { status: 401 }
            );
          }
          return NextResponse.json(
            { error: "Could not verify repository access." },
            { status: 500 }
          );
        }

        const repoInfo = await repoInfoResponse.json();
        if (repoInfo.private) {
          return NextResponse.json(
            { error: "Private repositories are not supported yet. Please select a public repository." },
            { status: 400 }
          );
        }
      }

      // Download zipball with token
      let zipBuffer: Uint8Array;
      try {
        zipBuffer = await downloadRepoZipball(owner, name, token);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === "REPO_NOT_FOUND") {
            return NextResponse.json(
              { error: "Repository not found or you don't have access." },
              { status: 404 }
            );
          }
          if (err.message === "GITHUB_TOKEN_EXPIRED") {
            return NextResponse.json(
              { error: "Your GitHub connection has expired. Please reconnect." },
              { status: 401 }
            );
          }
        }
        return NextResponse.json(
          { error: "Could not download repository archive." },
          { status: 500 }
        );
      }

      // Process the zip buffer
      try {
        files = processZipBuffer(zipBuffer);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not process repository archive.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    // URL source: { repoUrl: "..." }
    else if (body.repoUrl) {
      const repoUrl = body.repoUrl;
      if (typeof repoUrl !== "string") {
        return NextResponse.json({ error: "Please provide a GitHub repository URL." }, { status: 400 });
      }

      if (!repoUrl.includes("github.com/")) {
        return NextResponse.json(
          { error: "That doesn't look like a GitHub URL. Please use https://github.com/owner/repository." },
          { status: 400 }
        );
      }

      let parsed;
      try {
        parsed = parseGitHubUrl(repoUrl);
      } catch {
        return NextResponse.json(
          { error: "We couldn't read that GitHub URL. Make sure it looks like https://github.com/owner/repository." },
          { status: 400 }
        );
      }

      const zipUrl = buildZipUrl(parsed.owner, parsed.repo, parsed.branch);
      repoName = `${parsed.owner}/${parsed.repo}`;
      scanSource = "url";

      try {
        files = await fetchRepoFiles(zipUrl);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong while scanning.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Please provide either a GitHub repository URL or a repository name." },
        { status: 400 }
      );
    }

    // Create scan record
    const [scanRow] = await db
      .insert(scans)
      .values({
        userId: user.id,
        source: scanSource,
        repoName,
        status: "running",
      })
      .returning();

    try {
      const result = audit(files);

      // Save file metadata only for heat map (never store file contents!)
      if (files && files.length > 0) {
        const fileFindingCounts: Record<string, number> = {};
        for (const f of result.findings) {
          fileFindingCounts[f.file] = (fileFindingCounts[f.file] || 0) + 1;
        }

        const textEncoder = new TextEncoder();
        const fileRecords = files.map((file) => ({
          scanId: scanRow.id,
          path: file.path,
          bytes: textEncoder.encode(file.content || "").length,
          findingCount: fileFindingCounts[file.path] || 0,
        }));

        await db.insert(scanFiles).values(fileRecords);
      }

      // Save findings
      if (result.findings.length > 0) {
        await db.insert(findings).values(
          result.findings.map((f) => ({
            scanId: scanRow.id,
            severity: f.severity,
            check: f.check,
            title: f.title,
            explanation: f.explanation,
            fix: f.fix,
            file: f.file,
            line: f.line,
          })),
        );
      }

      // Update scan with results
      await db
        .update(scans)
        .set({ status: "done", score: result.score })
        .where(eq(scans.id, scanRow.id));

      // Update usage count
      if (todayUsage) {
        await db
          .update(usage)
          .set({ scanCount: todayUsage.scanCount + 1 })
          .where(eq(usage.id, todayUsage.id));
      } else {
        await db.insert(usage).values({ userId: user.id, date: today, scanCount: 1 });
      }

      return NextResponse.json({ scanId: scanRow.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong while scanning.";
      await db
        .update(scans)
        .set({ status: "failed", error: message })
        .where(eq(scans.id, scanRow.id));

      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("Scan API error:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 500 },
    );
  }
}
