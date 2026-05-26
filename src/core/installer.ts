import path from "node:path";
import fs from "fs-extra";
import { extractSkillPack } from "./packer.js";
import { isGitHubInstallSource, downloadSkillPackFromGitHub } from "./github-install.js";
import { loadManifest, packId } from "./manifest.js";
import { cachePath, recordInstall, removeInstall } from "./registry.js";
import { resolveTargetDir } from "../adapters/targets.js";
import { InstalledPack, TargetName } from "../types/schema.js";
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
      checksum: await sha256Directory(targetSkillDir),
    });
  }

  const entry: InstalledPack = {
    pack: packId(manifest),
    version: manifest.version,
    target: options.target,
    installedAt: new Date().toISOString(),
    source,
    skills: installedSkills,
  };
  await recordInstall(entry);
  return entry;
}

export async function uninstallPack(pack: string, target?: TargetName): Promise<InstalledPack[]> {
  const removed = await removeInstall(pack, target);
  for (const item of removed) {
    for (const skill of item.skills) {
      if (await fs.pathExists(skill.path)) {
        const currentChecksum = await sha256Directory(skill.path);
        if (currentChecksum !== skill.checksum) {
          throw new SkillPackError(
            `Refusing to remove modified skill ${skill.name}. Delete manually or reinstall with --force first.`,
            "LOCAL_MODIFICATIONS",
          );
        }
        await fs.remove(skill.path);
      }
    }
  }
  return removed;
}
