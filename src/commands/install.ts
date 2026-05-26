import chalk from "chalk";
import { Command } from "commander";
import { formatTargetHelp } from "../adapters/targets.js";
import { installPack, resolvePackSource } from "../core/installer.js";
import { TargetName, TargetSchema } from "../types/schema.js";
import { promptManyTargets, promptText } from "../utils/prompts.js";

function collectTarget(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function installCommand(): Command {
  return new Command("install")
    .description("install a skill pack to one or more agent targets")
    .argument(
      "[source]",
      "local path, .skillpack file, github:owner/repo[@tag], or https://github.com/owner/repo; omit for prompt",
    )
    .option("-t, --target <target>", `${formatTargetHelp()}; repeat to install to several targets`, collectTarget, [])
    .option("--target-dir <dir>", "custom target skills directory; best used with --target local")
    .option("--token <token>", "GitHub token for private repos; defaults to GITHUB_TOKEN or GH_TOKEN")
    .option("--overwrite", "overwrite existing skill directories", false)
    .action(async (sourceArg: string | undefined, options: { target: string[]; targetDir?: string; token?: string; overwrite: boolean }) => {
      const source =
        sourceArg ??
        (await promptText(
          "Pack source (local path, .skillpack, github:owner/repo, or GitHub URL)",
          process.cwd(),
        ));
      const resolvedSource = await resolvePackSource(source, { token: options.token });
      const targets: TargetName[] = options.target.length ? options.target.map((target) => TargetSchema.parse(target)) : await promptManyTargets("Install to which agents?");
      for (const target of targets) {
        const entry = await installPack(source, {
          target,
          targetDir: target === "local" ? options.targetDir : undefined,
          overwrite: options.overwrite,
          token: options.token,
          resolvedSource,
        });
        console.log(chalk.green(`Installed ${entry.pack}@${entry.version} to ${entry.target}`));
        for (const skill of entry.skills) console.log(`${chalk.green("✓")} ${skill.name} ${chalk.dim(skill.path)}`);
      }
    });
}
