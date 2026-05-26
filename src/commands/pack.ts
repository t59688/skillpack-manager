import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { packSkillPack } from "../core/packer.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { promptText } from "../utils/prompts.js";

export function packCommand(): Command {
  return new Command("pack")
    .description("package a skill pack as a .skillpack artifact")
    .argument("[packDir]", "skill pack directory; omit for prompt")
    .option("-o, --out <dir>", "output directory")
    .action(async (packDirArg: string | undefined, options: { out?: string }) => {
      const packDir = await resolvePackDir(packDirArg ?? (await promptText("Skill pack directory to package", process.cwd())));
      const spinner = ora("Packing skill pack...").start();
      const outPath = await packSkillPack(packDir, options.out);
      spinner.succeed(`Created ${outPath}`);
      console.log(chalk.dim("Run skillpack install <artifact> to test it interactively."));
    });
}
