import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { loadGitHubToken, saveGitHubToken } from "./state.js";
import { openUrl } from "../utils/browser.js";
import { SkillPackError } from "../utils/errors.js";
import { isInteractive } from "../utils/prompts.js";
import { promptSecret } from "../utils/prompts.js";

/** Classic PAT page with repo scope (create releases & upload assets). */
export const GITHUB_PAT_CREATE_URL =
  "https://github.com/settings/tokens/new?description=skillpack-cli&scopes=repo";

let savedGitHubToken: string | undefined;
const refreshedGitHubTokens = new Map<string, string>();

export async function initializeSavedGitHubToken(): Promise<void> {
  savedGitHubToken = await loadGitHubToken();
}

export function setSavedGitHubToken(token: string | undefined): void {
  savedGitHubToken = token;
  if (!token) refreshedGitHubTokens.clear();
}

export function printGitHubTokenPermissionHelp(): void {
  console.log(chalk.dim("Token permissions needed to publish releases:"));
  console.log(chalk.dim("  Classic PAT: enable the repo scope (full control of private repositories)."));
  console.log(
    chalk.dim("  Fine-grained PAT: select the target repo, Contents = Read and write, Metadata = Read."),
  );
  console.log(chalk.dim("  To auto-create a missing repo: also enable Administration = Read and write (fine-grained)."));
}

export async function promptGitHubTokenViaBrowser(): Promise<string> {
  try {
    await openUrl(GITHUB_PAT_CREATE_URL);
    console.log(chalk.dim("Opened GitHub in your browser. Create a token, then paste it below."));
    printGitHubTokenPermissionHelp();
  } catch {
    console.log(chalk.yellow("Could not open the browser automatically."));
    console.log(chalk.dim(`Open this URL manually:\n${GITHUB_PAT_CREATE_URL}`));
    printGitHubTokenPermissionHelp();
  }
  const token = await promptSecret("GitHub personal access token");
  if (!token) {
    throw new SkillPackError("No token provided.", "GITHUB_TOKEN_REQUIRED");
  }
  return token;
}

export function resolveGitHubTokenFromEnv(explicit?: string): string | undefined {
  const token = explicit ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? savedGitHubToken;
  return token ? (refreshedGitHubTokens.get(token) ?? token) : undefined;
}

export function isGitHubAuthStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function isGitHubAuthError(error: unknown): boolean {
  return (
    error instanceof SkillPackError &&
    (error.code === "GITHUB_AUTH_FAILED" ||
      (error.code === "GITHUB_API_FAILED" && /\b(401|403)\b|bad credentials|unauthorized/i.test(error.message)))
  );
}

export async function saveAndUseGitHubToken(token: string, previousToken?: string): Promise<void> {
  await saveGitHubToken(token);
  savedGitHubToken = token;
  if (previousToken && previousToken !== token) refreshedGitHubTokens.set(previousToken, token);
}

export async function promptUpdatedGitHubToken(previousToken?: string, context?: string): Promise<string> {
  if (!isInteractive()) {
    throw new SkillPackError(
      "GitHub authentication failed. Re-run with --token or set GITHUB_TOKEN/GH_TOKEN to a valid token.",
      "GITHUB_AUTH_FAILED",
    );
  }

  console.log(chalk.yellow("GitHub rejected the saved token. Enter a new token to continue."));
  if (context) console.log(chalk.dim(context));
  printGitHubTokenPermissionHelp();

  const action = await select({
    message: "How do you want to update the GitHub token?",
    choices: [
      { name: "Paste new token now (input will be masked)", value: "enter" as const },
      { name: "Open browser to create token", value: "browser" as const },
      { name: "Cancel", value: "cancel" as const },
    ],
  });

  if (action === "cancel") throw new SkillPackError("Cancelled by user.", "GITHUB_TOKEN_REQUIRED");
  const token = action === "browser" ? await promptGitHubTokenViaBrowser() : await promptSecret("GitHub personal access token");
  if (!token) throw new SkillPackError("No token provided.", "GITHUB_TOKEN_REQUIRED");

  await saveAndUseGitHubToken(token, previousToken);
  console.log(chalk.green("GitHub token updated locally."));
  return token;
}

export async function withGitHubAuthRetry<T>(
  token: string | undefined,
  context: string,
  operation: (token: string | undefined) => Promise<T>,
): Promise<T> {
  const authToken = resolveGitHubTokenFromEnv(token);
  try {
    return await operation(authToken);
  } catch (error) {
    if (!authToken || !isGitHubAuthError(error)) throw error;
    const nextToken = await promptUpdatedGitHubToken(authToken, context);
    return operation(nextToken);
  }
}

/** Prompt for a token when installing from a private GitHub repository. */
export async function promptGitHubTokenForPrivateRepo(): Promise<string> {
  if (!isInteractive()) {
    throw new SkillPackError(
      "Private GitHub repository requires --token or GITHUB_TOKEN/GH_TOKEN in non-interactive mode.",
      "GITHUB_TOKEN_REQUIRED",
    );
  }
  console.log(
    chalk.yellow(
      "Cannot access this repository without authentication. It may be private, or owner/repo may be wrong.",
    ),
  );
  console.log(chalk.dim("Public repositories install without a token."));
  console.log(chalk.dim("Private repos: classic PAT with repo scope, or fine-grained PAT with Contents read on this repo."));
  const action = await select({
    message: "How do you want to authenticate?",
    choices: [
      { name: "Open browser to create token (recommended)", value: "browser" as const },
      { name: "Paste token now (input will be masked)", value: "enter" as const },
      { name: "Cancel", value: "cancel" as const },
    ],
  });
  if (action === "browser") return promptGitHubTokenViaBrowser();
  if (action === "enter") {
    const token = await promptSecret("GitHub personal access token");
    if (!token) throw new SkillPackError("No token provided.", "GITHUB_TOKEN_REQUIRED");
    return token;
  }
  throw new SkillPackError("Cancelled by user.", "GITHUB_TOKEN_REQUIRED");
}
