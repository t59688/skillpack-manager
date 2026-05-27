import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import YAML from "yaml";
import { z } from "zod";
import { SkillPackManifest } from "../types/schema.js";
import { SkillPackError } from "../utils/errors.js";
import { ensureDir, expandHome, readText, writeText } from "../utils/fs.js";

const ProviderSchema = z.object({
  type: z.literal("github"),
  repo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
});

const WorkspaceSchema = z.object({
  id: z.string(),
  pack: z.string(),
  owner: z.string().optional(),
  name: z.string(),
  localPath: z.string(),
  provider: ProviderSchema.optional(),
  lastVersion: z.string().optional(),
  lastTag: z.string().optional(),
  lastArtifact: z.string().optional(),
  lastReleaseUrl: z.string().optional(),
  lastAssetUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const StateSchema = z.object({
  schema: z.string().default("https://skillpack.dev/schemas/state.v1.json"),
  workspaces: z.array(WorkspaceSchema).default([]),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type SkillPackState = z.infer<typeof StateSchema>;
export type Provider = z.infer<typeof ProviderSchema>;

export function skillpackHome(): string {
  return path.join(os.homedir(), ".skillpack");
}

export function statePath(): string {
  return path.join(skillpackHome(), "state.yaml");
}

export function defaultWorkspaceRoot(): string {
  return path.join(skillpackHome(), "workspaces");
}

export function defaultWorkspacePath(owner: string | undefined, name: string): string {
  return path.join(defaultWorkspaceRoot(), owner ?? "local", name);
}

function now(): string {
  return new Date().toISOString();
}

function workspaceId(owner: string | undefined, name: string): string {
  return owner ? `${owner}/${name}` : name;
}

function normalizeLocalPath(inputPath: string): string {
  return path.resolve(expandHome(inputPath));
}

export function packIdentity(manifest: Pick<SkillPackManifest, "owner" | "name">): string {
  return workspaceId(manifest.owner, manifest.name);
}

export async function loadState(): Promise<SkillPackState> {
  const filePath = statePath();
  if (!(await fs.pathExists(filePath))) return { schema: "https://skillpack.dev/schemas/state.v1.json", workspaces: [] };
  const parsed = YAML.parse(await readText(filePath)) ?? {};
  return StateSchema.parse(parsed);
}

export async function saveState(state: SkillPackState): Promise<void> {
  await ensureDir(skillpackHome());
  await writeText(statePath(), YAML.stringify(StateSchema.parse(state)));
}

export async function findWorkspaceByPath(packDir: string): Promise<Workspace | undefined> {
  const absolute = normalizeLocalPath(packDir);
  const state = await loadState();
  return state.workspaces.find((workspace) => normalizeLocalPath(workspace.localPath) === absolute);
}

export async function findWorkspaceByProvider(provider: Provider): Promise<Workspace | undefined> {
  const state = await loadState();
  return state.workspaces.find(
    (workspace) => workspace.provider?.type === provider.type && workspace.provider.repo.toLowerCase() === provider.repo.toLowerCase(),
  );
}

export async function findWorkspaceByPack(pack: string): Promise<Workspace | undefined> {
  const state = await loadState();
  return state.workspaces.find((workspace) => workspace.pack === pack || workspace.id === pack);
}

export async function updateWorkspaceLocalPath(workspaceId: string, localPath: string): Promise<Workspace> {
  const state = await loadState();
  const existingIndex = state.workspaces.findIndex((workspace) => workspace.id === workspaceId);
  if (existingIndex < 0) {
    throw new SkillPackError(`Workspace not found in state: ${workspaceId}`, "WORKSPACE_NOT_FOUND");
  }

  const next: Workspace = {
    ...state.workspaces[existingIndex],
    localPath: normalizeLocalPath(localPath),
    updatedAt: now(),
  };
  state.workspaces[existingIndex] = next;
  await saveState(state);
  return next;
}

export async function upsertWorkspace(input: {
  manifest: Pick<SkillPackManifest, "owner" | "name">;
  localPath: string;
  provider?: Provider;
  lastVersion?: string;
  lastTag?: string;
  lastArtifact?: string;
  lastReleaseUrl?: string;
  lastAssetUrl?: string;
}): Promise<Workspace> {
  const state = await loadState();
  const absolute = normalizeLocalPath(input.localPath);
  const id = workspaceId(input.manifest.owner, input.manifest.name);
  const timestamp = now();
  const existingIndex = state.workspaces.findIndex(
    (workspace) =>
      normalizeLocalPath(workspace.localPath) === absolute ||
      workspace.id === id ||
      (input.provider && workspace.provider?.type === input.provider.type && workspace.provider.repo.toLowerCase() === input.provider.repo.toLowerCase()),
  );

  const current = existingIndex >= 0 ? state.workspaces[existingIndex] : undefined;
  const next: Workspace = {
    id,
    pack: id,
    owner: input.manifest.owner,
    name: input.manifest.name,
    localPath: absolute,
    provider: input.provider ?? current?.provider,
    lastVersion: input.lastVersion ?? current?.lastVersion,
    lastTag: input.lastTag ?? current?.lastTag,
    lastArtifact: input.lastArtifact ?? current?.lastArtifact,
    lastReleaseUrl: input.lastReleaseUrl ?? current?.lastReleaseUrl,
    lastAssetUrl: input.lastAssetUrl ?? current?.lastAssetUrl,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) state.workspaces[existingIndex] = next;
  else state.workspaces.push(next);
  await saveState(state);
  return next;
}

export async function removeWorkspaceByPath(packDir: string): Promise<boolean> {
  const absolute = normalizeLocalPath(packDir);
  const state = await loadState();
  const next = state.workspaces.filter((workspace) => normalizeLocalPath(workspace.localPath) !== absolute);
  if (next.length === state.workspaces.length) return false;
  await saveState({ ...state, workspaces: next });
  return true;
}
