import fs from "fs-extra";
import { getLatestGitHubReleaseSummary } from "./github-install.js";
import { loadManifest } from "./manifest.js";
import { loadState, Workspace } from "./state.js";
import { compareVersions, versionFromTag } from "./version.js";

export type WorkspaceStatusName = "clean" | "unpublished changes" | "behind remote" | "local only" | "missing" | "unknown";

export type WorkspaceStatus = {
  workspace: Workspace;
  exists: boolean;
  localVersion?: string;
  remoteLatest?: string;
  remoteTag?: string;
  status: WorkspaceStatusName;
  error?: string;
};

export async function summarizeWorkspace(workspace: Workspace, token?: string): Promise<WorkspaceStatus> {
  const exists = await fs.pathExists(workspace.localPath);
  if (!exists) {
    return {
      workspace,
      exists,
      localVersion: workspace.lastVersion,
      remoteLatest: undefined,
      status: "missing",
    };
  }

  let localVersion: string | undefined;
  try {
    const manifest = await loadManifest(workspace.localPath);
    localVersion = manifest.version;
  } catch (error) {
    return {
      workspace,
      exists,
      localVersion: workspace.lastVersion,
      remoteLatest: undefined,
      status: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!workspace.provider) {
    return { workspace, exists, localVersion, status: "local only" };
  }

  try {
    const latest = await getLatestGitHubReleaseSummary(workspace.provider.repo, token);
    const remoteLatest = versionFromTag(latest.tag) ?? latest.tag;
    const comparison = versionFromTag(latest.tag) ? compareVersions(localVersion, remoteLatest) : 0;
    const status = comparison > 0 ? "unpublished changes" : comparison < 0 ? "behind remote" : "clean";
    return { workspace, exists, localVersion, remoteLatest, remoteTag: latest.tag, status };
  } catch (error) {
    return {
      workspace,
      exists,
      localVersion,
      remoteLatest: undefined,
      status: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function summarizeWorkspaces(token?: string): Promise<WorkspaceStatus[]> {
  const state = await loadState();
  return Promise.all(state.workspaces.map((workspace) => summarizeWorkspace(workspace, token)));
}
