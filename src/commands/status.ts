import chalk from "chalk";
import { Command } from "commander";
import { findWorkspaceByPath } from "../core/state.js";
import { summarizeWorkspace, summarizeWorkspaces } from "../core/workspace-status.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { printWorkspaceStatus } from "../utils/workspace-output.js";

export function statusCommand(): Command {
  return new Command("status")
    .description("show remembered skill pack workspaces and provider bindings")
    .argument("[packDir]", "optional local skill pack directory")
    .option("--remote", "deprecated; remote latest is checked by default for GitHub workspaces")
    .option("--token <token>", "GitHub token; defaults to GITHUB_TOKEN or GH_TOKEN")
    .action(async (packDirArg: string | undefined, options: { remote?: boolean; token?: string }) => {
      if (packDirArg) {
        const packDir = await resolvePackDir(packDirArg);
        const workspace = await findWorkspaceByPath(packDir);
        if (!workspace) {
          console.log(`Path: ${packDir}`);
          console.log(chalk.yellow("No workspace binding found under ~/.skillpack/state.yaml"));
          return;
        }
        printWorkspaceStatus([await summarizeWorkspace(workspace, options.token)]);
        return;
      }

      printWorkspaceStatus(await summarizeWorkspaces(options.token));
    });
}
