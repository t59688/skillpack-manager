import chalk from "chalk";
import { Command } from "commander";
import { getGitHubReleaseByTag } from "../core/github.js";
import { loadManifest } from "../core/manifest.js";
import { findWorkspaceByPath, loadState } from "../core/state.js";
import { resolvePackDir } from "../core/workspace-resolver.js";

export function statusCommand(): Command {
  return new Command("status")
    .description("show remembered skill pack workspaces and provider bindings")
    .argument("[packDir]", "optional local skill pack directory")
    .option("--remote", "also check whether the current GitHub release exists remotely")
    .option("--token <token>", "GitHub token; defaults to GITHUB_TOKEN or GH_TOKEN")
    .action(async (packDirArg: string | undefined, options: { remote?: boolean; token?: string }) => {
      if (packDirArg) {
        const packDir = await resolvePackDir(packDirArg);
        const manifest = await loadManifest(packDir);
        const workspace = await findWorkspaceByPath(packDir);
        console.log(`${chalk.bold(manifest.owner ? `${manifest.owner}/${manifest.name}` : manifest.name)}@${manifest.version}`);
        console.log(`Path: ${packDir}`);
        if (!workspace) {
          console.log(chalk.yellow("No workspace binding found under ~/.skillpack/state.yaml"));
          return;
        }
        console.log(`Provider: ${workspace.provider ? `${workspace.provider.type}:${workspace.provider.repo}` : "(none)"}`);
        console.log(`Last published: ${workspace.lastTag ?? "(never)"}`);
        if (workspace.lastReleaseUrl) console.log(`Release: ${workspace.lastReleaseUrl}`);
        if (options.remote && workspace.provider?.type === "github") {
          const tag = `${manifest.name}-v${manifest.version}`;
          const release = await getGitHubReleaseByTag(workspace.provider.repo, tag, options.token);
          console.log(`Remote ${tag}: ${release ? chalk.green("exists") : chalk.yellow("not found")}`);
        }
        return;
      }

      const state = await loadState();
      if (state.workspaces.length === 0) {
        console.log(chalk.dim("No remembered workspaces yet. Publish or pull a pack to create one."));
        return;
      }
      for (const workspace of state.workspaces) {
        console.log(`${chalk.bold(workspace.pack)} ${workspace.lastVersion ? `@${workspace.lastVersion}` : ""}`);
        console.log(`  path: ${workspace.localPath}`);
        console.log(`  provider: ${workspace.provider ? `${workspace.provider.type}:${workspace.provider.repo}` : "(none)"}`);
        if (workspace.lastTag) console.log(`  last tag: ${workspace.lastTag}`);
        if (workspace.lastReleaseUrl) console.log(`  release: ${workspace.lastReleaseUrl}`);
      }
    });
}
