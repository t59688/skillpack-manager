import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { findWorkspaceByPath, updateWorkspaceLocalPath } from "../core/state.js";
import { summarizeWorkspaces } from "../core/workspace-status.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { SkillPackError } from "../utils/errors.js";
import { expandHome } from "../utils/fs.js";
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
    throw new SkillPackError(`No workspace binding found for ${reference}. Run 'skillpack status' to see remembered workspaces.`, "WORKSPACE_NOT_FOUND");
  }
  if (!(await fs.pathExists(source))) {
    throw new SkillPackError(`Workspace path does not exist: ${source}`, "WORKSPACE_NOT_FOUND");
  }

  const destination = path.resolve(expandHome(destinationArg));
  if (source === destination) {
    await updateWorkspaceLocalPath(workspace.id, destination);
    console.log(chalk.dim(`Workspace already at ${destination}`));
    return;
  }

  if (!(await isEmptyDirectory(destination))) {
    const shouldOverwrite = options.overwrite ?? (isInteractive() ? await promptConfirm(`Destination ${destination} already exists. Replace it?`, false) : false);
    if (!shouldOverwrite) {
      throw new SkillPackError(`Destination already exists: ${destination}. Re-run with --overwrite or choose another directory.`, "WORKSPACE_EXISTS");
    }
    await fs.remove(destination);
  }

  await fs.ensureDir(path.dirname(destination));
  await fs.move(source, destination, { overwrite: true });
  await updateWorkspaceLocalPath(workspace.id, destination);

  console.log(chalk.green(`Moved ${workspace.pack}`));
  console.log(`From: ${source}`);
  console.log(`To: ${destination}`);
}

export function workspaceCommand(): Command {
  const command = new Command("workspace").description("list and manage remembered skill pack workspaces");

  command
    .command("list")
    .alias("ls")
    .description("list remembered skill pack workspaces")
    .option("--token <token>", "GitHub token; defaults to GITHUB_TOKEN or GH_TOKEN")
    .action(async (options: WorkspaceListOptions) => {
      printWorkspaceStatus(await summarizeWorkspaces(options.token));
    });

  command
    .command("move")
    .description("move a remembered workspace to a new directory")
    .argument("<pack>", "workspace reference, pack name, owner/name, GitHub repo, or local path")
    .argument("<destination>", "new workspace directory")
    .option("--overwrite", "replace an existing destination directory")
    .action(moveWorkspace);

  return command;
}
