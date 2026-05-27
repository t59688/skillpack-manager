import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { Command } from "commander";
import { defaultReleaseTag, getGitHubLogin, getGitHubReleaseByTag, getGitHubRepository, publishToGitHub } from "../core/github.js";
import { promptGitHubTokenViaBrowser, resolveGitHubTokenFromEnv } from "../core/github-auth.js";
import { resolveGitHubRepoInput } from "../core/github-repo.js";
import { inferGitHubRepoFromGit } from "../core/github-remote.js";
import { loadManifest, saveManifest } from "../core/manifest.js";
import { packSkillPack } from "../core/packer.js";
import { updateSkillPackReadme } from "../core/readme.js";
import { findWorkspaceByPath, upsertWorkspace } from "../core/state.js";
import { bumpVersion, VersionBump } from "../core/version.js";
import { resolvePackDir } from "../core/workspace-resolver.js";
import { SkillPackManifest } from "../types/schema.js";
import { SkillPackError } from "../utils/errors.js";
import { isInteractive, promptConfirm, promptOptionalText, promptSecret, promptText } from "../utils/prompts.js";

export type PublishOptions = {
  out?: string;
  registry?: string;
  to?: "local" | "github";
  repo?: string;
  token?: string;
  tag?: string;
  releaseName?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  createRepo?: boolean;
  public?: boolean;
  private?: boolean;
  bump?: VersionBump | string;
  state?: boolean;
};

async function promptRepoVisibility(manifest: SkillPackManifest): Promise<boolean> {
  return select({
    message: "GitHub repository visibility",
    default: manifest.visibility === "private" || manifest.visibility === "team",
    choices: [
      { name: "Public - anyone can install without a token (recommended for sharing)", value: false },
      { name: "Private - install requires GITHUB_TOKEN (matches skillpack.yaml private/team)", value: true },
    ],
  });
}

function resolveRepoVisibilityFlag(manifest: SkillPackManifest, options: { public?: boolean; private?: boolean }): boolean | undefined {
  if (options.public && options.private) throw new SkillPackError("Use only one of --public or --private.", "INVALID_PUBLISH_OPTIONS");
  if (options.public) return false;
  if (options.private) return true;
  return undefined;
}

async function resolveGitHubRepo(
  packDir: string,
  manifest: SkillPackManifest,
  explicit: string | undefined,
  token: string | undefined,
  rememberedRepo?: string,
): Promise<string> {
  if (explicit) return resolveGitHubRepoInput(explicit, token);
  if (rememberedRepo) return rememberedRepo;

  const fromGit = await inferGitHubRepoFromGit(packDir);
  if (fromGit && !isInteractive()) return resolveGitHubRepoInput(fromGit, token);

  if (token) {
    const login = await getGitHubLogin(token);
    const defaultRepoName = fromGit?.split("/").pop() ?? manifest.name;
    console.log(chalk.dim(`Publishing as GitHub user ${chalk.bold(login)}`));
    console.log(chalk.dim(`Install command for others: skillpack install github:${login}/<repo-name>`));
    if (fromGit && fromGit !== `${login}/${defaultRepoName}`) {
      console.log(chalk.dim(`Git origin points to ${fromGit} (enter owner/repo to use it instead).`));
    }
    const input = await promptText(`Repository name under ${login} (or owner/repo for org)`, defaultRepoName);
    return resolveGitHubRepoInput(input, token);
  }

  console.log(chalk.dim("Dry-run without token: specify the full GitHub repository."));
  const input = await promptText("GitHub repo (owner/repo)", fromGit ?? `${manifest.owner ?? "owner"}/${manifest.name}`);
  return resolveGitHubRepoInput(input, token);
}

async function promptProvider(defaultProvider: "local" | "github" = "local"): Promise<"local" | "github"> {
  return select({
    message: "Where do you want to publish?",
    default: defaultProvider,
    choices: [
      { name: "Local file - create a .skillpack artifact I can upload/share manually", value: "local" as const },
      { name: "GitHub Release - upload to your GitHub repository", value: "github" as const },
    ],
  });
}

function assertBump(value: VersionBump | string | undefined): VersionBump | undefined {
  if (!value) return undefined;
  if (value === "patch" || value === "minor" || value === "major") return value;
  throw new SkillPackError("--bump must be patch, minor, or major.", "INVALID_BUMP");
}

export async function resolveGitHubToken(options: PublishOptions): Promise<string | undefined> {
  let token = resolveGitHubTokenFromEnv(options.token);
  if (!token && !options.dryRun) {
    const action = await select({
      message: "No GITHUB_TOKEN/GH_TOKEN found. How to proceed?",
      choices: [
        { name: "Open browser to create token (recommended)", value: "browser" as const },
        { name: "Paste token now (input will be masked)", value: "enter" as const },
        { name: "Continue as dry-run", value: "dry-run" as const },
        { name: "Cancel", value: "cancel" as const },
      ],
    });
    if (action === "browser") token = await promptGitHubTokenViaBrowser();
    else if (action === "enter") {
      token = await promptSecret("GitHub personal access token");
      if (!token) throw new SkillPackError("No token provided.", "GITHUB_TOKEN_REQUIRED");
    } else if (action === "dry-run") options.dryRun = true;
    else throw new SkillPackError("Cancelled by user.", "GITHUB_TOKEN_REQUIRED");
  }
  return token;
}

async function resolveVersionAndTag(
  packDir: string,
  manifest: SkillPackManifest,
  repo: string,
  token: string | undefined,
  options: PublishOptions,
): Promise<{ manifest: SkillPackManifest; tag: string; releaseAlreadyExists: boolean }> {
  let currentManifest = manifest;
  const bump = assertBump(options.bump);
  if (bump) {
    currentManifest = { ...currentManifest, version: bumpVersion(currentManifest.version, bump) };
    await saveManifest(packDir, currentManifest);
    console.log(chalk.green(`Bumped ${manifest.name} to ${currentManifest.version}`));
  }

  let tag = options.tag ?? defaultReleaseTag(currentManifest.name, currentManifest.version);
  let remoteRelease = await getGitHubReleaseByTag(repo, tag, token);
  if (!remoteRelease) return { manifest: currentManifest, tag, releaseAlreadyExists: false };

  console.log(chalk.yellow(`Remote release ${repo}@${tag} already exists on GitHub.`));
  if (options.overwrite) return { manifest: currentManifest, tag, releaseAlreadyExists: true };

  if (!isInteractive()) {
    throw new SkillPackError(
      `Remote release ${repo}@${tag} already exists. Re-run with --bump patch|minor|major, --tag <new-tag>, or --overwrite.`,
      "GITHUB_RELEASE_EXISTS",
    );
  }

  const action = await select({
    message: "What should happen?",
    choices: [
      { name: `Bump patch -> ${bumpVersion(currentManifest.version, "patch")}`, value: "patch" as const },
      { name: `Bump minor -> ${bumpVersion(currentManifest.version, "minor")}`, value: "minor" as const },
      { name: `Bump major -> ${bumpVersion(currentManifest.version, "major")}`, value: "major" as const },
      { name: "Keep version and overwrite the existing release asset", value: "overwrite" as const },
      { name: "Cancel", value: "cancel" as const },
    ],
  });

  if (action === "cancel") throw new SkillPackError("Cancelled by user.", "GITHUB_RELEASE_EXISTS");
  if (action === "overwrite") {
    options.overwrite = true;
    return { manifest: currentManifest, tag, releaseAlreadyExists: true };
  }

  currentManifest = { ...currentManifest, version: bumpVersion(currentManifest.version, action) };
  await saveManifest(packDir, currentManifest);
  tag = options.tag ?? defaultReleaseTag(currentManifest.name, currentManifest.version);
  remoteRelease = await getGitHubReleaseByTag(repo, tag, token);
  if (remoteRelease && !options.overwrite) {
    throw new SkillPackError(
      `Bumped version also maps to existing remote release ${repo}@${tag}. Re-run with --bump again, --tag <new-tag>, or --overwrite.`,
      "GITHUB_RELEASE_EXISTS",
    );
  }
  console.log(chalk.green(`Bumped ${manifest.name} to ${currentManifest.version}`));
  return { manifest: currentManifest, tag, releaseAlreadyExists: Boolean(remoteRelease) };
}

export async function publishPack(packDirArg: string | undefined, options: PublishOptions): Promise<void> {
  const packDir = await resolvePackDir(packDirArg ?? (await promptText("Skill pack directory to publish", process.cwd())));
  const remembered = await findWorkspaceByPath(packDir);
  const initialManifest = await loadManifest(packDir);
  const provider = options.to ?? remembered?.provider?.type ?? (await promptProvider(remembered?.provider?.type ?? "local"));
  if (provider !== "local" && provider !== "github") throw new SkillPackError("--to must be either local or github.", "INVALID_PUBLISH_TARGET");

  if (provider === "local") {
    let manifest = initialManifest;
    const bump = assertBump(options.bump);
    if (bump) {
      manifest = { ...manifest, version: bumpVersion(manifest.version, bump) };
      await saveManifest(packDir, manifest);
      console.log(chalk.green(`Bumped ${manifest.name} to ${manifest.version}`));
    }
    const artifact = await packSkillPack(packDir, options.out ?? "dist");
    if (options.state !== false) {
      await upsertWorkspace({ manifest, localPath: packDir, lastVersion: manifest.version, lastArtifact: artifact });
    }
    console.log(chalk.green(`Publish artifact created: ${artifact}`));
    if (options.registry) console.log(chalk.yellow("Registry upload is not implemented in the local-first OSS build."));
    else console.log(chalk.dim("Share this file directly, or publish it with --to github --repo owner/repo."));
    return;
  }

  const token = await resolveGitHubToken(options);
  const repo = await resolveGitHubRepo(packDir, initialManifest, options.repo, token, remembered?.provider?.repo);
  const repoVisibility = resolveRepoVisibilityFlag(initialManifest, options);
  const { manifest, tag } = await resolveVersionAndTag(packDir, initialManifest, repo, token, options);
  const readme = await updateSkillPackReadme(packDir, manifest, repo);
  console.log(chalk.dim(`${readme.changed ? "Updated" : "Checked"} README.md with install command and ${readme.skillCount} skill(s).`));
  const artifact = await packSkillPack(packDir, options.out ?? "dist");
  const releaseName = options.releaseName ?? `${manifest.displayName ?? manifest.name} ${manifest.version}`;
  const defaultBody = `SkillPack release for ${manifest.owner ? `${manifest.owner}/` : ""}${manifest.name}@${manifest.version}.`;
  const body = options.body ?? (isInteractive() ? await promptOptionalText("Release notes, optional", defaultBody) : undefined) ?? defaultBody;

  let ensureRepo: Parameters<typeof publishToGitHub>[0]["ensureRepo"];
  if (!options.dryRun && token) {
    const existing = await getGitHubRepository(repo, token);
    if (!existing) {
      console.log(chalk.yellow(`Repository ${repo} was not found (or not visible with this token).`));
      const isPrivate = repoVisibility ?? (await promptRepoVisibility(manifest));
      ensureRepo = {
        description: manifest.description,
        isPrivate,
        createIfMissing: options.createRepo ? true : async () => promptConfirm(`Create GitHub repository ${repo} now?`, true),
      };
    } else if (existing.private) {
      console.log(chalk.dim("This is a private repository. Others must use GITHUB_TOKEN to install, or change visibility on GitHub."));
    } else {
      console.log(chalk.dim("Public repository - others can install without a token."));
    }
  }

  const result = await publishToGitHub({
    repo,
    token,
    tag,
    releaseName,
    body,
    artifactPath: artifact,
    readmeContent: readme.content,
    readmeCommitMessage: `Update SkillPack README for ${manifest.version}`,
    draft: options.draft,
    prerelease: options.prerelease,
    overwrite: options.overwrite,
    dryRun: options.dryRun,
    ensureRepo,
    onRepoCreated: (repository) => console.log(chalk.green(`Created repository ${repository.full_name} (${repository.html_url})`)),
    onRepoInitialized: () => console.log(chalk.dim("Initialized empty repository with README.md (required before creating a Release).")),
    onReadmeUpdated: () => console.log(chalk.dim("Updated GitHub README.md with install instructions.")),
  });

  if (options.state !== false) {
    await upsertWorkspace({
      manifest,
      localPath: packDir,
      provider: { type: "github", repo: result.repo },
      lastVersion: manifest.version,
      lastTag: result.tag,
      lastArtifact: artifact,
      lastReleaseUrl: result.releaseUrl,
      lastAssetUrl: result.assetUrl,
    });
  }

  if (result.dryRun) console.log(chalk.yellow("Dry run: no GitHub release was created."));
  else console.log(chalk.green("Published to GitHub Releases."));
  console.log(`Repo: ${result.repo}`);
  console.log(`Tag: ${result.tag}`);
  console.log(`Artifact: ${artifact}`);
  console.log(`Release: ${result.releaseUrl}`);
  if (result.assetUrl) console.log(`Download: ${result.assetUrl}`);
  console.log(chalk.dim(`Workspace remembered: ${packDir} -> github:${result.repo}`));
}

export function publishCommand(): Command {
  return new Command("publish")
    .description("publish a skill pack locally or to GitHub Releases")
    .argument("[packDir]", "skill pack directory; omit for prompt")
    .option("-o, --out <dir>", "output directory", "dist")
    .option("--to <provider>", "publish target: local or github")
    .option("--repo <name>", "GitHub repo name under your account, or owner/repo for orgs")
    .option("--token <token>", "GitHub token; defaults to GITHUB_TOKEN or GH_TOKEN")
    .option("--tag <tag>", "GitHub release tag; defaults to <pack-name>-v<version>")
    .option("--release-name <name>", "GitHub release name")
    .option("--body <markdown>", "GitHub release body")
    .option("--draft", "create the GitHub release as a draft")
    .option("--prerelease", "mark the GitHub release as a prerelease")
    .option("--overwrite", "replace an existing release asset with the same file name")
    .option("--dry-run", "show what would be published without calling GitHub")
    .option("--create-repo", "create the GitHub repository if it does not exist yet")
    .option("--public", "create repository as public (others can install without a token)")
    .option("--private", "create repository as private (install requires a token)")
    .option("--bump <type>", "bump manifest version before publishing: patch, minor, or major")
    .option("--no-state", "do not record workspace/provider metadata under ~/.skillpack")
    .option("--registry <url>", "legacy registry URL placeholder")
    .action(publishPack);
}
