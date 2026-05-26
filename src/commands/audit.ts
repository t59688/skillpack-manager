import chalk from "chalk";
import { Command } from "commander";
import { auditPack } from "../core/audit.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { promptText } from "../utils/prompts.js";

export function auditCommand(): Command {
  return new Command("audit")
    .description("audit a skill pack for packaging, quality, and safety issues")
    .argument("[packDir]", "skill pack directory; omit for prompt")
    .action(async (packDirArg: string | undefined) => {
      const packDir = await resolvePackDir(packDirArg ?? (await promptText("Skill pack directory to audit", process.cwd())));
      const issues = await auditPack(packDir);
      if (issues.length === 0) {
        console.log(chalk.green("No issues found."));
        return;
      }
      for (const issue of issues) {
        const color = issue.level === "error" ? chalk.red : issue.level === "warning" ? chalk.yellow : chalk.blue;
        console.log(`${color(issue.level.toUpperCase())} ${chalk.bold(issue.code)} ${issue.message}${issue.file ? chalk.dim(` (${issue.file})`) : ""}`);
      }
      const errors = issues.filter((issue) => issue.level === "error").length;
      if (errors > 0) process.exitCode = 1;
    });
}
