import chalk from "chalk";
import { WorkspaceStatus } from "../core/workspace-status.js";
import { t } from "./i18n.js";

function providerLabel(view: WorkspaceStatus): string {
  const provider = view.workspace.provider;
  return provider ? `${provider.type}:${provider.repo}` : `(${t("common.none")})`;
}

function statusColor(status: WorkspaceStatus["status"]): (value: string) => string {
  if (status === "clean") return chalk.green;
  if (status === "unpublished changes" || status === "behind remote") return chalk.yellow;
  if (status === "missing") return chalk.red;
  return chalk.dim;
}

function statusLabel(status: WorkspaceStatus["status"]): string {
  if (status === "clean") return t("status.clean");
  if (status === "unpublished changes") return t("status.unpublished changes");
  if (status === "behind remote") return t("status.behind remote");
  if (status === "local only") return t("status.local only");
  if (status === "missing") return t("status.missing");
  return t("status.unknown");
}

export function printWorkspaceStatus(views: WorkspaceStatus[]): void {
  if (views.length === 0) {
    console.log(chalk.dim(t("workspace-output.none")));
    return;
  }

  console.log(chalk.bold(t("workspace-output.title")));
  for (const view of views) {
    const status = statusLabel(view.status);
    console.log("");
    console.log(chalk.bold(view.workspace.pack));
    console.log(t("workspace-output.path", { path: view.workspace.localPath }));
    console.log(t("workspace-output.provider", { provider: providerLabel(view) }));
    console.log(t("workspace-output.localVersion", { version: view.localVersion ?? `(${t("common.unknown")})` }));
    console.log(t("workspace-output.remoteLatest", { version: view.remoteLatest ?? `(${t("common.unknown")})` }));
    console.log(t("workspace-output.status", { status: statusColor(view.status)(status) }));
    if (view.error) console.log(chalk.dim(t("workspace-output.detail", { detail: view.error })));
  }
}
