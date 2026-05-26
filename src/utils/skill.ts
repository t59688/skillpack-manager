import path from "node:path";
import { readText } from "./fs.js";

export function inferSkillNameFromDir(skillDir: string): string {
  return path.basename(skillDir).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function readSkillDescription(skillMdPath: string): Promise<string | undefined> {
  const content = await readText(skillMdPath);
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return undefined;
  const description = frontmatter[1].match(/^description:\s*["']?(.+?)["']?\s*$/m);
  return description?.[1]?.trim();
}

export async function readSkillName(skillMdPath: string): Promise<string | undefined> {
  const content = await readText(skillMdPath);
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return undefined;
  const name = frontmatter[1].match(/^name:\s*["']?(.+?)["']?\s*$/m);
  return name?.[1]?.trim();
}
