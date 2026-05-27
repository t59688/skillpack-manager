import chalk from "chalk";
import { WorkspaceStatus } from "../core/workspace-status.js";

function providerLabel(view: WorkspaceStatus): string {
  const provider = view.workspace.provider;
  return provider ? `${provider.type}:${provider.repo}` : "(none)";
}

function statusColor(status: WorkspaceStatus["status"]): (value: string) => string {
  if (status === "clean") return chalk.green;
  if (status === "unpublished changes" || status === "behind remote") return chalk.yellow;
  if (status === "missing") return chalk.red;
  return chalk.dim;
}

export function printWorkspaceStatus(views: WorkspaceStatus[]): void {
  if (views.length === 0) {
    console.log(chalk.dim("No remembered workspaces yet. Publish, pull, or clone a pack to create one."));
    return;
  }

  console.log(chalk.bold("Workspaces:"));
  for (const view of views) {
    console.log("");
    console.log(chalk.bold(view.workspace.pack));
    console.log(`Path: ${view.workspace.localPath}`);
    console.log(`Provider: ${providerLabel(view)}`);
    console.log(`Local version: ${view.localVersion ?? "(unknown)"}`);
    console.log(`Remote latest: ${view.remoteLatest ?? "(unknown)"}`);
    console.log(`Status: ${statusColor(view.status)(view.status)}`);
    if (view.error) console.log(chalk.dim(`Detail: ${view.error}`));
  }
}
