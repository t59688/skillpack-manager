import chalk from "chalk";
import { Command } from "commander";
import { downloadSkillPackFromGitHub, isGitHubInstallSource } from "../core/github-install.js";
import { SkillPackError } from "../utils/errors.js";
import { promptText } from "../utils/prompts.js";

export function downloadCommand(): Command {
  return new Command("download")
    .description("download a .skillpack artifact from GitHub Releases (does not install)")
    .argument("[source]", "github:owner/repo[@tag] or https://github.com/owner/repo")
    .option("-o, --out <dir>", "output directory for the .skillpack file", ".")
    .option("--token <token>", "GitHub token for private repos; defaults to GITHUB_TOKEN or GH_TOKEN")
    .action(async (sourceArg: string | undefined, options: { out: string; token?: string }) => {
      const source =
        sourceArg ??
        (await promptText("GitHub source (github:owner/repo or https://github.com/owner/repo)"));

      if (!isGitHubInstallSource(source)) {
        throw new SkillPackError(
          `Download only supports GitHub sources.\n` +
            `Examples:\n` +
            `  skillpack download github:owner/repo\n` +
            `  skillpack download github:owner/repo@tag\n` +
            `  skillpack download https://github.com/owner/repo`,
          "INVALID_GITHUB_SOURCE",
        );
      }

      const result = await downloadSkillPackFromGitHub(source, {
        token: options.token,
        outputDir: options.out,
      });

      console.log(chalk.green(`Downloaded: ${result.artifactPath}`));
      console.log(`Repo: ${result.repo}`);
      console.log(`Tag: ${result.tag}`);
      console.log(`Release: ${result.releaseUrl}`);
    });
}
