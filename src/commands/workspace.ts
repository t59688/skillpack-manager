import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { findWorkspaceByPath, updateWorkspaceLocalPath } from "../core/state.js";
import { summarizeWorkspaces } from "../core/workspace-status.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { SkillPackError } from "../utils/errors.js";
import { expandHome } from "../utils/fs.js";
import { t } from "../utils/i18n.js";
import { isInteractive, promptConfirm } from "../utils/prompts.js";
import { printWorkspaceStatus } from "../utils/workspace-output.js";

type WorkspaceListOptions = {
  token?: string;
};

type WorkspaceMoveOptions = {
  overwrite?: boolean;
};

async function isEmptyDirectory(dir: string): Promise<boolean> {
  if (!(await fs.pathExists(dir))) return true;
  const entries = await fs.readdir(dir);
  return entries.length === 0;
}

async function moveWorkspace(reference: string, destinationArg: string, options: WorkspaceMoveOptions): Promise<void> {
  const source = await resolvePackDir(reference);
  const workspace = await findWorkspaceByPath(source);
  if (!workspace) {
    throw new SkillPackError(t("workspace.error.noBinding", { reference }), "WORKSPACE_NOT_FOUND");
  }
  if (!(await fs.pathExists(source))) {
    throw new SkillPackError(t("workspace.error.pathMissing", { path: source }), "WORKSPACE_NOT_FOUND");
  }

  const destination = path.resolve(expandHome(destinationArg));
  if (source === destination) {
    await updateWorkspaceLocalPath(workspace.id, destination);
    console.log(chalk.dim(t("workspace.alreadyAt", { path: destination })));
    return;
  }

  if (!(await isEmptyDirectory(destination))) {
    const shouldOverwrite =
      options.overwrite ?? (isInteractive() ? await promptConfirm(t("workspace.confirm.replaceDestination", { path: destination }), false) : false);
    if (!shouldOverwrite) {
      throw new SkillPackError(t("workspace.error.destinationExists", { path: destination }), "WORKSPACE_EXISTS");
    }
    await fs.remove(destination);
  }

  await fs.ensureDir(path.dirname(destination));
  await fs.move(source, destination, { overwrite: true });
  await updateWorkspaceLocalPath(workspace.id, destination);

  console.log(chalk.green(t("workspace.moved", { pack: workspace.pack })));
  console.log(t("workspace.from", { path: source }));
  console.log(t("workspace.to", { path: destination }));
}

export function workspaceCommand(): Command {
  const command = new Command("workspace").description(t("command.workspace.description"));

  command
    .command("list")
    .alias("ls")
    .description(t("command.workspace.list.description"))
    .option("--token <token>", t("command.token.option"))
    .action(async (options: WorkspaceListOptions) => {
      printWorkspaceStatus(await summarizeWorkspaces(options.token));
    });

  command
    .command("move")
    .description(t("command.workspace.move.description"))
    .argument("<pack>", t("command.workspace.move.pack.argument"))
    .argument("<destination>", t("command.workspace.move.destination.argument"))
    .option("--overwrite", t("command.workspace.move.overwrite.option"))
    .action(moveWorkspace);

  return command;
}
