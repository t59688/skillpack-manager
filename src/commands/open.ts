import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { openInVSCode, openPath } from "../utils/browser.js";
import { SkillPackError } from "../utils/errors.js";
import { promptText } from "../utils/prompts.js";

type OpenOptions = {
  code?: boolean;
};

export function openCommand(): Command {
  return new Command("open")
    .description("open a remembered skill pack workspace")
    .argument("[pack]", "workspace reference, pack name, owner/name, GitHub repo, or local path")
    .option("--code", "open the workspace in VS Code")
    .action(async (packArg: string | undefined, options: OpenOptions) => {
      const reference = packArg ?? (await promptText("Skill pack workspace to open", process.cwd()));
      const packDir = await resolvePackDir(reference);
      if (!(await fs.pathExists(packDir))) {
        throw new SkillPackError(`Workspace path does not exist: ${packDir}`, "WORKSPACE_NOT_FOUND");
      }

      console.log(`Opening ${packDir}`);
      try {
        if (options.code) await openInVSCode(packDir);
        else await openPath(packDir);
      } catch (error) {
        const hint = options.code
          ? "Could not open VS Code. Make sure the 'code' command is available on PATH."
          : "Could not open the workspace with the system file manager.";
        throw new SkillPackError(`${hint}\nWorkspace: ${packDir}\n${(error as Error).message}`, "OPEN_FAILED");
      }

      if (options.code) console.log(chalk.dim("Opened in VS Code."));
    });
}
