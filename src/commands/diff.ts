import chalk from "chalk";
import { Command } from "commander";
import { formatTargetHelp } from "../adapters/targets.js";
import { diffPack } from "../core/diff.js";
import { isGitHubInstallSource, downloadSkillPackFromGitHub } from "../core/github-install.js";
import { diffInstalledPack, InstalledPackDiff, InstalledSkillChange, installedRecordMatchesTargetDir } from "../core/installed-diff.js";
import { inspectResolvedPackSource, resolvePackSource } from "../core/installer.js";
import { packId } from "../core/manifest.js";
import { findInstalledPacks, cachePath } from "../core/registry.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { TargetName, TargetSchema } from "../types/schema.js";
import { SkillPackError } from "../utils/errors.js";
import { promptOneTarget, promptText } from "../utils/prompts.js";

type DiffOptions = {
  target?: string;
  targetDir?: string;
  installed?: boolean;
  token?: string;
};

function printChanges(title: string, changes: InstalledSkillChange[], formatter: (change: InstalledSkillChange) => string = (change) => change.name): void {
  console.log(`${title}:`);
  if (changes.length === 0) {
    console.log("- none");
    return;
  }
  for (const change of changes) console.log(`- ${formatter(change)}`);
}

function versionChange(change: InstalledSkillChange): string {
  const from = change.installedVersion ?? "(not recorded)";
  const to = change.latestVersion ?? "(unknown)";
  return `${change.name} ${from} -> ${to}`;
}

function printInstalledDiff(result: InstalledPackDiff): void {
  console.log(chalk.bold(`${result.pack}@${result.latestVersion} on ${result.record.target}`));
  console.log(`Target: ${result.targetRoot}`);
  console.log("");
  printChanges("Missing", result.missing);
  console.log("");
  printChanges("Outdated", result.outdated, versionChange);
  console.log("");
  printChanges("Extra local skills", result.extraLocal);
  console.log("");
  printChanges("Modified", result.modified);
}

async function resolveInstalledDiffSource(source: string, token?: string): Promise<string> {
  if (!isGitHubInstallSource(source)) {
    try {
      return await resolvePackDir(source);
    } catch {
      return resolvePackSource(source, { token });
    }
  }
  const download = await downloadSkillPackFromGitHub(source, {
    token,
    latestOnly: true,
    outputDir: cachePath("diff", source.replace(/^github:/, "").replaceAll("/", "-").replaceAll("@", "-")),
  });
  return download.artifactPath;
}

export function diffCommand(): Command {
  return new Command("diff")
    .description("compare a pack with a target skills directory")
    .argument("[packDir]", "skill pack directory/source; omit for prompt")
    .option("-t, --target <target>", formatTargetHelp())
    .option("--target-dir <dir>", "custom target skills directory")
    .option("--installed", "compare the pack with SkillPack install records and installed skill directories")
    .option("--token <token>", "GitHub token for private repos; defaults to GITHUB_TOKEN or GH_TOKEN")
    .action(async (packDirArg: string | undefined, options: DiffOptions) => {
      if (options.installed) {
        const source = packDirArg ?? (await promptText("Pack source to compare", process.cwd()));
        const resolvedSource = await resolveInstalledDiffSource(source, options.token);
        const inspected = await inspectResolvedPackSource(resolvedSource);
        try {
          const pack = packId(inspected.manifest);
          const target: TargetName | undefined = options.target ? TargetSchema.parse(options.target) : undefined;
          const records = (await findInstalledPacks(pack, target)).filter((record) => installedRecordMatchesTargetDir(record, options.targetDir));
          if (records.length === 0) {
            throw new SkillPackError(`No installed records found for ${pack}.`, "INSTALLED_PACK_NOT_FOUND");
          }

          for (const [index, record] of records.entries()) {
            if (index > 0) console.log("");
            printInstalledDiff(await diffInstalledPack(inspected.packDir, record));
          }
        } finally {
          await inspected.cleanup();
        }
        return;
      }

      const packDir = await resolvePackDir(packDirArg ?? (await promptText("Skill pack directory to compare", process.cwd())));
      const target: TargetName = options.target ? TargetSchema.parse(options.target) : await promptOneTarget("Compare against which agent?");
      const result = await diffPack(packDir, target, options.targetDir);
      console.log(chalk.bold("Diff result:"));
      console.log(`${chalk.green("Present")}: ${result.present.length ? result.present.join(", ") : "none"}`);
      console.log(`${chalk.yellow("Missing")}: ${result.missing.length ? result.missing.join(", ") : "none"}`);
      console.log(`${chalk.red("Modified")}: ${result.modified.length ? result.modified.join(", ") : "none"}`);
    });
}
