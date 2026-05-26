import path from "node:path";
import fs from "fs-extra";
import { loadManifest } from "./manifest.js";
import { AuditIssue } from "../types/schema.js";
import { expandHome, readText } from "../utils/fs.js";

const suspiciousPatterns: Array<{ code: string; pattern: RegExp; message: string }> = [
  { code: "REMOTE_SHELL", pattern: /curl\s+[^|]+\|\s*(sh|bash)|wget\s+[^|]+\|\s*(sh|bash)/i, message: "Contains curl/wget piped into a shell." },
  { code: "SECRET_LIKE_VALUE", pattern: /(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{20,}/i, message: "Contains a string that looks like a hard-coded secret." },
  { code: "DANGEROUS_DELETE", pattern: /rm\s+-rf\s+(\/|~|\$HOME)/i, message: "Contains a broad destructive delete command." },
];

export async function auditPack(packDir: string): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  let manifest;
  try {
    manifest = await loadManifest(packDir);
  } catch (error) {
    issues.push({ level: "error", code: "INVALID_MANIFEST", message: String((error as Error).message) });
    return issues;
  }

  if (manifest.skills.length === 0) {
    issues.push({ level: "warning", code: "NO_SKILLS", message: "Pack contains no skills." });
  }

  const seenNames = new Set<string>();
  for (const skill of manifest.skills) {
    if (seenNames.has(skill.name)) {
      issues.push({ level: "error", code: "DUPLICATE_SKILL", message: `Duplicate skill name: ${skill.name}` });
    }
    seenNames.add(skill.name);

    const skillDir = path.resolve(expandHome(packDir), skill.path);
    const skillMd = path.join(skillDir, "SKILL.md");
    if (!(await fs.pathExists(skillMd))) {
      issues.push({ level: "error", code: "MISSING_SKILL_MD", message: `Missing SKILL.md for ${skill.name}`, file: skill.path });
      continue;
    }

    const contents = await readText(skillMd);
    if (!contents.startsWith("---")) {
      issues.push({ level: "warning", code: "MISSING_FRONTMATTER", message: `${skill.name} SKILL.md has no YAML frontmatter.`, file: skill.path });
    }
    const description = contents.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    if (!description || description.length < 30) {
      issues.push({ level: "warning", code: "WEAK_DESCRIPTION", message: `${skill.name} has a short or missing trigger description.`, file: skill.path });
    }

    for (const check of suspiciousPatterns) {
      if (check.pattern.test(contents)) {
        issues.push({ level: "warning", code: check.code, message: check.message, file: skill.path });
      }
    }
  }

  return issues;
}
