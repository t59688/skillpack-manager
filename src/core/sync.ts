import path from "node:path";
import fs from "fs-extra";
import { diffInstalledPack, InstalledPackDiff, InstalledSkillChange } from "./installed-diff.js";
import { loadManifest, packId } from "./manifest.js";
import { recordInstall } from "./registry.js";
import { InstalledPack, SkillPackManifest } from "../types/schema.js";
import { expandHome, sha256Directory } from "../utils/fs.js";

export type SyncOptions = {
  force?: boolean;
};

export type SyncResult = {
  before: InstalledPackDiff;
  entry: InstalledPack;
  added: InstalledSkillChange[];
  updated: InstalledSkillChange[];
  overwrittenModified: InstalledSkillChange[];
  skippedModified: InstalledSkillChange[];
};

async function replaceSkillDirectory(sourcePath: string, targetPath: string): Promise<void> {
  await fs.remove(targetPath);
  await fs.ensureDir(path.dirname(targetPath));
  await fs.copy(sourcePath, targetPath, { dereference: true });
}

function targetPathForSkill(diff: InstalledPackDiff, skill: SkillPackManifest["skills"][number]): string {
  const recorded = diff.record.skills.find((item) => item.name === skill.name);
  return recorded?.path ?? path.join(diff.targetRoot, skill.name);
}

export async function syncInstalledPack(
  packDir: string,
  source: string,
  record: InstalledPack,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const before = await diffInstalledPack(packDir, record);
  const manifest = await loadManifest(packDir);
  const missing = new Set(before.missing.map((skill) => skill.name));
  const outdated = new Set(before.outdated.map((skill) => skill.name));
  const modified = new Set(before.modified.map((skill) => skill.name));
  const added: InstalledSkillChange[] = [];
  const updated: InstalledSkillChange[] = [];
  const overwrittenModified: InstalledSkillChange[] = [];
  const skippedModified: InstalledSkillChange[] = options.force ? [] : before.modified;
  const nextSkills: InstalledPack["skills"] = [];

  for (const skill of manifest.skills) {
    const targetPath = targetPathForSkill(before, skill);
    const sourcePath = path.resolve(expandHome(packDir), skill.path);
    const latestVersion = skill.version ?? manifest.version;
    const existing = record.skills.find((item) => item.name === skill.name);
    const shouldCopy = missing.has(skill.name) || outdated.has(skill.name) || (options.force && modified.has(skill.name));

    if (shouldCopy) {
      await replaceSkillDirectory(sourcePath, targetPath);
      const change: InstalledSkillChange = {
        name: skill.name,
        path: targetPath,
        installedVersion: existing?.version,
        latestVersion,
      };
      if (missing.has(skill.name)) added.push(change);
      else if (modified.has(skill.name)) overwrittenModified.push(change);
      else updated.push(change);
      nextSkills.push({
        name: skill.name,
        path: targetPath,
        version: latestVersion,
        checksum: await sha256Directory(targetPath),
      });
      continue;
    }

    if (modified.has(skill.name)) {
      if (existing) nextSkills.push(existing);
      continue;
    }

    nextSkills.push({
      name: skill.name,
      path: targetPath,
      version: latestVersion,
      checksum: await sha256Directory(targetPath),
    });
  }

  const entry: InstalledPack = {
    pack: packId(manifest),
    version: manifest.version,
    target: record.target,
    targetDir: before.targetRoot,
    installedAt: new Date().toISOString(),
    source,
    skills: nextSkills,
  };
  await recordInstall(entry);

  return { before, entry, added, updated, overwrittenModified, skippedModified };
}
