import path from "node:path";
import fs from "fs-extra";
import { select } from "@inquirer/prompts";
import ora from "ora";
import { parseGitHubRemoteUrl } from "./github-remote.js";
import { isGitHubAuthStatus, promptGitHubTokenForPrivateRepo, promptUpdatedGitHubToken, resolveGitHubTokenFromEnv } from "./github-auth.js";
import { resolveGitHubRepoInput } from "./github-repo.js";
import { cachePath } from "./registry.js";
import { ensureDir, expandHome } from "../utils/fs.js";
import { SkillPackError } from "../utils/errors.js";
import { isInteractive } from "../utils/prompts.js";

const API_BASE = "https://api.github.com";

export type GitHubInstallRef = {
  repo: string;
  tag?: string;
};

export type GitHubDownloadResult = {
  artifactPath: string;
  repo: string;
  tag: string;
  assetName: string;
  releaseUrl: string;
  source: string;
};

export type GitHubReleaseSummary = {
  repo: string;
  tag: string;
  name: string;
  releaseUrl: string;
};

type ReleaseAsset = {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
};

type Release = {
  tag_name: string;
  name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at?: string;
  assets: ReleaseAsset[];
};

type GitHubErrorPayload = {
  message?: string;
};

export type GitHubDownloadOptions = {
  token?: string;
  /** Where to save the .skillpack file (default: ~/.skillpack/cache/downloads/...) */
  outputDir?: string;
  /** Skip interactive release picker; use latest only */
  latestOnly?: boolean;
  pickTag?: (releases: Release[]) => Promise<string>;
  pickAsset?: (assets: ReleaseAsset[]) => Promise<string>;
};

/** Parse github:owner/repo[@tag] or https://github.com/owner/repo[...] */
export function parseGitHubInstallSource(source: string): GitHubInstallRef | undefined {
  const trimmed = source.trim();

  const schemeMatch = trimmed.match(/^github:([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?)(?:@(.+))?$/i);
  if (schemeMatch) {
    return { repo: schemeMatch[1], tag: schemeMatch[2] || undefined };
  }

  if (/github\.com/i.test(trimmed)) {
    const repo = parseGitHubRemoteUrl(trimmed);
    if (!repo) return undefined;
    const tagMatch = trimmed.match(/\/releases\/tag\/([^/?#]+)/i);
    return { repo, tag: tagMatch ? decodeURIComponent(tagMatch[1]) : undefined };
  }

  return undefined;
}

export function isGitHubInstallSource(source: string): boolean {
  return parseGitHubInstallSource(source) !== undefined;
}

function resolveToken(token?: string): string | undefined {
  return resolveGitHubTokenFromEnv(token);
}

function isAuthRequiredError(error: unknown): boolean {
  return error instanceof SkillPackError && error.code === "GITHUB_API_FAILED" && error.message.includes("404");
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function githubFetch(
  url: string,
  options: RequestInit & { token?: string; context?: string },
): Promise<Response> {
  const { token, headers, context, ...rest } = options;
  const authToken = resolveToken(token);

  const request = (nextToken: string | undefined) =>
    fetch(url, {
      ...rest,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {}),
        ...headers,
      },
    });

  const response = await request(authToken);
  if (!authToken || !isGitHubAuthStatus(response.status)) return response;

  const nextToken = await promptUpdatedGitHubToken(authToken, context);
  return request(nextToken);
}

async function githubGet<T>(url: string, token: string | undefined, context: string): Promise<T> {
  const response = await githubFetch(url, {
    token,
    context,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await readJson<GitHubErrorPayload>(response);
      if (payload?.message) detail = `${detail}: ${payload.message}`;
    } catch {
      // ignore
    }
    const hint =
      response.status === 404 && !token
        ? " If this is a private repository, re-run with GITHUB_TOKEN/GH_TOKEN or pass --token (the CLI will prompt interactively)."
        : response.status === 404
          ? " Repository not found, release/tag missing, or token cannot access it."
          : response.status === 401 || response.status === 403
            ? " Token missing or lacks access to this repository."
            : "";
    throw new SkillPackError(`GitHub API failed (${context}): ${detail}${hint}`, "GITHUB_API_FAILED");
  }

  return readJson<T>(response);
}

async function fetchLatestRelease(repo: string, token?: string): Promise<Release> {
  return githubGet<Release>(`${API_BASE}/repos/${repo}/releases/latest`, token, `latest release for ${repo}`);
}

async function fetchReleaseByTag(repo: string, tag: string, token?: string): Promise<Release> {
  return githubGet<Release>(
    `${API_BASE}/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
    token,
    `release ${tag} for ${repo}`,
  );
}

async function listReleases(repo: string, token?: string): Promise<Release[]> {
  return githubGet<Release[]>(`${API_BASE}/repos/${repo}/releases?per_page=30`, token, `list releases for ${repo}`);
}

function publishedReleases(releases: Release[]): Release[] {
  return releases.filter((release) => !release.draft);
}

async function promptReleaseTag(releases: Release[]): Promise<string> {
  return select({
    message: "Choose release version",
    choices: releases.map((release) => ({
      name: `${release.tag_name}${release.prerelease ? " (prerelease)" : ""}${release.name ? ` — ${release.name}` : ""}`,
      value: release.tag_name,
    })),
  });
}

async function promptSkillpackAsset(assets: ReleaseAsset[]): Promise<ReleaseAsset> {
  const name = await select({
    message: "Choose .skillpack asset",
    choices: assets.map((asset) => ({
      name: `${asset.name} (${Math.round(asset.size / 1024)} KB)`,
      value: asset.name,
    })),
  });
  const asset = assets.find((item) => item.name === name);
  if (!asset) throw new SkillPackError(`Asset ${name} not found on release.`, "GITHUB_ASSET_NOT_FOUND");
  return asset;
}

function findSkillpackAssets(assets: ReleaseAsset[]): ReleaseAsset[] {
  return assets.filter((asset) => asset.name.toLowerCase().endsWith(".skillpack"));
}

async function pickSkillpackAsset(
  release: Release,
  pickAsset?: (assets: ReleaseAsset[]) => Promise<string>,
): Promise<ReleaseAsset> {
  const skillpackAssets = findSkillpackAssets(release.assets);
  if (skillpackAssets.length === 0) {
    const names = release.assets.map((asset) => asset.name).join(", ") || "(none)";
    throw new SkillPackError(
      `Release ${release.tag_name} has no .skillpack asset. Available assets: ${names}`,
      "GITHUB_ASSET_NOT_FOUND",
    );
  }
  if (skillpackAssets.length === 1) return skillpackAssets[0];

  if (pickAsset) {
    const name = await pickAsset(skillpackAssets);
    const asset = skillpackAssets.find((item) => item.name === name);
    if (!asset) throw new SkillPackError(`Asset ${name} not found on release.`, "GITHUB_ASSET_NOT_FOUND");
    return asset;
  }

  if (isInteractive()) {
    return promptSkillpackAsset(skillpackAssets);
  }

  return skillpackAssets[0];
}

async function resolveRelease(
  ref: GitHubInstallRef,
  token: string | undefined,
  options: GitHubDownloadOptions,
): Promise<Release> {
  if (ref.tag) {
    return fetchReleaseByTag(ref.repo, ref.tag, token);
  }

  try {
    return await fetchLatestRelease(ref.repo, token);
  } catch (error) {
    if (!(error instanceof SkillPackError) || !error.message.includes("404")) {
      throw error;
    }
  }

  const releases = publishedReleases(await listReleases(ref.repo, token));
  if (releases.length === 0) {
    throw new SkillPackError(`No published releases found for ${ref.repo}.`, "GITHUB_RELEASE_NOT_FOUND");
  }

  if (releases.length === 1 || options.latestOnly) {
    return releases[0];
  }

  if (options.pickTag) {
    const tag = await options.pickTag(releases);
    return fetchReleaseByTag(ref.repo, tag, token);
  }

  if (isInteractive()) {
    const tag = await promptReleaseTag(releases);
    return fetchReleaseByTag(ref.repo, tag, token);
  }

  return releases[0];
}

/**
 * Download a private release asset via the GitHub API (browser_download_url often 404s without a session).
 * @see https://docs.github.com/en/rest/releases/assets#download-a-release-asset
 */
async function downloadReleaseAssetViaApi(repo: string, assetId: number, destPath: string, token: string): Promise<void> {
  let url: string | null = `${API_BASE}/repos/${repo}/releases/assets/${assetId}`;
  for (let hop = 0; hop < 6 && url; hop++) {
    const response = await githubFetch(url, {
      redirect: "manual",
      token,
      context: `download release asset from ${repo}`,
      headers: {
        Accept: "application/octet-stream",
      },
    });

    if (response.status === 302 || response.status === 307 || response.status === 303) {
      url = response.headers.get("location");
      continue;
    }

    if (response.ok) {
      await fs.writeFile(destPath, Buffer.from(await response.arrayBuffer()));
      return;
    }

    throw new SkillPackError(
      `Failed to download release asset via GitHub API: ${response.status} ${response.statusText}. ` +
        "Ensure your token can read this repository (classic: repo scope; fine-grained: Contents read).",
      "GITHUB_DOWNLOAD_FAILED",
    );
  }

  throw new SkillPackError("Failed to download release asset: too many redirects.", "GITHUB_DOWNLOAD_FAILED");
}

async function downloadReleaseAsset(
  repo: string,
  asset: ReleaseAsset,
  destPath: string,
  token?: string,
): Promise<void> {
  if (token) {
    await downloadReleaseAssetViaApi(repo, asset.id, destPath, token);
    return;
  }

  const response = await fetch(asset.browser_download_url, { redirect: "follow" });
  if (!response.ok) {
    throw new SkillPackError(
      `Failed to download asset: ${response.status} ${response.statusText}. ` +
        "If this is a private repository, set GITHUB_TOKEN/GH_TOKEN or pass --token.",
      "GITHUB_DOWNLOAD_FAILED",
    );
  }
  await fs.writeFile(destPath, Buffer.from(await response.arrayBuffer()));
}

async function downloadSkillPackFromGitHubOnce(
  source: string,
  options: GitHubDownloadOptions,
): Promise<GitHubDownloadResult> {
  const parsed = parseGitHubInstallSource(source);
  if (!parsed) {
    throw new SkillPackError(
      `Invalid GitHub source: ${source}\n` +
        "Use github:owner/repo, github:repo (with token), github:owner/repo@tag, or https://github.com/owner/repo",
      "INVALID_GITHUB_SOURCE",
    );
  }

  const token = resolveToken(options.token);
  const repo = await resolveGitHubRepoInput(parsed.repo, token);
  const ref = { repo, tag: parsed.tag };

  const release = await resolveRelease(ref, token, options);
  const asset = await pickSkillpackAsset(release, options.pickAsset);

  const safeRepo = ref.repo.replace("/", "-");
  const destDir = expandHome(options.outputDir ?? cachePath("downloads", safeRepo));
  await ensureDir(destDir);
  const destPath = path.join(destDir, asset.name);

  const spinner = ora(`Downloading ${asset.name} from ${ref.repo}@${release.tag_name}`).start();
  try {
    await downloadReleaseAsset(ref.repo, asset, destPath, token);
    spinner.succeed(`Downloaded ${asset.name}`);
  } catch (error) {
    spinner.fail("Download failed");
    throw error;
  }

  return {
    artifactPath: destPath,
    repo: ref.repo,
    tag: release.tag_name,
    assetName: asset.name,
    releaseUrl: release.html_url,
    source: source.trim(),
  };
}

export async function downloadSkillPackFromGitHub(
  source: string,
  options: GitHubDownloadOptions = {},
): Promise<GitHubDownloadResult> {
  try {
    return await downloadSkillPackFromGitHubOnce(source, options);
  } catch (error) {
    if (!isAuthRequiredError(error) || resolveToken(options.token)) {
      throw error;
    }
    const token = await promptGitHubTokenForPrivateRepo();
    return downloadSkillPackFromGitHubOnce(source, { ...options, token });
  }
}

export async function getLatestGitHubReleaseSummary(repo: string, token?: string): Promise<GitHubReleaseSummary> {
  const authToken = resolveToken(token);
  const resolvedRepo = await resolveGitHubRepoInput(repo, authToken);
  const release = await resolveRelease({ repo: resolvedRepo }, authToken, { latestOnly: true });
  return {
    repo: resolvedRepo,
    tag: release.tag_name,
    name: release.name,
    releaseUrl: release.html_url,
  };
}
