import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { scans, findings, usage } from "@/db/schema";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { parseGitHubUrl, buildZipUrl } from "@/lib/github-url";
import { fetchRepoFiles } from "@/lib/fetch-repo";
import { audit } from "@/lib/guardrail";

const MAX_SCANS_PER_DAY = 5;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "You must be signed in to scan." }, { status: 401 });
    }

    const user = await getOrCreateUser();

    // Rate limit check
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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

    let body: { repoUrl?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Please send a valid JSON body with a repoUrl field." }, { status: 400 });
    }

    const repoUrl = body.repoUrl;
    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json({ error: "Please provide a GitHub repository URL." }, { status: 400 });
    }

    if (!repoUrl.includes("github.com/")) {
      return NextResponse.json(
        { error: "That doesn't look like a GitHub URL. Please use https://github.com/owner/repository." },
        { status: 400 },
      );
    }

    let parsed;
    try {
      parsed = parseGitHubUrl(repoUrl);
    } catch {
      return NextResponse.json(
        { error: "We couldn't read that GitHub URL. Make sure it looks like https://github.com/owner/repository." },
        { status: 400 },
      );
    }

    const zipUrl = buildZipUrl(parsed.owner, parsed.repo, parsed.branch);
    const repoName = `${parsed.owner}/${parsed.repo}`;

    // Create scan record
    const [scanRow] = await db
      .insert(scans)
      .values({
        userId: user.id,
        source: "github",
        repoName,
        status: "running",
      })
      .returning();

    try {
      const files = await fetchRepoFiles(zipUrl);
      const result = audit(files);

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
