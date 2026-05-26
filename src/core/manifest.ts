import path from "node:path";
import YAML from "yaml";
import fs from "fs-extra";
import { SkillPackManifest, SkillPackManifestSchema } from "../types/schema.js";
import { expandHome, readText, writeText } from "../utils/fs.js";
import { SkillPackError } from "../utils/errors.js";

export const MANIFEST_FILE = "skillpack.yaml";

export async function loadManifest(packDir: string): Promise<SkillPackManifest> {
  const manifestPath = path.join(expandHome(packDir), MANIFEST_FILE);
  if (!(await fs.pathExists(manifestPath))) {
    throw new SkillPackError(`No ${MANIFEST_FILE} found in ${packDir}`, "MANIFEST_NOT_FOUND");
  }
  const raw = await readText(manifestPath);
  const parsed = YAML.parse(raw);
  const result = SkillPackManifestSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new SkillPackError(`Invalid skillpack manifest:\n${issues}`, "INVALID_MANIFEST");
  }
  return result.data;
}

export async function saveManifest(packDir: string, manifest: SkillPackManifest): Promise<void> {
  const result = SkillPackManifestSchema.safeParse(manifest);
  if (!result.success) {
    throw new SkillPackError(result.error.message, "INVALID_MANIFEST");
  }
  const manifestPath = path.join(expandHome(packDir), MANIFEST_FILE);
  await writeText(manifestPath, YAML.stringify(result.data));
}

export function packId(manifest: SkillPackManifest): string {
  return manifest.owner ? `${manifest.owner}/${manifest.name}` : manifest.name;
}
