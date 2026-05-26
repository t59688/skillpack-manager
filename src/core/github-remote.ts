import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Parse owner/repo from a GitHub remote URL, if present. */
export function parseGitHubRemoteUrl(remote: string): string | undefined {
  const trimmed = remote.trim();
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;
  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?(?:\/.*)?$/i);
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;
  return undefined;
}

export async function inferGitHubRepoFromGit(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], { cwd });
    return parseGitHubRemoteUrl(stdout);
  } catch {
    return undefined;
  }
}
