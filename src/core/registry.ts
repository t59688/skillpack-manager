import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import YAML from "yaml";
import { InstalledPack, InstalledPackSchema, TargetName } from "../types/schema.js";
import { ensureDir, expandHome, readText, writeText } from "../utils/fs.js";

export function skillpackHome(): string {
  return path.join(os.homedir(), ".skillpack");
}

export function installedDbPath(): string {
  return path.join(skillpackHome(), "installed.yaml");
}

export async function loadInstalledDb(): Promise<InstalledPack[]> {
  const filePath = installedDbPath();
  if (!(await fs.pathExists(filePath))) return [];
  const raw = await readText(filePath);
  const parsed = YAML.parse(raw) ?? [];
  return InstalledPackSchema.array().parse(parsed);
}

export async function saveInstalledDb(items: InstalledPack[]): Promise<void> {
  await ensureDir(skillpackHome());
  await writeText(installedDbPath(), YAML.stringify(items));
}

export async function recordInstall(entry: InstalledPack): Promise<void> {
  const db = await loadInstalledDb();
  const filtered = db.filter((item) => !(item.pack === entry.pack && item.target === entry.target));
  filtered.push(entry);
  await saveInstalledDb(filtered);
}

export function installedPackMatches(pack: string, reference: string): boolean {
  const normalizedPack = pack.toLowerCase();
  const normalizedRef = reference.toLowerCase();
  return normalizedPack === normalizedRef || normalizedPack.split("/").pop() === normalizedRef;
}

export async function findInstalledPacks(pack?: string, target?: TargetName): Promise<InstalledPack[]> {
  const db = await loadInstalledDb();
  return db.filter((item) => (!pack || installedPackMatches(item.pack, pack)) && (!target || item.target === target));
}

export async function removeInstall(pack: string, target?: TargetName): Promise<InstalledPack[]> {
  const db = await loadInstalledDb();
  const removed = db.filter((item) => installedPackMatches(item.pack, pack) && (!target || item.target === target));
  const kept = db.filter((item) => !(installedPackMatches(item.pack, pack) && (!target || item.target === target)));
  await saveInstalledDb(kept);
  return removed;
}

export function cachePath(...parts: string[]): string {
  return expandHome(path.join(skillpackHome(), "cache", ...parts));
}
