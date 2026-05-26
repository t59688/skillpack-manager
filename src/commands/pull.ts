import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import { Command } from "commander";
import { downloadSkillPackFromGitHub, isGitHubInstallSource } from "../core/github-install.js";
import { loadManifest } from "../core/manifest.js";
import { extractSkillPack } from "../core/packer.js";
import { defaultWorkspacePath, upsertWorkspace } from "../core/state.js";
import { cachePath } from "../core/registry.js";
import { SkillPackError } from "../utils/errors.js";
import { expandHome } from "../utils/fs.js";
import { isInteractive, promptConfirm, promptText } from "../utils/prompts.js";

function safeTempName(repo: string): string {
  return `${repo.replaceAll("/", "-")}-${Date.now()}`;
}

async function isEmptyDirectory(dir: string): Promise<boolean> {
  if (!(await fs.pathExists(dir))) return true;
  const entries = await fs.readdir(dir);
  return entries.length === 0;
}

export function pullCommand(): Command {
  return new Command("pull")
    .description("download a GitHub skill pack release into an editable local workspace")
    .argument("[source]", "github:owner/repo[@tag] or https://github.com/owner/repo")
    .option("-o, --out <dir>", "workspace directory; defaults to ~/.skillpack/workspaces/<owner>/<pack>")
    .option("--token <token>", "GitHub token for private repos; defaults to GITHUB_TOKEN or GH_TOKEN")
    .option("--overwrite", "replace an existing workspace directory")
    .action(async (sourceArg: string | undefined, options: { out?: string; token?: string; overwrite?: boolean }) => {
      const source = sourceArg ?? (await promptText("GitHub source to pull", "github:owner/repo"));
      if (!isGitHubInstallSource(source)) {
        throw new SkillPackError("pull only supports GitHub sources such as github:owner/repo or a GitHub repo URL.", "INVALID_GITHUB_SOURCE");
      }

      const download = await downloadSkillPackFromGitHub(source, { token: options.token });
      const tempDir = cachePath("pull", safeTempName(download.repo));
      await fs.remove(tempDir);
      await extractSkillPack(download.artifactPath, tempDir);
      const manifest = await loadManifest(tempDir);
      const repoOwner = download.repo.split("/")[0];
      const destination = expandHome(options.out ?? defaultWorkspacePath(manifest.owner ?? repoOwner, manifest.name));

      if (!(await isEmptyDirectory(destination))) {
        const shouldOverwrite = options.overwrite ?? (isInteractive() ? await promptConfirm(`Workspace ${destination} already exists. Replace it?`, false) : false);
        if (!shouldOverwrite) {
          throw new SkillPackError(`Workspace already exists: ${destination}. Re-run with --overwrite or choose --out <dir>.`, "WORKSPACE_EXISTS");
        }
        await fs.remove(destination);
      }

      await fs.ensureDir(path.dirname(destination));
      await fs.move(tempDir, destination, { overwrite: true });
      await upsertWorkspace({
        manifest,
        localPath: destination,
        provider: { type: "github", repo: download.repo },
        lastVersion: manifest.version,
        lastTag: download.tag,
        lastArtifact: download.artifactPath,
        lastReleaseUrl: download.releaseUrl,
      });

      console.log(chalk.green(`Pulled ${manifest.owner ? `${manifest.owner}/` : ""}${manifest.name}@${manifest.version}`));
      console.log(`Workspace: ${destination}`);
      console.log(`Provider: github:${download.repo}`);
      console.log(chalk.dim(`Edit files in this workspace, then run: skillpack publish ${manifest.name}`));
      console.log(chalk.dim(`Full path also works: skillpack publish ${destination}`));
    });
}
