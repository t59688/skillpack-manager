import chalk from "chalk";
import { Command } from "commander";
import { formatTargetHelp } from "../adapters/targets.js";
import { diffPack } from "../core/diff.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { TargetName, TargetSchema } from "../types/schema.js";
import { promptOneTarget, promptText } from "../utils/prompts.js";

export function diffCommand(): Command {
  return new Command("diff")
    .description("compare a pack with a target skills directory")
    .argument("[packDir]", "skill pack directory; omit for prompt")
    .option("-t, --target <target>", formatTargetHelp())
    .option("--target-dir <dir>", "custom target skills directory")
    .action(async (packDirArg: string | undefined, options: { target?: string; targetDir?: string }) => {
      const packDir = await resolvePackDir(packDirArg ?? (await promptText("Skill pack directory to compare", process.cwd())));
      const target: TargetName = options.target ? TargetSchema.parse(options.target) : await promptOneTarget("Compare against which agent?");
      const result = await diffPack(packDir, target, options.targetDir);
      console.log(chalk.bold("Diff result:"));
      console.log(`${chalk.green("Present")}: ${result.present.length ? result.present.join(", ") : "none"}`);
      console.log(`${chalk.yellow("Missing")}: ${result.missing.length ? result.missing.join(", ") : "none"}`);
      console.log(`${chalk.red("Modified")}: ${result.modified.length ? result.modified.join(", ") : "none"}`);
    });
}
