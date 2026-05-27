import path from "node:path";
import fs from "fs-extra";
import { resolveTargetDir } from "../adapters/targets.js";
import { loadManifest, packId } from "./manifest.js";
import { installedPackMatches } from "./registry.js";
import { InstalledPack, SkillPackManifest } from "../types/schema.js";
import { SkillPackError } from "../utils/errors.js";
import { expandHome, sha256Directory } from "../utils/fs.js";

export type InstalledSkillChange = {
  name: string;
  path: string;
  installedVersion?: string;
  latestVersion?: string;
};

export type InstalledPackDiff = {
  record: InstalledPack;
  pack: string;
  latestVersion: string;
  targetRoot: string;
  missing: InstalledSkillChange[];
  outdated: InstalledSkillChange[];
  extraLocal: InstalledSkillChange[];
  modified: InstalledSkillChange[];
  present: InstalledSkillChange[];
};

type PackSkillSnapshot = {
  name: string;
  path: string;
  version: string;
  checksum: string;
};

export function targetRootForInstalledRecord(record: InstalledPack): string {
  return record.targetDir ?? (record.skills[0] ? path.dirname(record.skills[0].path) : resolveTargetDir(record.target));
}

export function installedRecordMatchesTargetDir(record: InstalledPack, targetDir: string | undefined): boolean {
  if (!targetDir) return true;
  return path.resolve(expandHome(targetRootForInstalledRecord(record))) === path.resolve(expandHome(targetDir));
}

async function listSkillDirectories(root: string): Promise<string[]> {
  if (!(await fs.pathExists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function snapshotPackSkills(packDir: string, manifest: SkillPackManifest): Promise<Map<string, PackSkillSnapshot>> {
  const snapshots = new Map<string, PackSkillSnapshot>();
  for (const skill of manifest.skills) {
    const sourcePath = path.resolve(expandHome(packDir), skill.path);
    if (!(await fs.pathExists(sourcePath))) {
      throw new SkillPackError(`Pack skill directory not found: ${sourcePath}`, "PACK_SKILL_NOT_FOUND");
    }
    snapshots.set(skill.name, {
      name: skill.name,
      path: sourcePath,
      version: skill.version ?? manifest.version,
      checksum: await sha256Directory(sourcePath),
    });
  }
  return snapshots;
}

function change(
  name: string,
  skillPath: string,
  installedVersion: string | undefined,
  latestVersion: string | undefined,
): InstalledSkillChange {
  return { name, path: skillPath, installedVersion, latestVersion };
}

export async function diffInstalledPack(packDir: string, record: InstalledPack): Promise<InstalledPackDiff> {
  const manifest = await loadManifest(packDir);
  const currentPack = packId(manifest);
  if (!installedPackMatches(currentPack, record.pack)) {
    throw new SkillPackError(`Pack ${currentPack} does not match installed record ${record.pack}.`, "PACK_MISMATCH");
  }

  const targetRoot = targetRootForInstalledRecord(record);
  const packSkills = await snapshotPackSkills(packDir, manifest);
  const recordedSkills = new Map(record.skills.map((skill) => [skill.name, skill]));
  const targetSkillNames = await listSkillDirectories(targetRoot);
  const result: InstalledPackDiff = {
    record,
    pack: currentPack,
    latestVersion: manifest.version,
    targetRoot,
    missing: [],
    outdated: [],
    extraLocal: [],
    modified: [],
    present: [],
  };

  for (const [name, packSkill] of packSkills) {
    const recorded = recordedSkills.get(name);
    const expectedPath = recorded?.path ?? path.join(targetRoot, name);
    if (!(await fs.pathExists(expectedPath))) {
      result.missing.push(change(name, expectedPath, recorded?.version, packSkill.version));
      continue;
    }

    const currentChecksum = await sha256Directory(expectedPath);
    if (!recorded) {
      result.modified.push(change(name, expectedPath, undefined, packSkill.version));
      continue;
    }

    if (recorded && currentChecksum !== recorded.checksum) {
      result.modified.push(change(name, expectedPath, recorded.version, packSkill.version));
      continue;
    }

    if (currentChecksum !== packSkill.checksum || recorded.version !== packSkill.version) {
      result.outdated.push(change(name, expectedPath, recorded.version, packSkill.version));
      continue;
    }

    result.present.push(change(name, expectedPath, recorded.version, packSkill.version));
  }

  for (const name of targetSkillNames) {
    if (!packSkills.has(name)) {
      result.extraLocal.push(change(name, path.join(targetRoot, name), undefined, undefined));
    }
  }

  return result;
}
