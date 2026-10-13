export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch: string;
}

export function parseGitHubUrl(raw: string): ParsedGitHubUrl {
  let url = raw.trim().replace(/\/+$/, "").replace(/\.git$/, "");

  // Handle /tree/<branch> or /tree/<branch>/path...
  let branch = "HEAD";
  const treeMatch = url.match(/\/tree\/([^/]+)/);
  if (treeMatch) {
    branch = decodeURIComponent(treeMatch[1]);
    url = url.slice(0, url.indexOf("/tree/"));
  }

  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error("Not a valid GitHub repository URL");
  }

  const owner = match[1];
  const repo = match[2];

  if (!owner || !repo) {
    throw new Error("GitHub URL must include both owner and repository name");
  }

  return { owner, repo, branch };
}

export function buildZipUrl(owner: string, repo: string, branch: string): string {
  return `https://codeload.github.com/${owner}/${repo}/zip/${encodeURIComponent(branch)}`;
}
