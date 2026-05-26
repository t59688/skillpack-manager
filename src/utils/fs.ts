import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";

export function expandHome(inputPath: string): string {
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

export async function pathExists(inputPath: string): Promise<boolean> {
  return fs.pathExists(expandHome(inputPath));
}

export async function ensureDir(inputPath: string): Promise<void> {
  await fs.ensureDir(expandHome(inputPath));
}

export async function readText(inputPath: string): Promise<string> {
  return fs.readFile(expandHome(inputPath), "utf8");
}

export async function writeText(inputPath: string, contents: string): Promise<void> {
  await fs.ensureDir(path.dirname(expandHome(inputPath)));
  await fs.writeFile(expandHome(inputPath), contents, "utf8");
}

export async function listSkillDirs(root: string): Promise<string[]> {
  const absoluteRoot = expandHome(root);
  const matches = await fg("**/SKILL.md", {
    cwd: absoluteRoot,
    onlyFiles: true,
    dot: true,
    ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
  });
  return matches.map((match) => path.dirname(path.join(absoluteRoot, match)));
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(expandHome(filePath));
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return `sha256:${hash.digest("hex")}`;
}

export async function sha256Directory(dirPath: string): Promise<string> {
  const absoluteDir = expandHome(dirPath);
  const files = await fg("**/*", {
    cwd: absoluteDir,
    onlyFiles: true,
    dot: true,
    ignore: ["**/.git/**", "**/node_modules/**"],
  });
  const hash = crypto.createHash("sha256");
  for (const file of files.sort()) {
    const filePath = path.join(absoluteDir, file);
    hash.update(file.replaceAll(path.sep, "/"));
    hash.update(await fs.readFile(filePath));
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function copyDirSafe(source: string, destination: string, overwrite = false): Promise<void> {
  const src = expandHome(source);
  const dest = expandHome(destination);
  if (!overwrite && (await fs.pathExists(dest))) {
    throw new Error(`Destination already exists: ${dest}`);
  }
  await fs.ensureDir(path.dirname(dest));
  await fs.copy(src, dest, { overwrite, errorOnExist: !overwrite });
}
