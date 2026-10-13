import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGitHubToken, listUserRepos } from "@/lib/github-api";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let token: string;
    try {
      token = await getGitHubToken(userId);
    } catch (err) {
      if (err instanceof Error && err.message === "NO_GITHUB_CONNECTION") {
        return NextResponse.json(
          { error: "NOT_CONNECTED", message: "Please connect your GitHub account first." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "TOKEN_ERROR", message: "Could not retrieve your GitHub access token." },
        { status: 500 }
      );
    }

    let repos;
    try {
      repos = await listUserRepos(token);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "GITHUB_TOKEN_EXPIRED") {
          return NextResponse.json(
            { error: "TOKEN_EXPIRED", message: "Your GitHub connection has expired. Please reconnect." },
            { status: 401 }
          );
        }
        if (err.message === "GITHUB_RATE_LIMIT") {
          return NextResponse.json(
            { error: "RATE_LIMIT", message: "GitHub API rate limit exceeded. Please try again in a few minutes." },
            { status: 429 }
          );
        }
        if (err.message === "GITHUB_ACCESS_DENIED") {
          return NextResponse.json(
            { error: "ACCESS_DENIED", message: "GitHub access denied. Please check your permissions." },
            { status: 403 }
          );
        }
      }
      return NextResponse.json(
        { error: "API_ERROR", message: "Could not fetch your repositories from GitHub." },
        { status: 500 }
      );
    }

    return NextResponse.json({ repos });
  } catch (err) {
    console.error("GitHub repos API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Something went wrong on our end." },
      { status: 500 }
    );
  }
}
