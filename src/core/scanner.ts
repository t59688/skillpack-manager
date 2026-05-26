import path from "node:path";
import fs from "fs-extra";
import { ScanResult } from "../types/schema.js";
import { expandHome, listSkillDirs } from "../utils/fs.js";
import { inferSkillNameFromDir, readSkillDescription, readSkillName } from "../utils/skill.js";

export async function scanSkills(root: string): Promise<ScanResult[]> {
  const absoluteRoot = expandHome(root);
  if (!(await fs.pathExists(absoluteRoot))) return [];
  const dirs = await listSkillDirs(absoluteRoot);
  const results: ScanResult[] = [];
  for (const dir of dirs) {
    const skillMd = path.join(dir, "SKILL.md");
    const explicitName = await readSkillName(skillMd).catch(() => undefined);
    const description = await readSkillDescription(skillMd).catch(() => undefined);
    results.push({
      name: explicitName ?? inferSkillNameFromDir(dir),
      path: dir,
      hasSkillMd: true,
      description,
    });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
