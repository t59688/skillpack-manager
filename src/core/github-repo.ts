import { getGitHubLogin, parseGitHubRepo } from "./github.js";
import { SkillPackError } from "../utils/errors.js";

const OWNER_REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REPO_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** True when input is a single repo name without owner (e.g. `xx1234`). */
export function isRepoNameOnly(input: string): boolean {
  const trimmed = input.trim();
  return REPO_NAME_PATTERN.test(trimmed) && !trimmed.includes("/");
}

/**
 * Normalize `owner/repo` or `repo` (requires token to resolve GitHub username as owner).
 */
export async function resolveGitHubRepoInput(input: string, token?: string): Promise<string> {
  const trimmed = input.trim();
  if (OWNER_REPO_PATTERN.test(trimmed)) {
    parseGitHubRepo(trimmed);
    return trimmed;
  }
  if (isRepoNameOnly(trimmed)) {
    if (!token) {
      throw new SkillPackError(
        `Repository "${trimmed}" needs an owner. Use owner/repo (example: t59688/${trimmed}) or set GITHUB_TOKEN/GH_TOKEN to infer your username.`,
        "GITHUB_REPO_INCOMPLETE",
      );
    }
    const login = await getGitHubLogin(token);
    const full = `${login}/${trimmed}`;
    parseGitHubRepo(full);
    return full;
  }
  throw new SkillPackError(`Invalid repository "${input}". Use owner/repo or a repo name with a GitHub token.`, "INVALID_GITHUB_REPO");
}
