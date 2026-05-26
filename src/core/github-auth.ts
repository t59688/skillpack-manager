import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { openUrl } from "../utils/browser.js";
import { SkillPackError } from "../utils/errors.js";
import { isInteractive } from "../utils/prompts.js";
import { promptSecret } from "../utils/prompts.js";

/** Classic PAT page with repo scope (create releases & upload assets). */
export const GITHUB_PAT_CREATE_URL =
  "https://github.com/settings/tokens/new?description=skillpack-cli&scopes=repo";

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
  return explicit ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
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
