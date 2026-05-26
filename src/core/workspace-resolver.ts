import path from "node:path";
import fs from "fs-extra";
import { findWorkspaceByPack, loadState, Workspace } from "./state.js";
import { SkillPackError } from "../utils/errors.js";
import { expandHome } from "../utils/fs.js";

async function hasManifest(directory: string): Promise<boolean> {
  return fs.pathExists(path.join(directory, "skillpack.yaml"));
}

function normalize(input: string): string {
  return input.trim().replace(/^github:/, "").replace(/\\/g, "/").toLowerCase();
}

function matchesWorkspace(workspace: Workspace, reference: string): boolean {
  const ref = normalize(reference);
  const provider = workspace.provider ? normalize(workspace.provider.repo) : undefined;
  const localBase = path.basename(workspace.localPath).toLowerCase();
  const candidates = [
    workspace.id,
    workspace.pack,
    workspace.name,
    workspace.owner ? `${workspace.owner}/${workspace.name}` : undefined,
    provider,
    provider ? `github:${provider}` : undefined,
    localBase,
  ]
    .filter(Boolean)
    .map((candidate) => normalize(candidate as string));

  return candidates.includes(ref);
}

export async function resolvePackDir(reference: string): Promise<string> {
  const expanded = path.resolve(expandHome(reference));
  if (await hasManifest(expanded)) return expanded;

  const direct = await findWorkspaceByPack(reference);
  if (direct) return direct.localPath;

  const state = await loadState();
  const matches = state.workspaces.filter((workspace) => matchesWorkspace(workspace, reference));
  if (matches.length === 1) return matches[0].localPath;

  if (matches.length > 1) {
    const options = matches.map((workspace) => `- ${workspace.pack}: ${workspace.localPath}`).join("\n");
    throw new SkillPackError(`Workspace reference '${reference}' is ambiguous. Use a full pack id or path:\n${options}`, "AMBIGUOUS_WORKSPACE");
  }

  if (await fs.pathExists(expanded)) {
    throw new SkillPackError(`No skillpack.yaml found in ${reference}. If this is a pulled workspace, run 'skillpack status' to see remembered names.`, "MANIFEST_NOT_FOUND");
  }

  throw new SkillPackError(`No local skill pack or remembered workspace found for '${reference}'. Run 'skillpack status' or 'skillpack pull github:owner/repo'.`, "WORKSPACE_NOT_FOUND");
}

export async function resolvePackDirOrPrompt(reference: string | undefined, prompt: () => Promise<string>): Promise<string> {
  const chosen = reference ?? (await prompt());
  return resolvePackDir(chosen);
}
