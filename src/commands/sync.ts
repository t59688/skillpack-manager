import chalk from "chalk";
import { Command } from "commander";
import { formatTargetHelp } from "../adapters/targets.js";
import { downloadSkillPackFromGitHub, isGitHubInstallSource, parseGitHubInstallSource } from "../core/github-install.js";
import { installedRecordMatchesTargetDir } from "../core/installed-diff.js";
import { inspectResolvedPackSource, resolvePackSource } from "../core/installer.js";
import { packId } from "../core/manifest.js";
import { cachePath, findInstalledPacks } from "../core/registry.js";
import { syncInstalledPack, SyncResult } from "../core/sync.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { TargetName, TargetSchema } from "../types/schema.js";
import { SkillPackError } from "../utils/errors.js";
import { promptText } from "../utils/prompts.js";

type SyncOptions = {
  target?: string;
  targetDir?: string;
  token?: string;
  force?: boolean;
};

function latestGitHubSource(source: string): string {
  const parsed = parseGitHubInstallSource(source);
  if (!parsed) return source;
  return `github:${parsed.repo}`;
}

async function resolveSyncSource(source: string, token?: string): Promise<{ resolvedSource: string; source: string }> {
  if (!isGitHubInstallSource(source)) {
    try {
      return { resolvedSource: await resolvePackDir(source), source };
    } catch {
      return { resolvedSource: await resolvePackSource(source, { token }), source };
    }
  }

  const latestSource = latestGitHubSource(source);
  const download = await downloadSkillPackFromGitHub(latestSource, {
    token,
    latestOnly: true,
    outputDir: cachePath("sync", latestSource.replace(/^github:/, "").replaceAll("/", "-")),
  });
  return { resolvedSource: download.artifactPath, source: latestSource };
}

function formatChange(change: { name: string; installedVersion?: string; latestVersion?: string }): string {
  if (!change.installedVersion && !change.latestVersion) return change.name;
  if (!change.installedVersion) return `${change.name} -> ${change.latestVersion ?? "(unknown)"}`;
  return `${change.name} ${change.installedVersion} -> ${change.latestVersion ?? "(unknown)"}`;
}

function printList(title: string, items: string[]): void {
  console.log(`${title}:`);
  if (items.length === 0) {
    console.log("- none");
    return;
  }
  for (const item of items) console.log(`- ${item}`);
}

function printSyncResult(result: SyncResult): void {
  console.log(chalk.bold(`${result.entry.pack}@${result.entry.version} on ${result.entry.target}`));
  console.log(`Target: ${result.before.targetRoot}`);
  console.log("");
  printList("Missing", result.before.missing.map((skill) => skill.name));
  console.log("");
  printList("Outdated", result.before.outdated.map(formatChange));
  console.log("");
  printList("Extra local skills", result.before.extraLocal.map((skill) => skill.name));
  console.log("");
  printList("Modified", result.before.modified.map((skill) => skill.name));
  console.log("");
  printList("Synced", [
    ...result.added.map((skill) => `added ${skill.name}`),
    ...result.updated.map((skill) => `updated ${formatChange(skill)}`),
    ...result.overwrittenModified.map((skill) => `overwrote modified ${formatChange(skill)}`),
  ]);
  if (result.skippedModified.length > 0) {
    console.log("");
    console.log(chalk.yellow(`Skipped modified skills: ${result.skippedModified.map((skill) => skill.name).join(", ")}`));
    console.log(chalk.dim("Re-run with --force to overwrite modified installed skills."));
  }
}

export function syncCommand(): Command {
  return new Command("sync")
    .description("sync installed skills with the latest pack release while preserving extra local skills")
    .argument("[source]", "local path, .skillpack file, github:owner/repo, or GitHub URL; omit for prompt")
    .option("-t, --target <target>", formatTargetHelp())
    .option("--target-dir <dir>", "custom target skills directory")
    .option("--token <token>", "GitHub token for private repos; defaults to GITHUB_TOKEN or GH_TOKEN")
    .option("--force", "overwrite installed skills modified after install")
    .action(async (sourceArg: string | undefined, options: SyncOptions) => {
      const source = sourceArg ?? (await promptText("Pack source to sync", "github:owner/repo"));
      const resolved = await resolveSyncSource(source, options.token);
      const inspected = await inspectResolvedPackSource(resolved.resolvedSource);
      try {
        const pack = packId(inspected.manifest);
        const target: TargetName | undefined = options.target ? TargetSchema.parse(options.target) : undefined;
        const records = (await findInstalledPacks(pack, target)).filter((record) =>
          installedRecordMatchesTargetDir(record, options.targetDir),
        );
        if (records.length === 0) {
          throw new SkillPackError(`No installed records found for ${pack}. Install it first, then run sync.`, "INSTALLED_PACK_NOT_FOUND");
        }

        for (const [index, record] of records.entries()) {
          if (index > 0) console.log("");
          printSyncResult(await syncInstalledPack(inspected.packDir, resolved.source, record, { force: options.force }));
        }
      } finally {
        await inspected.cleanup();
      }
    });
}
