import path from "node:path";
import fs from "fs-extra";
import { SkillPackManifest } from "../types/schema.js";
import { expandHome, readText, writeText } from "../utils/fs.js";
import { SkillPackError } from "../utils/errors.js";
import { readSkillDescription } from "../utils/skill.js";

export const README_SECTION_START = "<!-- skillpack:readme:start -->";
export const README_SECTION_END = "<!-- skillpack:readme:end -->";

export type SkillPackReadmeUpdate = {
  path: string;
  content: string;
  changed: boolean;
  installCommand: string;
  skillCount: number;
};

type ReadmeSkill = {
  name: string;
  path: string;
  version?: string;
  description?: string;
};

function displayName(manifest: SkillPackManifest): string {
  return manifest.displayName ?? manifest.name;
}

function markdownCell(value: string | undefined): string {
  const text = value?.trim() || "-";
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function markdownCode(value: string): string {
  return `\`${value.replace(/`/g, "\\`")}\``;
}

function defaultReadmeIntro(manifest: SkillPackManifest): string {
  return [`# ${displayName(manifest)}`, "", manifest.description].join("\n");
}

async function describeSkills(packDir: string, manifest: SkillPackManifest): Promise<ReadmeSkill[]> {
  const absolutePackDir = expandHome(packDir);
  const skills: ReadmeSkill[] = [];
  for (const skill of manifest.skills) {
    const skillMd = path.join(absolutePackDir, skill.path, "SKILL.md");
    const description = (await fs.pathExists(skillMd)) ? await readSkillDescription(skillMd).catch(() => undefined) : undefined;
    skills.push({
      name: skill.name,
      path: skill.path.replaceAll(path.sep, "/"),
      version: skill.version,
      description,
    });
  }
  return skills;
}

export function buildSkillPackReadmeSection(manifest: SkillPackManifest, repo: string, skills: ReadmeSkill[]): string {
  const installCommand = `skillpack install github:${repo}`;
  const lines = [
    README_SECTION_START,
    "## Install",
    "",
    "Install the latest published release from GitHub:",
    "",
    "```sh",
    installCommand,
    "```",
    "",
    "| Pack | Version | Source |",
    "| --- | --- | --- |",
    `| ${markdownCell(displayName(manifest))} | ${markdownCode(manifest.version)} | ${markdownCode(`github:${repo}`)} |`,
    "",
    "## Included Skills",
    "",
  ];

  if (skills.length === 0) {
    lines.push("_No skills are listed in this pack yet._");
  } else {
    lines.push("| Skill | Description | Path | Version |");
    lines.push("| --- | --- | --- | --- |");
    for (const skill of [...skills].sort((left, right) => left.name.localeCompare(right.name))) {
      lines.push(
        `| ${markdownCode(skill.name)} | ${markdownCell(skill.description)} | ${markdownCode(skill.path)} | ${markdownCell(skill.version)} |`,
      );
    }
  }

  lines.push("", README_SECTION_END);
  return lines.join("\n");
}

export function upsertSkillPackReadmeSection(existing: string, manifest: SkillPackManifest, section: string): string {
  const start = existing.indexOf(README_SECTION_START);
  const end = existing.indexOf(README_SECTION_END);

  if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
    throw new SkillPackError(
      "README.md contains an incomplete SkillPack managed section. Remove the broken marker or restore both start/end markers.",
      "INVALID_README_SECTION",
    );
  }

  if (start === -1) {
    const base = existing.trim().length > 0 ? existing.trimEnd() : defaultReadmeIntro(manifest);
    return `${base}\n\n${section}\n`;
  }

  const before = existing.slice(0, start).trimEnd();
  const after = existing.slice(end + README_SECTION_END.length).trimStart();
  return [before, section, after].filter((part) => part.length > 0).join("\n\n") + "\n";
}

export async function updateSkillPackReadme(packDir: string, manifest: SkillPackManifest, repo: string): Promise<SkillPackReadmeUpdate> {
  const readmePath = path.join(expandHome(packDir), "README.md");
  const existing = (await fs.pathExists(readmePath)) ? await readText(readmePath) : "";
  const skills = await describeSkills(packDir, manifest);
  const section = buildSkillPackReadmeSection(manifest, repo, skills);
  const content = upsertSkillPackReadmeSection(existing, manifest, section);
  const changed = existing !== content;
  if (changed) {
    await writeText(readmePath, content);
  }
  return {
    path: readmePath,
    content,
    changed,
    installCommand: `skillpack install github:${repo}`,
    skillCount: skills.length,
  };
}
