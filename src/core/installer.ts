import path from "node:path";
import fs from "fs-extra";
import { extractSkillPack } from "./packer.js";
import { isGitHubInstallSource, downloadSkillPackFromGitHub } from "./github-install.js";
import { loadManifest, packId } from "./manifest.js";
import { cachePath, findInstalledPacks, recordInstall, removeInstall } from "./registry.js";
import { resolveTargetDir } from "../adapters/targets.js";
import { InstalledPack, SkillPackManifest, TargetName } from "../types/schema.js";
import { copyDirSafe, ensureDir, expandHome, sha256Directory } from "../utils/fs.js";
import { SkillPackError } from "../utils/errors.js";

export type InstallOptions = {
  target: TargetName;
  targetDir?: string;
  overwrite?: boolean;
  token?: string;
  /** Pre-resolved local path (skips re-downloading GitHub sources for each target). */
  resolvedSource?: string;
};

export type ResolvedPackInfo = {
  resolvedSource: string;
  packDir: string;
  manifest: SkillPackManifest;
  cleanup: () => Promise<void>;
};

export type UninstallSkillPlan = {
  name: string;
  path: string;
  exists: boolean;
  modified: boolean;
};

export type UninstallPlan = {
  item: InstalledPack;
  skills: UninstallSkillPlan[];
};

export async function resolvePackSource(source: string, options?: { token?: string }): Promise<string> {
  const expanded = expandHome(source.trim());
  if (isGitHubInstallSource(expanded)) {
    const downloaded = await downloadSkillPackFromGitHub(expanded, { token: options?.token });
    return downloaded.artifactPath;
  }
  if (await fs.pathExists(expanded)) return expanded;
  throw new SkillPackError(
    `Source not found: ${source}\n` +
      "Use a local pack directory, .skillpack file, github:owner/repo[@tag], or https://github.com/owner/repo",
    "SOURCE_NOT_FOUND",
  );
}

export async function inspectResolvedPackSource(resolvedSource: string): Promise<ResolvedPackInfo> {
  const tempDir = cachePath("inspect", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let packDir = resolvedSource;
  let cleanup = async (): Promise<void> => {};

  if (resolvedSource.endsWith(".skillpack") || resolvedSource.endsWith(".zip")) {
    await fs.remove(tempDir);
    await extractSkillPack(resolvedSource, tempDir);
    packDir = tempDir;
    cleanup = async () => fs.remove(tempDir);
  }

  return {
    resolvedSource,
    packDir,
    manifest: await loadManifest(packDir),
    cleanup,
  };
}

export async function installPack(source: string, options: InstallOptions): Promise<InstalledPack> {
  const resolvedSource =
    options.resolvedSource ?? (await resolvePackSource(source, { token: options.token }));
  const tempDir = cachePath("extract", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let packDir = resolvedSource;

  if (resolvedSource.endsWith(".skillpack") || resolvedSource.endsWith(".zip")) {
    await extractSkillPack(resolvedSource, tempDir);
    packDir = tempDir;
  }

  const manifest = await loadManifest(packDir);
  const targetRoot = resolveTargetDir(options.target, options.targetDir);
  await ensureDir(targetRoot);

  const installedSkills: InstalledPack["skills"] = [];
  for (const skill of manifest.skills) {
    const sourceSkillDir = path.resolve(packDir, skill.path);
    const targetSkillDir = path.join(targetRoot, skill.name);
    await copyDirSafe(sourceSkillDir, targetSkillDir, Boolean(options.overwrite));
    installedSkills.push({
      name: skill.name,
      path: targetSkillDir,
      version: skill.version ?? manifest.version,
      checksum: await sha256Directory(targetSkillDir),
    });
  }

  const entry: InstalledPack = {
    pack: packId(manifest),
    version: manifest.version,
    target: options.target,
    targetDir: targetRoot,
    installedAt: new Date().toISOString(),
    source,
    skills: installedSkills,
  };
  await recordInstall(entry);
  return entry;
}

export async function planUninstall(pack: string, target?: TargetName): Promise<UninstallPlan[]> {
  const items = await findInstalledPacks(pack, target);
  const plans: UninstallPlan[] = [];
  for (const item of items) {
    const skills: UninstallSkillPlan[] = [];
    for (const skill of item.skills) {
      const exists = await fs.pathExists(skill.path);
      const modified = exists && (await sha256Directory(skill.path)) !== skill.checksum;
      skills.push({ name: skill.name, path: skill.path, exists, modified });
    }
    plans.push({ item, skills });
  }
  return plans;
}

export async function uninstallPack(pack: string, target?: TargetName, options: { force?: boolean } = {}): Promise<InstalledPack[]> {
  const plans = await planUninstall(pack, target);
  const modified = plans.flatMap((plan) => plan.skills.filter((skill) => skill.modified));
  if (modified.length > 0 && !options.force) {
    throw new SkillPackError(
      `Refusing to remove modified skills: ${modified.map((skill) => skill.name).join(", ")}. Re-run with --force if you want to remove them too.`,
      "LOCAL_MODIFICATIONS",
    );
  }

  for (const plan of plans) {
    for (const skill of plan.skills) {
      if (skill.exists) await fs.remove(skill.path);
    }
  }

  const removed = await removeInstall(pack, target);
  return removed;
}
