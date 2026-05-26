import path from "node:path";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { loadManifest, MANIFEST_FILE } from "./manifest.js";
import { auditPack } from "./audit.js";
import { expandHome } from "../utils/fs.js";
import { SkillPackError } from "../utils/errors.js";

export async function packSkillPack(packDir: string, outputDir?: string): Promise<string> {
  const absolutePackDir = expandHome(packDir);
  const manifest = await loadManifest(absolutePackDir);
  const issues = await auditPack(absolutePackDir);
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length > 0) {
    throw new SkillPackError(`Cannot pack because audit found errors:\n${errors.map((e) => `- ${e.message}`).join("\n")}`, "AUDIT_FAILED");
  }

  const outDir = expandHome(outputDir ?? path.resolve(process.cwd(), "dist"));
  await fs.ensureDir(outDir);
  const outPath = path.join(outDir, `${manifest.name}-${manifest.version}.skillpack`);

  const zip = new AdmZip();
  zip.addLocalFile(path.join(absolutePackDir, MANIFEST_FILE));
  for (const skill of manifest.skills) {
    zip.addLocalFolder(path.resolve(absolutePackDir, skill.path), skill.path.replaceAll(path.sep, "/"));
  }
  if (await fs.pathExists(path.join(absolutePackDir, "shared"))) {
    zip.addLocalFolder(path.join(absolutePackDir, "shared"), "shared");
  }
  zip.writeZip(outPath);
  return outPath;
}

export async function extractSkillPack(artifact: string, destination: string): Promise<void> {
  const zip = new AdmZip(expandHome(artifact));
  await fs.ensureDir(expandHome(destination));
  zip.extractAllTo(expandHome(destination), true);
}
