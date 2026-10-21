export const GITHUB_REPO_URL = "https://github.com/konandesigns/guardrail";
export const GITHUB_ACTION_NAME = "konandesignsin/guardrail@v1";

export async function getGitHubStarCount(): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/repos/konandesigns/guardrail", {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GuardRail-Web",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (typeof data.stargazers_count === "number") {
      return data.stargazers_count;
    }
    return null;
  } catch {
    return null;
  }
}
