import chalk from "chalk";
import { Command } from "commander";
import { TARGETS, formatTargetHelp } from "../adapters/targets.js";
import { inspectResolvedPackSource, installPack, resolvePackSource } from "../core/installer.js";
import { SkillPackManifest, TargetName, TargetSchema } from "../types/schema.js";
import { getTargetChoices, promptManyTargets, promptText } from "../utils/prompts.js";

function collectTarget(value: string, previous: string[]): string[] {
  return [...previous, value];
}

async function defaultInstallTargets(manifest: SkillPackManifest, customLocalDir?: string): Promise<TargetName[]> {
  if (manifest.targets.length > 0) return manifest.targets;
  const choices = await getTargetChoices(customLocalDir);
  const detected = choices.filter((choice) => choice.exists && choice.target !== "local").map((choice) => choice.target);
  return detected.length > 0 ? detected : ["claude"];
}

function printInstallPreview(source: string, manifest: SkillPackManifest): void {
  const pack = manifest.owner ? `${manifest.owner}/${manifest.name}` : manifest.name;
  console.log(`Pack: ${chalk.bold(`${pack}@${manifest.version}`)}`);
  console.log(`Source: ${source}`);
  console.log("");
  console.log(`This pack contains ${manifest.skills.length} skill${manifest.skills.length === 1 ? "" : "s"}:`);
  for (const skill of manifest.skills) console.log(`- ${skill.name}`);
  console.log("");
}

export function installCommand(): Command {
  return new Command("install")
    .description("install a skill pack to one or more agent targets")
    .argument(
      "[source]",
      "local path, .skillpack file, github:owner/repo[@tag], or https://github.com/owner/repo; omit for prompt",
    )
    .option("-t, --target <target>", `${formatTargetHelp()}; repeat to install to several targets`, collectTarget, [])
    .option("--target-dir <dir>", "custom target skills directory; best used with --target local")
    .option("--token <token>", "GitHub token for private repos; defaults to GITHUB_TOKEN or GH_TOKEN")
    .option("--overwrite", "overwrite existing skill directories", false)
    .action(async (sourceArg: string | undefined, options: { target: string[]; targetDir?: string; token?: string; overwrite: boolean }) => {
      const source =
        sourceArg ??
        (await promptText(
          "Pack source (local path, .skillpack, github:owner/repo, or GitHub URL)",
          process.cwd(),
        ));
      const resolvedSource = await resolvePackSource(source, { token: options.token });
      const inspected = await inspectResolvedPackSource(resolvedSource);

      try {
        printInstallPreview(source, inspected.manifest);
        const defaults = await defaultInstallTargets(inspected.manifest, options.targetDir);
        const targets: TargetName[] = options.target.length
          ? options.target.map((target) => TargetSchema.parse(target))
          : await promptManyTargets("Install to:", defaults, options.targetDir);

        console.log("Install to:");
        for (const target of targets) console.log(`- ${TARGETS[target].displayName}`);
        console.log("");

        for (const target of targets) {
          const entry = await installPack(source, {
            target,
            targetDir: target === "local" ? options.targetDir : undefined,
            overwrite: options.overwrite,
            token: options.token,
            resolvedSource,
          });
          console.log(chalk.green(`Installed ${entry.pack}@${entry.version} to ${TARGETS[entry.target].displayName}`));
          for (const skill of entry.skills) console.log(`${chalk.green("OK")} ${skill.name} ${chalk.dim(skill.path)}`);
        }
      } finally {
        await inspected.cleanup();
      }
    });
}
