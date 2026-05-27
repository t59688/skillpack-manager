import fs from "fs-extra";
import path from "node:path";
import { SkillPackError } from "../utils/errors.js";

export type GitHubPublisherOptions = {
  repo: string;
  token?: string;
  tag: string;
  releaseName?: string;
  body?: string;
  artifactPath: string;
  readmeContent?: string;
  readmeCommitMessage?: string;
  draft?: boolean;
  prerelease?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  ensureRepo?: EnsureGitHubRepoOptions;
  onRepoCreated?: (repository: GitHubRepository) => void;
  onRepoInitialized?: () => void;
  onReadmeUpdated?: () => void;
  apiBaseUrl?: string;
  uploadsBaseUrl?: string;
};

export type GitHubPublishResult = {
  repo: string;
  tag: string;
  releaseUrl: string;
  assetUrl?: string;
  artifactName: string;
  dryRun: boolean;
};

type GitHubRelease = {
  id: number;
  html_url: string;
  upload_url: string;
};

type GitHubAsset = {
  id: number;
  name: string;
  browser_download_url: string;
};

type GitHubErrorPayload = {
  message?: string;
  errors?: Array<{ field?: string; message?: string; code?: string }>;
};

type GitHubUser = {
  login: string;
};

type GitHubRepository = {
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch?: string | null;
};

type GitHubContentFile = {
  type: string;
  sha: string;
  content?: string;
  encoding?: string;
};

export type EnsureGitHubRepoOptions = {
  description?: string;
  isPrivate?: boolean;
  createIfMissing?: boolean | (() => Promise<boolean>);
};

const DEFAULT_API_BASE_URL = "https://api.github.com";

export function parseGitHubRepo(repo: string): { owner: string; repoName: string } {
  const match = repo.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    throw new SkillPackError("GitHub repo must be in owner/repo format.", "INVALID_GITHUB_REPO");
  }
  return { owner: match[1], repoName: match[2] };
}

export function defaultReleaseTag(packName: string, version: string): string {
  return `${packName}-v${version}`;
}

function resolveToken(token?: string): string | undefined {
  return token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

function formatGitHubApiError(status: number, statusText: string, payload?: GitHubErrorPayload, context?: string): string {
  let message = `${status} ${statusText}`;
  if (payload?.message) {
    message = `${message}: ${payload.message}`;
  }
  if (payload?.errors?.length) {
    const details = payload.errors.map((error) => error.message ?? error.code ?? "validation error").join("; ");
    message = `${message} (${details})`;
  }
  const prefix = context ? `GitHub API request failed (${context})` : "GitHub API request failed";
  let text = `${prefix}: ${message}`;
  if (status === 422 && context?.includes("create release")) {
    text +=
      "\nEmpty repositories cannot publish releases. The CLI initializes new repos automatically; re-run publish on this repository.";
  }
  return text;
}

async function githubRequest<T>(
  url: string,
  options: RequestInit & { token?: string; context?: string; allowStatuses?: number[] },
): Promise<T> {
  const { token, headers, context, allowStatuses, ...rest } = options;
  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok && !allowStatuses?.includes(response.status)) {
    let payload: GitHubErrorPayload | undefined;
    try {
      payload = await readJson<GitHubErrorPayload>(response);
    } catch {
      // Keep the HTTP status message when the response body is not JSON.
    }
    throw new SkillPackError(formatGitHubApiError(response.status, response.statusText, payload, context), "GITHUB_API_FAILED");
  }

  return readJson<T>(response);
}

export async function getGitHubLogin(token: string, apiBaseUrl = DEFAULT_API_BASE_URL): Promise<string> {
  const user = await githubRequest<GitHubUser>(`${apiBaseUrl}/user`, { method: "GET", token, context: "get current user" });
  return user.login;
}

export async function getGitHubRepository(
  repo: string,
  token: string,
  apiBaseUrl = DEFAULT_API_BASE_URL,
): Promise<GitHubRepository | undefined> {
  const response = await fetch(`${apiBaseUrl}/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    let payload: GitHubErrorPayload | undefined;
    try {
      payload = await readJson<GitHubErrorPayload>(response);
    } catch {
      // ignore
    }
    if (response.status === 401 || response.status === 403) {
      throw new SkillPackError(
        `${formatGitHubApiError(response.status, response.statusText, payload, `access repository ${repo}`)}. ` +
          "Check that your token has the repo scope (classic) or Contents read/write on this repository (fine-grained).",
        "GITHUB_AUTH_FAILED",
      );
    }
    throw new SkillPackError(formatGitHubApiError(response.status, response.statusText, payload, `get repository ${repo}`), "GITHUB_API_FAILED");
  }

  return readJson<GitHubRepository>(response);
}

export async function createGitHubRepository(
  owner: string,
  repoName: string,
  token: string,
  options: { description?: string; isPrivate?: boolean },
  apiBaseUrl = DEFAULT_API_BASE_URL,
): Promise<GitHubRepository> {
  const login = await getGitHubLogin(token, apiBaseUrl);
  const body = JSON.stringify({
    name: repoName,
    description: options.description,
    private: options.isPrivate ?? true,
    auto_init: true,
  });

  if (owner.toLowerCase() === login.toLowerCase()) {
    return githubRequest<GitHubRepository>(`${apiBaseUrl}/user/repos`, {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body,
      context: `create repository ${owner}/${repoName}`,
    });
  }

  return githubRequest<GitHubRepository>(`${apiBaseUrl}/orgs/${owner}/repos`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body,
    context: `create org repository ${owner}/${repoName}`,
  });
}

export async function ensureGitHubRepository(
  repo: string,
  token: string,
  options: EnsureGitHubRepoOptions = {},
): Promise<{ repository: GitHubRepository; created: boolean }> {
  const { owner, repoName } = parseGitHubRepo(repo);
  const existing = await getGitHubRepository(repo, token);
  if (existing) {
    return { repository: existing, created: false };
  }

  let shouldCreate = options.createIfMissing === true;
  if (typeof options.createIfMissing === "function") {
    shouldCreate = await options.createIfMissing();
  }

  if (!shouldCreate) {
    throw new SkillPackError(
      `GitHub repository ${repo} was not found (or your token cannot access it).\n` +
        `- Create the repository on GitHub first, or re-run and choose to create it when prompted.\n` +
        `- Verify owner/repo spelling and token permissions (classic: repo scope; fine-grained: Contents read/write on this repo).`,
      "GITHUB_REPO_NOT_FOUND",
    );
  }

  const created = await createGitHubRepository(owner, repoName, token, {
    description: options.description,
    isPrivate: options.isPrivate,
  });
  return { repository: created, created: true };
}

async function repositoryHasCommits(repo: string, token: string, apiBaseUrl: string): Promise<boolean> {
  const response = await fetch(`${apiBaseUrl}/repos/${repo}/commits?per_page=1`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404 || response.status === 409) {
    return false;
  }
  if (!response.ok) {
    return true;
  }

  const commits = await readJson<unknown[]>(response);
  return Array.isArray(commits) && commits.length > 0;
}

/** GitHub Releases require at least one commit on the default branch. */
export async function ensureRepositoryInitialized(
  repo: string,
  token: string,
  apiBaseUrl = DEFAULT_API_BASE_URL,
): Promise<boolean> {
  if (await repositoryHasCommits(repo, token, apiBaseUrl)) {
    return false;
  }

  const { repoName } = parseGitHubRepo(repo);
  const meta = await getGitHubRepository(repo, token, apiBaseUrl);
  const branch = meta?.default_branch ?? "main";
  const readme = Buffer.from(
    `# ${repoName}\n\nReleases for skill packs published via SkillPack CLI.\n`,
    "utf8",
  ).toString("base64");

  await githubRequest(`${apiBaseUrl}/repos/${repo}/contents/README.md`, {
    method: "PUT",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Initialize repository for SkillPack releases",
      content: readme,
      branch,
    }),
    context: `initialize empty repository ${repo}`,
  });
  return true;
}

async function getGitHubReadme(
  repo: string,
  token: string,
  branch: string,
  apiBaseUrl = DEFAULT_API_BASE_URL,
): Promise<GitHubContentFile | undefined> {
  const response = await fetch(`${apiBaseUrl}/repos/${repo}/contents/README.md?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) return undefined;
  if (!response.ok) {
    let payload: GitHubErrorPayload | undefined;
    try {
      payload = await readJson<GitHubErrorPayload>(response);
    } catch {
      // ignore
    }
    throw new SkillPackError(formatGitHubApiError(response.status, response.statusText, payload, `get README for ${repo}`), "GITHUB_API_FAILED");
  }

  return readJson<GitHubContentFile>(response);
}

function decodeGitHubContent(file: GitHubContentFile | undefined): string | undefined {
  if (!file?.content || file.encoding !== "base64") return undefined;
  return Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8");
}

export async function upsertGitHubReadme(options: {
  repo: string;
  token: string;
  branch: string;
  content: string;
  message?: string;
  apiBaseUrl?: string;
}): Promise<boolean> {
  parseGitHubRepo(options.repo);
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const existing = await getGitHubReadme(options.repo, options.token, options.branch, apiBaseUrl);
  if (decodeGitHubContent(existing) === options.content) return false;

  await githubRequest(`${apiBaseUrl}/repos/${options.repo}/contents/README.md`, {
    method: "PUT",
    token: options.token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: options.message ?? "Update SkillPack README",
      content: Buffer.from(options.content, "utf8").toString("base64"),
      branch: options.branch,
      ...(existing?.sha ? { sha: existing.sha } : {}),
    }),
    context: `update README for ${options.repo}`,
  });
  return true;
}

async function getReleaseByTag(apiBaseUrl: string, repo: string, tag: string, token: string): Promise<GitHubRelease | undefined> {
  const response = await fetch(`${apiBaseUrl}/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await readJson<GitHubErrorPayload>(response);
      if (payload?.message) {
        message = `${message}: ${payload.message}`;
      }
    } catch {
      // Keep the HTTP status message when the response body is not JSON.
    }
    throw new SkillPackError(`GitHub API request failed: ${message}`, "GITHUB_API_FAILED");
  }
  return readJson<GitHubRelease>(response);
}

async function createRelease(options: {
  apiBaseUrl: string;
  repo: string;
  tag: string;
  targetCommitish: string;
  releaseName: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  token: string;
}): Promise<GitHubRelease> {
  return githubRequest<GitHubRelease>(`${options.apiBaseUrl}/repos/${options.repo}/releases`, {
    method: "POST",
    token: options.token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: options.tag,
      target_commitish: options.targetCommitish,
      name: options.releaseName,
      body: options.body,
      draft: options.draft,
      prerelease: options.prerelease,
    }),
    context: `create release ${options.tag}`,
  });
}

async function listReleaseAssets(apiBaseUrl: string, repo: string, releaseId: number, token: string): Promise<GitHubAsset[]> {
  return githubRequest<GitHubAsset[]>(`${apiBaseUrl}/repos/${repo}/releases/${releaseId}/assets`, {
    method: "GET",
    token,
  });
}

async function deleteReleaseAsset(apiBaseUrl: string, repo: string, assetId: number, token: string): Promise<void> {
  await githubRequest<void>(`${apiBaseUrl}/repos/${repo}/releases/assets/${assetId}`, {
    method: "DELETE",
    token,
  });
}

function buildUploadUrl(uploadUrl: string, artifactName: string): string {
  const base = uploadUrl.split("{")[0];
  return `${base}?name=${encodeURIComponent(artifactName)}`;
}

async function uploadReleaseAsset(uploadUrl: string, artifactPath: string, token: string): Promise<GitHubAsset> {
  const artifactName = path.basename(artifactPath);
  const body = await fs.readFile(artifactPath);
  return githubRequest<GitHubAsset>(buildUploadUrl(uploadUrl, artifactName), {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.length),
    },
    body,
  });
}


export async function getGitHubReleaseByTag(
  repo: string,
  tag: string,
  token?: string,
  apiBaseUrl = DEFAULT_API_BASE_URL,
): Promise<{ id: number; html_url: string; upload_url: string } | undefined> {
  parseGitHubRepo(repo);
  const authToken = resolveToken(token);
  if (!authToken) {
    const response = await fetch(`${apiBaseUrl}/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (response.status === 404) return undefined;
    if (!response.ok) {
      let payload: GitHubErrorPayload | undefined;
      try {
        payload = await readJson<GitHubErrorPayload>(response);
      } catch {
        // ignore
      }
      throw new SkillPackError(formatGitHubApiError(response.status, response.statusText, payload, `get release ${tag}`), "GITHUB_API_FAILED");
    }
    return readJson<GitHubRelease>(response);
  }
  return getReleaseByTag(apiBaseUrl, repo, tag, authToken);
}

export async function publishToGitHub(options: GitHubPublisherOptions): Promise<GitHubPublishResult> {
  parseGitHubRepo(options.repo);
  const artifactName = path.basename(options.artifactPath);
  const token = resolveToken(options.token);
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;

  if (options.dryRun) {
    return {
      repo: options.repo,
      tag: options.tag,
      releaseUrl: `https://github.com/${options.repo}/releases/tag/${encodeURIComponent(options.tag)}`,
      artifactName,
      dryRun: true,
    };
  }

  if (!token) {
    throw new SkillPackError("GitHub publishing requires GITHUB_TOKEN, GH_TOKEN, or --token.", "GITHUB_TOKEN_MISSING");
  }

  const ensured = await ensureGitHubRepository(options.repo, token, options.ensureRepo ?? {});
  if (ensured.created) {
    options.onRepoCreated?.(ensured.repository);
  }

  const initialized = await ensureRepositoryInitialized(options.repo, token, apiBaseUrl);
  if (initialized) {
    options.onRepoInitialized?.();
  }

  const repoMeta = (await getGitHubRepository(options.repo, token, apiBaseUrl)) ?? ensured.repository;
  const targetCommitish = repoMeta.default_branch ?? "main";

  if (options.readmeContent) {
    const updated = await upsertGitHubReadme({
      repo: options.repo,
      token,
      branch: targetCommitish,
      content: options.readmeContent,
      message: options.readmeCommitMessage,
      apiBaseUrl,
    });
    if (updated) {
      options.onReadmeUpdated?.();
    }
  }

  let release = await getReleaseByTag(apiBaseUrl, options.repo, options.tag, token);
  if (!release) {
    release = await createRelease({
      apiBaseUrl,
      repo: options.repo,
      tag: options.tag,
      targetCommitish,
      releaseName: options.releaseName ?? options.tag,
      body: options.body ?? "Published with SkillPack CLI.",
      draft: options.draft ?? false,
      prerelease: options.prerelease ?? false,
      token,
    });
  }

  const existingAssets = await listReleaseAssets(apiBaseUrl, options.repo, release.id, token);
  const existingAsset = existingAssets.find((asset) => asset.name === artifactName);
  if (existingAsset) {
    if (!options.overwrite) {
      throw new SkillPackError(
        `Release asset ${artifactName} already exists. Re-run with --overwrite to replace it.`,
        "GITHUB_ASSET_EXISTS",
      );
    }
    await deleteReleaseAsset(apiBaseUrl, options.repo, existingAsset.id, token);
  }

  const asset = await uploadReleaseAsset(release.upload_url, options.artifactPath, token);

  return {
    repo: options.repo,
    tag: options.tag,
    releaseUrl: release.html_url,
    assetUrl: asset.browser_download_url,
    artifactName,
    dryRun: false,
  };
}
