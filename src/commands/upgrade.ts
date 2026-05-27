import crypto from "node:crypto";
import path from "node:path";
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { Command } from "commander";
import fg from "fast-glob";
import fs from "fs-extra";
import { auditPack } from "../core/audit.js";
import { downloadSkillPackFromGitHub } from "../core/github-install.js";
import { loadManifest, saveManifest } from "../core/manifest.js";
import { extractSkillPack } from "../core/packer.js";
import { cachePath } from "../core/registry.js";
import { findWorkspaceByPath } from "../core/state.js";
import { bumpVersion, VersionBump } from "../core/version.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { publishPack, PublishOptions, resolveGitHubToken } from "./publish.js";
import { AuditIssue, SkillPackManifest } from "../types/schema.js";
import { SkillPackError } from "../utils/errors.js";
import { sha256Directory } from "../utils/fs.js";
import { isInteractive, promptConfirm, promptText } from "../utils/prompts.js";

type UpgradeOptions = {
  bump?: string;
  out?: string;
  token?: string;
  body?: string;
  releaseName?: string;
  draft?: boolean;
  prerelease?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  yes?: boolean;
};

function parseBump(value: string | undefined): VersionBump | undefined {
  if (!value) return undefined;
  if (value === "patch" || value === "minor" || value === "major") return value;
  throw new SkillPackError("--bump must be patch, minor, or major.", "INVALID_BUMP");
}

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

function manifestForContentHash(manifest: SkillPackManifest): unknown {
  return {
    ...manifest,
    version: undefined,
    skills: manifest.skills.map((skill) => ({ ...skill, checksum: undefined })),
  };
}

async function hashDirectoryInto(hash: crypto.Hash, root: string, prefix: string): Promise<void> {
  if (!(await fs.pathExists(root))) {
    hash.update(`${prefix}\0MISSING\0`);
    return;
  }

  const files = await fg("**/*", {
    cwd: root,
    onlyFiles: true,
    dot: true,
    ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**"],
  });

  for (const file of files.sort()) {
    const normalized = file.replaceAll(path.sep, "/");
    hash.update(`${prefix}/${normalized}\0`);
    hash.update(await fs.readFile(path.join(root, file)));
    hash.update("\0");
  }
}

async function packContentFingerprint(packDir: string): Promise<string> {
  const manifest = await loadManifest(packDir);
  const hash = crypto.createHash("sha256");
  hash.update(stableJson(manifestForContentHash(manifest)));
  hash.update("\0");

  for (const skill of [...manifest.skills].sort((left, right) => left.path.localeCompare(right.path))) {
    await hashDirectoryInto(hash, path.resolve(packDir, skill.path), skill.path.replaceAll(path.sep, "/"));
  }

  await hashDirectoryInto(hash, path.resolve(packDir, "shared"), "shared");
  return `sha256:${hash.digest("hex")}`;
}

async function artifactContentFingerprint(artifactPath: string): Promise<string> {
  const tempDir = cachePath("upgrade-compare", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.remove(tempDir);
  try {
    await extractSkillPack(artifactPath, tempDir);
    return await packContentFingerprint(tempDir);
  } finally {
    await fs.remove(tempDir);
  }
}

function formatIssue(issue: AuditIssue): string {
  const color = issue.level === "error" ? chalk.red : issue.level === "warning" ? chalk.yellow : chalk.blue;
  return `${color(issue.level.toUpperCase())} ${chalk.bold(issue.code)} ${issue.message}${issue.file ? chalk.dim(` (${issue.file})`) : ""}`;
}

async function auditOrThrow(packDir: string): Promise<void> {
  const issues = await auditPack(packDir);
  if (issues.length === 0) {
    console.log(chalk.green("Audit passed: no issues found."));
    return;
  }

  for (const issue of issues) console.log(formatIssue(issue));
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length > 0) {
    throw new SkillPackError("Upgrade stopped because audit found errors.", "AUDIT_FAILED");
  }
}

async function refreshSkillChecksums(packDir: string, manifest: SkillPackManifest): Promise<void> {
  const skills = [];
  for (const skill of manifest.skills) {
    const skillDir = path.resolve(packDir, skill.path);
    if (await fs.pathExists(skillDir)) {
      skills.push({ ...skill, checksum: await sha256Directory(skillDir) });
    } else {
      skills.push(skill);
    }
  }
  await saveManifest(packDir, { ...manifest, skills });
}

async function promptBump(currentVersion: string): Promise<VersionBump> {
  return select({
    message: "What kind of upgrade is this?",
    choices: [
      { name: `patch - fixes or small changes (${currentVersion} -> ${bumpVersion(currentVersion, "patch")})`, value: "patch" as const },
      { name: `minor - new skill or capability (${currentVersion} -> ${bumpVersion(currentVersion, "minor")})`, value: "minor" as const },
      { name: `major - breaking change (${currentVersion} -> ${bumpVersion(currentVersion, "major")})`, value: "major" as const },
    ],
  });
}

export function upgradeCommand(): Command {
  return new Command("upgrade")
    .description("bump, audit, pack, and publish a GitHub-backed workspace")
    .argument("[pack]", "workspace reference, pack name, owner/name, GitHub repo, or local path")
    .option("--bump <type>", "patch, minor, or major; omit to choose interactively")
    .option("-o, --out <dir>", "output directory", "dist")
    .option("--token <token>", "GitHub token; defaults to GITHUB_TOKEN or GH_TOKEN")
    .option("--release-name <name>", "GitHub release name")
    .option("--body <markdown>", "GitHub release body")
    .option("--draft", "create the GitHub release as a draft")
    .option("--prerelease", "mark the GitHub release as a prerelease")
    .option("--overwrite", "replace an existing release asset with the same file name")
    .option("--dry-run", "show what would be published without calling GitHub")
    .option("-y, --yes", "continue when the remote latest tag differs from local state")
    .action(async (packArg: string | undefined, options: UpgradeOptions) => {
      const reference = packArg ?? (await promptText("Skill pack workspace to upgrade", process.cwd()));
      const packDir = await resolvePackDir(reference);
      const workspace = await findWorkspaceByPath(packDir);
      const manifest = await loadManifest(packDir);

      if (!workspace?.provider || workspace.provider.type !== "github") {
        throw new SkillPackError(
          `No GitHub workspace binding found for ${packDir}. Run 'skillpack pull github:owner/repo' or 'skillpack publish ${packDir} --to github --repo owner/repo' first.`,
          "WORKSPACE_NOT_BOUND",
        );
      }

      const repo = workspace.provider.repo;
      const publishOptions: PublishOptions = {
        out: options.out,
        to: "github",
        repo,
        token: options.token,
        releaseName: options.releaseName,
        body: options.body,
        draft: options.draft,
        prerelease: options.prerelease,
        overwrite: options.overwrite,
        dryRun: options.dryRun,
      };
      const token = await resolveGitHubToken(publishOptions);
      publishOptions.token = token;

      console.log(`Workspace: ${packDir}`);
      console.log(`GitHub repo: github:${repo}`);

      const latest = await downloadSkillPackFromGitHub(`github:${repo}`, {
        token,
        latestOnly: true,
        outputDir: cachePath("upgrade-baseline", repo.replaceAll("/", "-")),
      });
      console.log(`Remote latest: ${latest.tag}`);

      if (workspace.lastTag && latest.tag !== workspace.lastTag && !options.yes) {
        const message = `Remote latest is ${latest.tag}, but this workspace last saw ${workspace.lastTag}. Continue from this workspace?`;
        const shouldContinue = isInteractive() ? await promptConfirm(message, false) : false;
        if (!shouldContinue) {
          throw new SkillPackError("Upgrade cancelled because the workspace is behind the remote latest release.", "WORKSPACE_BEHIND_REMOTE");
        }
      }

      const [currentFingerprint, remoteFingerprint] = await Promise.all([
        packContentFingerprint(packDir),
        artifactContentFingerprint(latest.artifactPath),
      ]);
      if (currentFingerprint === remoteFingerprint) {
        console.log(chalk.yellow("No local skill pack content changes found since the latest remote release. Nothing to upgrade."));
        return;
      }

      const bump = parseBump(options.bump) ?? (isInteractive() ? await promptBump(manifest.version) : undefined);
      if (!bump) {
        throw new SkillPackError("Upgrade type is required in non-interactive mode. Re-run with --bump patch|minor|major.", "INVALID_BUMP");
      }

      await auditOrThrow(packDir);
      await refreshSkillChecksums(packDir, await loadManifest(packDir));
      await publishPack(packDir, { ...publishOptions, bump });
    });
}
