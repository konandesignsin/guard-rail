import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

export const ALLOW_PRIVATE_REPOS = false;

export interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  updated_at: string;
  default_branch: string;
  private: boolean;
}

export async function getGitHubToken(userId: string): Promise<string> {
  try {
    const clerk = await clerkClient();
    const { data } = await clerk.users.getUserOauthAccessToken(
      userId,
      "oauth_github"
    );

    const githubAccount = data[0];
    if (!githubAccount || !("token" in githubAccount) || !githubAccount.token) {
      throw new Error("NO_GITHUB_CONNECTION");
    }

    return githubAccount.token as string;
  } catch (err) {
    if (err instanceof Error && err.message === "NO_GITHUB_CONNECTION") {
      throw err;
    }
    throw new Error("Could not retrieve GitHub access token");
  }
}

export async function listUserRepos(token: string): Promise<GitHubRepo[]> {
  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("GITHUB_TOKEN_EXPIRED");
    }
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      if (rateLimitRemaining === "0") {
        throw new Error("GITHUB_RATE_LIMIT");
      }
      throw new Error("GITHUB_ACCESS_DENIED");
    }
    throw new Error("GITHUB_API_ERROR");
  }

  const repos: GitHubRepo[] = await response.json();

  if (!ALLOW_PRIVATE_REPOS) {
    return repos.filter((r) => !r.private);
  }

  return repos;
}

export async function downloadRepoZipball(
  owner: string,
  repo: string,
  token: string
): Promise<Uint8Array> {
  const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

  const response = await fetch(zipballUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "manual",
  });

  const isRedirect = response.status >= 300 && response.status < 400;
  if (!isRedirect) {
    if (response.status === 404) {
      throw new Error("REPO_NOT_FOUND");
    }
    if (response.status === 401) {
      throw new Error("GITHUB_TOKEN_EXPIRED");
    }
    throw new Error("GITHUB_API_ERROR");
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("GITHUB_NO_REDIRECT");
  }

  const redirectUrl = new URL(location, "https://api.github.com");
  if (redirectUrl.hostname !== "codeload.github.com") {
    throw new Error("GITHUB_UNEXPECTED_REDIRECT");
  }

  const archiveResponse = await fetch(redirectUrl.toString(), {
    redirect: "follow",
  });

  if (!archiveResponse.ok) {
    throw new Error("ARCHIVE_DOWNLOAD_FAILED");
  }

  return new Uint8Array(await archiveResponse.arrayBuffer());
}
