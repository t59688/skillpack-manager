import path from "node:path";
import fs from "fs-extra";
import { loadManifest } from "./manifest.js";
import { resolveTargetDir } from "../adapters/targets.js";
import { TargetName } from "../types/schema.js";
import { expandHome, sha256Directory } from "../utils/fs.js";

export type DiffResult = {
  missing: string[];
  present: string[];
  modified: string[];
};

export async function diffPack(packDir: string, target: TargetName, targetDir?: string): Promise<DiffResult> {
  const manifest = await loadManifest(packDir);
  const root = resolveTargetDir(target, targetDir);
  const result: DiffResult = { missing: [], present: [], modified: [] };

  for (const skill of manifest.skills) {
    const expectedDir = path.join(root, skill.name);
    if (!(await fs.pathExists(expectedDir))) {
      result.missing.push(skill.name);
      continue;
    }
    result.present.push(skill.name);
    const sourceDir = path.resolve(expandHome(packDir), skill.path);
    if ((await fs.pathExists(sourceDir)) && (await sha256Directory(sourceDir)) !== (await sha256Directory(expectedDir))) {
      result.modified.push(skill.name);
    }
  }
  return result;
}
