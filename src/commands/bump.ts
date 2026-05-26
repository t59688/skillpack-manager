import chalk from "chalk";
import { Command } from "commander";
import { loadManifest, saveManifest } from "../core/manifest.js";
import { findWorkspaceByPath, upsertWorkspace } from "../core/state.js";
import { bumpVersion, VersionBump } from "../core/version.js";
import { SkillPackError } from "../utils/errors.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { promptText } from "../utils/prompts.js";

function parseBump(value: string | undefined): VersionBump | undefined {
  if (!value) return undefined;
  if (value === "patch" || value === "minor" || value === "major") return value;
  throw new SkillPackError("Bump type must be patch, minor, or major.", "INVALID_BUMP");
}

export function bumpCommand(): Command {
  return new Command("bump")
    .description("bump a skill pack version in skillpack.yaml")
    .argument("[packDir]", "skill pack directory; omit for prompt")
    .argument("[type]", "patch, minor, or major")
    .option("--set <version>", "set an exact semver version")
    .action(async (packDirArg: string | undefined, typeArg: string | undefined, options: { set?: string }) => {
      const packDir = await resolvePackDir(packDirArg ?? (await promptText("Skill pack directory", process.cwd())));
      const manifest = await loadManifest(packDir);
      const nextVersion = options.set ?? bumpVersion(manifest.version, parseBump(typeArg) ?? "patch");
      const nextManifest = { ...manifest, version: nextVersion };
      await saveManifest(packDir, nextManifest);
      const remembered = await findWorkspaceByPath(packDir);
      await upsertWorkspace({
        manifest: nextManifest,
        localPath: packDir,
        provider: remembered?.provider,
        lastVersion: remembered?.lastVersion,
        lastTag: remembered?.lastTag,
        lastArtifact: remembered?.lastArtifact,
        lastReleaseUrl: remembered?.lastReleaseUrl,
        lastAssetUrl: remembered?.lastAssetUrl,
      });
      console.log(chalk.green(`Bumped ${manifest.name}: ${manifest.version} -> ${nextVersion}`));
    });
}
