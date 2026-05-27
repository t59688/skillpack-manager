import chalk from "chalk";
import { Command } from "commander";
import { findWorkspaceByPath } from "../core/state.js";
import { summarizeWorkspace, summarizeWorkspaces } from "../core/workspace-status.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { t } from "../utils/i18n.js";
import { printWorkspaceStatus } from "../utils/workspace-output.js";

export function statusCommand(): Command {
  return new Command("status")
    .description(t("command.status.description"))
    .argument("[packDir]", t("command.status.pack.argument"))
    .option("--remote", t("command.status.remote.option"))
    .option("--token <token>", t("command.token.option"))
    .action(async (packDirArg: string | undefined, options: { remote?: boolean; token?: string }) => {
      if (packDirArg) {
        const packDir = await resolvePackDir(packDirArg);
        const workspace = await findWorkspaceByPath(packDir);
        if (!workspace) {
          console.log(t("workspace-output.path", { path: packDir }));
          console.log(chalk.yellow(t("status.noBinding")));
          return;
        }
        printWorkspaceStatus([await summarizeWorkspace(workspace, options.token)]);
        return;
      }

      printWorkspaceStatus(await summarizeWorkspaces(options.token));
    });
}
