import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { TARGETS } from "../adapters/targets.js";
import { downloadSkillPackFromGitHub, isGitHubInstallSource, parseGitHubInstallSource } from "../core/github-install.js";
import { inspectResolvedPackSource, installPack } from "../core/installer.js";
import { packId } from "../core/manifest.js";
import { cachePath, findInstalledPacks, installedPackMatches } from "../core/registry.js";
import { analyzePackSecurity } from "../core/security.js";
import { compareVersions } from "../core/version.js";
import { InstalledPack } from "../types/schema.js";
import { SkillPackError } from "../utils/errors.js";
import { sha256Directory } from "../utils/fs.js";
import { isInteractive, promptConfirm } from "../utils/prompts.js";
import { printSecuritySummary } from "../utils/security-output.js";

type UpdateOptions = {
  token?: string;
  force?: boolean;
};

type UpdateGroup = {
  source: string;
  latestSource: string;
  records: InstalledPack[];
};

function groupInstalled(records: InstalledPack[]): UpdateGroup[] {
  const groups = new Map<string, UpdateGroup>();
  for (const record of records) {
    const ref = parseGitHubInstallSource(record.source);
    if (!ref) continue;
    const latestSource = `github:${ref.repo}`;
    const key = `${record.pack}\0${latestSource}`;
    const existing = groups.get(key);
    if (existing) existing.records.push(record);
    else groups.set(key, { source: record.source, latestSource, records: [record] });
  }
  return [...groups.values()];
}

async function modifiedSkills(record: InstalledPack): Promise<string[]> {
  const modified: string[] = [];
  for (const skill of record.skills) {
    if ((await fs.pathExists(skill.path)) && (await sha256Directory(skill.path)) !== skill.checksum) {
      modified.push(skill.name);
    }
  }
  return modified;
}

function targetDirFor(record: InstalledPack): string | undefined {
  return record.targetDir ?? (record.skills[0] ? path.dirname(record.skills[0].path) : undefined);
}

export function updateCommand(): Command {
  return new Command("update")
    .description("update installed GitHub skill packs to the latest release")
    .argument("[pack]", "installed pack id or short name; omit to check all installed GitHub packs")
    .option("--token <token>", "GitHub token for private repos; defaults to GITHUB_TOKEN or GH_TOKEN")
    .option("--force", "overwrite installed skills even if they were modified after install")
    .action(async (packArg: string | undefined, options: UpdateOptions) => {
      const installed = await findInstalledPacks(packArg);
      if (installed.length === 0) {
        console.log(chalk.yellow(packArg ? `No installed pack found for ${packArg}.` : "No installed packs recorded."));
        return;
      }

      const githubRecords = installed.filter((record) => isGitHubInstallSource(record.source));
      if (githubRecords.length === 0) {
        console.log(chalk.yellow("No installed GitHub-backed packs found."));
        return;
      }

      let updated = 0;
      let available = 0;
      for (const group of groupInstalled(githubRecords)) {
        const download = await downloadSkillPackFromGitHub(group.latestSource, {
          token: options.token,
          latestOnly: true,
          outputDir: cachePath("updates", group.latestSource.replace(/^github:/, "").replaceAll("/", "-")),
        });
        const inspected = await inspectResolvedPackSource(download.artifactPath);
        try {
          const latestPack = packId(inspected.manifest);
          const first = group.records[0];
          if (!installedPackMatches(latestPack, first.pack)) {
            throw new SkillPackError(
              `Latest release from ${group.latestSource} contains ${latestPack}, but installed record is ${first.pack}.`,
              "PACK_MISMATCH",
            );
          }

          const recordsToUpdate = group.records.filter((record) => compareVersions(inspected.manifest.version, record.version) > 0);
          if (recordsToUpdate.length === 0) {
            const versions = [...new Set(group.records.map((record) => record.version))].join(", ");
            console.log(`${first.pack}: installed ${versions}, latest ${inspected.manifest.version} (${chalk.green("up to date")})`);
            continue;
          }

          available += recordsToUpdate.length;
          for (const record of recordsToUpdate) {
            console.log(`${record.pack}: ${record.version} -> ${inspected.manifest.version} available`);
            printSecuritySummary(await analyzePackSecurity(inspected.packDir));
            const modified = await modifiedSkills(record);
            if (modified.length > 0 && !options.force) {
              console.log(chalk.yellow(`Modified installed skills: ${modified.join(", ")}`));
              const shouldOverwrite = isInteractive() ? await promptConfirm("Update anyway and overwrite modified skills?", false) : false;
              if (!shouldOverwrite) {
                console.log(chalk.yellow(`Skipped ${record.pack} on ${TARGETS[record.target].displayName}.`));
                continue;
              }
            }

            const entry = await installPack(group.latestSource, {
              target: record.target,
              targetDir: targetDirFor(record),
              overwrite: true,
              token: options.token,
              resolvedSource: download.artifactPath,
            });
            updated += 1;
            console.log(chalk.green(`Updated ${entry.pack}: ${record.version} -> ${entry.version} on ${TARGETS[entry.target].displayName}`));
          }
        } finally {
          await inspected.cleanup();
        }
      }

      if (available === 0) console.log(chalk.green("All installed GitHub packs are up to date."));
      else if (updated === 0) console.log(chalk.yellow("No packs were updated."));
    });
}
