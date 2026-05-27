import path from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";
import { loadManifest } from "./manifest.js";

export type SecurityRiskLevel = "Low" | "Medium" | "High";

export type SecurityFinding = {
  skill: string;
  file: string;
};

export type PackSecuritySummary = {
  secrets: SecurityFinding[];
  remoteInstallScripts: SecurityFinding[];
  executableScripts: SecurityFinding[];
  filesystemAccess: SecurityFinding[];
  riskLevel: SecurityRiskLevel;
};

const executableExtensions = new Set([
  ".bat",
  ".bash",
  ".cmd",
  ".cjs",
  ".exe",
  ".fish",
  ".js",
  ".mjs",
  ".pl",
  ".ps1",
  ".py",
  ".rb",
  ".sh",
  ".ts",
  ".zsh",
]);

const textExtensions = new Set([
  ".bash",
  ".bat",
  ".cmd",
  ".cjs",
  ".css",
  ".fish",
  ".html",
  ".js",
  ".json",
  ".lua",
  ".md",
  ".mjs",
  ".pl",
  ".ps1",
  ".py",
  ".rb",
  ".sh",
  ".toml",
  ".ts",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
  ".zsh",
]);

const secretPattern = /(api[_-]?key|access[_-]?token|private[_-]?key|secret|token|password)\s*[:=]\s*['"]?[A-Za-z0-9_./+=-]{20,}/i;
const remoteInstallPattern =
  /(?:curl|wget)\b[\s\S]{0,240}\|\s*(?:ba)?sh\b|(?:irm|iwr|Invoke-RestMethod|Invoke-WebRequest)\b[\s\S]{0,240}\|\s*(?:iex|Invoke-Expression)\b|bash\s+<\(\s*curl\b/i;
const filesystemPattern =
  /\b(file\s*system|filesystem|local files?|workspace files?|read files?|write files?|create files?|delete files?|modify files?)\b|\b(?:node:fs|fs-extra|fs\.|readFile|writeFile|readdir|mkdir|rm\s+-rf|Remove-Item|Get-ChildItem|Set-Content|Add-Content)\b/i;

function riskLevel(summary: Omit<PackSecuritySummary, "riskLevel">): SecurityRiskLevel {
  if (summary.secrets.length > 0 || summary.remoteInstallScripts.length > 0) return "High";
  if (summary.executableScripts.length > 0 || summary.filesystemAccess.length > 0) return "Medium";
  return "Low";
}

function isTextFile(file: string): boolean {
  return textExtensions.has(path.extname(file).toLowerCase());
}

function isExecutableScript(file: string): boolean {
  return executableExtensions.has(path.extname(file).toLowerCase());
}

async function readTextIfSmall(filePath: string): Promise<string | undefined> {
  const stat = await fs.stat(filePath);
  if (stat.size > 1024 * 1024) return undefined;
  return fs.readFile(filePath, "utf8");
}

function pushOnce(findings: SecurityFinding[], skill: string, file: string): void {
  if (!findings.some((finding) => finding.skill === skill && finding.file === file)) {
    findings.push({ skill, file });
  }
}

export async function analyzePackSecurity(packDir: string): Promise<PackSecuritySummary> {
  const manifest = await loadManifest(packDir);
  const summary: Omit<PackSecuritySummary, "riskLevel"> = {
    secrets: [],
    remoteInstallScripts: [],
    executableScripts: [],
    filesystemAccess: [],
  };

  for (const skill of manifest.skills) {
    const skillDir = path.resolve(packDir, skill.path);
    const files = await fg("**/*", {
      cwd: skillDir,
      onlyFiles: true,
      dot: true,
      ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**"],
    });

    for (const file of files) {
      if (isExecutableScript(file)) pushOnce(summary.executableScripts, skill.name, file);
      if (!isTextFile(file)) continue;

      const filePath = path.join(skillDir, file);
      let contents: string | undefined;
      try {
        contents = await readTextIfSmall(filePath);
      } catch {
        continue;
      }
      if (!contents) continue;

      if (secretPattern.test(contents)) pushOnce(summary.secrets, skill.name, file);
      if (remoteInstallPattern.test(contents)) pushOnce(summary.remoteInstallScripts, skill.name, file);
      if (filesystemPattern.test(contents)) pushOnce(summary.filesystemAccess, skill.name, file);
    }
  }

  return { ...summary, riskLevel: riskLevel(summary) };
}
