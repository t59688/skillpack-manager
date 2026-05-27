import crypto from "node:crypto";
import path from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";
import { loadManifest } from "./manifest.js";
import { SkillPackManifest } from "../types/schema.js";
import { expandHome } from "../utils/fs.js";

export type ReleaseNoteChangeKind = "added" | "updated" | "removed";
export type ReleaseNoteChangeArea = "skill" | "shared-reference" | "shared-asset" | "metadata";

export type ReleaseNoteChange = {
  kind: ReleaseNoteChangeKind;
  area: ReleaseNoteChangeArea;
  label: string;
};

export type GeneratedReleaseNotes = {
  body: string;
  changes: ReleaseNoteChange[];
  previousVersion: string;
  currentVersion: string;
  hasChanges: boolean;
};

type SnapshotItem = {
  label: string;
  fingerprint: string;
};

const kindOrder: Record<ReleaseNoteChangeKind, number> = {
  added: 0,
  updated: 1,
  removed: 2,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizePackPath(input: string): string {
  return input.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return `sha256:${hash.digest("hex")}`;
}

async function hashDirectory(dirPath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const files = await fg("**/*", {
    cwd: dirPath,
    onlyFiles: true,
    dot: true,
    ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**"],
  });

  for (const file of files.sort()) {
    const normalized = file.replaceAll(path.sep, "/");
    hash.update(`${normalized}\0`);
    hash.update(await fs.readFile(path.join(dirPath, file)));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function hashPath(inputPath: string): Promise<string> {
  if (!(await fs.pathExists(inputPath))) return "missing";
  const stat = await fs.stat(inputPath);
  if (stat.isDirectory()) return hashDirectory(inputPath);
  return hashFile(inputPath);
}

async function skillSnapshots(packDir: string, manifest: SkillPackManifest): Promise<Map<string, SnapshotItem>> {
  const snapshots = new Map<string, SnapshotItem>();
  const root = expandHome(packDir);
  for (const skill of manifest.skills) {
    const normalizedPath = normalizePackPath(skill.path);
    const fingerprint = stableJson({
      path: normalizedPath,
      version: skill.version,
      content: await hashPath(path.resolve(root, normalizedPath)),
    });
    snapshots.set(skill.name, { label: skill.name, fingerprint });
  }
  return snapshots;
}

async function discoverSharedFiles(packDir: string, baseDir: string): Promise<string[]> {
  const absoluteBaseDir = path.resolve(expandHome(packDir), baseDir);
  if (!(await fs.pathExists(absoluteBaseDir))) return [];
  const files = await fg("**/*", {
    cwd: absoluteBaseDir,
    onlyFiles: true,
    dot: true,
    ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**"],
  });
  return files.map((file) => normalizePackPath(path.posix.join(baseDir, file.replaceAll(path.sep, "/"))));
}

function sharedLabel(packPath: string, baseDir: string): string {
  const prefix = `${baseDir}/`;
  return packPath.startsWith(prefix) ? packPath.slice(prefix.length) : packPath;
}

async function sharedSnapshots(
  packDir: string,
  declaredPaths: string[],
  baseDir: string,
): Promise<Map<string, SnapshotItem>> {
  const paths = new Set<string>([
    ...declaredPaths.map(normalizePackPath).filter(Boolean),
    ...(await discoverSharedFiles(packDir, baseDir)),
  ]);
  const root = expandHome(packDir);
  const snapshots = new Map<string, SnapshotItem>();
  for (const packPath of [...paths].sort()) {
    snapshots.set(packPath, {
      label: sharedLabel(packPath, baseDir),
      fingerprint: await hashPath(path.resolve(root, packPath)),
    });
  }
  return snapshots;
}

function metadataSnapshot(manifest: SkillPackManifest): Record<string, unknown> {
  return {
    name: manifest.name,
    owner: manifest.owner,
    displayName: manifest.displayName,
    description: manifest.description,
    visibility: manifest.visibility,
    tags: [...manifest.tags].sort(),
    targets: [...manifest.targets].sort(),
  };
}

function metadataChanges(previous: SkillPackManifest, current: SkillPackManifest): ReleaseNoteChange[] {
  const fields: Array<[string, keyof ReturnType<typeof metadataSnapshot>]> = [
    ["name", "name"],
    ["owner", "owner"],
    ["display name", "displayName"],
    ["description", "description"],
    ["visibility", "visibility"],
    ["tags", "tags"],
    ["target agents", "targets"],
  ];
  const previousMetadata = metadataSnapshot(previous);
  const currentMetadata = metadataSnapshot(current);
  const changed = fields
    .filter(([, field]) => stableJson(previousMetadata[field]) !== stableJson(currentMetadata[field]))
    .map(([label]) => label);

  return changed.length ? [{ kind: "updated", area: "metadata", label: changed.join(", ") }] : [];
}

function diffSnapshots(area: ReleaseNoteChangeArea, previous: Map<string, SnapshotItem>, current: Map<string, SnapshotItem>): ReleaseNoteChange[] {
  const changes: ReleaseNoteChange[] = [];
  for (const [key, currentItem] of current) {
    const previousItem = previous.get(key);
    if (!previousItem) {
      changes.push({ kind: "added", area, label: currentItem.label });
    } else if (previousItem.fingerprint !== currentItem.fingerprint) {
      changes.push({ kind: "updated", area, label: currentItem.label });
    }
  }
  for (const [key, previousItem] of previous) {
    if (!current.has(key)) {
      changes.push({ kind: "removed", area, label: previousItem.label });
    }
  }
  return changes.sort((left, right) => kindOrder[left.kind] - kindOrder[right.kind] || left.label.localeCompare(right.label));
}

function marker(kind: ReleaseNoteChangeKind): string {
  if (kind === "added") return "+";
  if (kind === "removed") return "-";
  return "~";
}

function verb(kind: ReleaseNoteChangeKind): string {
  if (kind === "added") return "Added";
  if (kind === "removed") return "Removed";
  return "Updated";
}

function subject(area: ReleaseNoteChangeArea): string {
  if (area === "skill") return "skill";
  if (area === "shared-reference") return "shared reference";
  if (area === "shared-asset") return "shared asset";
  return "pack metadata";
}

function formatChange(change: ReleaseNoteChange): string {
  if (change.area === "metadata") {
    return `- \`${marker(change.kind)}\` ${verb(change.kind)} ${subject(change.area)}: ${change.label}`;
  }
  return `- \`${marker(change.kind)}\` ${verb(change.kind)} ${subject(change.area)}: \`${change.label}\``;
}

function formatSection(title: string, changes: ReleaseNoteChange[]): string[] {
  if (changes.length === 0) return [];
  return [`### ${title}`, "", ...changes.map(formatChange), ""];
}

export function formatReleaseNotes(
  previousVersion: string,
  currentVersion: string,
  changes: ReleaseNoteChange[],
): string {
  const skillChanges = changes.filter((change) => change.area === "skill");
  const sharedChanges = changes.filter((change) => change.area === "shared-reference" || change.area === "shared-asset");
  const metadata = changes.filter((change) => change.area === "metadata");
  const lines = ["## Changes", "", `Compared with previous release \`${previousVersion}\`.`, ""];

  if (changes.length === 0) {
    lines.push("- No user-facing skill pack changes detected.", "");
  } else {
    lines.push(...formatSection("Skills", skillChanges));
    lines.push(...formatSection("Shared", sharedChanges));
    lines.push(...formatSection("Pack Metadata", metadata));
  }

  if (previousVersion !== currentVersion) {
    lines.push(`Previous pack version: \`${previousVersion}\``);
  }
  return lines.join("\n").trimEnd();
}

export async function generateReleaseNotes(previousPackDir: string, currentPackDir: string): Promise<GeneratedReleaseNotes> {
  const previousManifest = await loadManifest(previousPackDir);
  const currentManifest = await loadManifest(currentPackDir);
  const [previousSkills, currentSkills, previousReferences, currentReferences, previousAssets, currentAssets] = await Promise.all([
    skillSnapshots(previousPackDir, previousManifest),
    skillSnapshots(currentPackDir, currentManifest),
    sharedSnapshots(previousPackDir, previousManifest.shared.references, "shared/references"),
    sharedSnapshots(currentPackDir, currentManifest.shared.references, "shared/references"),
    sharedSnapshots(previousPackDir, previousManifest.shared.assets, "shared/assets"),
    sharedSnapshots(currentPackDir, currentManifest.shared.assets, "shared/assets"),
  ]);

  const changes = [
    ...diffSnapshots("skill", previousSkills, currentSkills),
    ...diffSnapshots("shared-reference", previousReferences, currentReferences),
    ...diffSnapshots("shared-asset", previousAssets, currentAssets),
    ...metadataChanges(previousManifest, currentManifest),
  ];

  return {
    body: formatReleaseNotes(previousManifest.version, currentManifest.version, changes),
    changes,
    previousVersion: previousManifest.version,
    currentVersion: currentManifest.version,
    hasChanges: changes.length > 0,
  };
}
