import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { summarizeWorkspace, WorkspaceStatusName } from "../src/core/workspace-status.js";
import { Workspace } from "../src/core/state.js";
import { getLatestGitHubReleaseSummary } from "../src/core/github-install.js";

vi.mock("../src/core/github-install.js", () => ({
  getLatestGitHubReleaseSummary: vi.fn(),
}));

const mockedLatestRelease = vi.mocked(getLatestGitHubReleaseSummary);

function workspace(localPath: string): Workspace {
  return {
    id: "tf/sales-pack",
    pack: "tf/sales-pack",
    owner: "tf",
    name: "sales-pack",
    localPath,
    provider: { type: "github", repo: "t59688/sales-pack" },
    lastVersion: "0.1.0",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function writeManifest(packDir: string, version: string): Promise<void> {
  await fs.ensureDir(packDir);
  await fs.writeFile(
    path.join(packDir, "skillpack.yaml"),
    [
      "name: sales-pack",
      "owner: tf",
      `version: ${version}`,
      "description: A sales pack.",
      "",
    ].join("\n"),
  );
}

describe("workspace status summaries", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "skillpack-status-"));
    mockedLatestRelease.mockReset();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it.each<[string, string, WorkspaceStatusName]>([
    ["0.1.0", "sales-pack-v0.1.0", "clean"],
    ["0.2.0", "sales-pack-v0.1.0", "unpublished changes"],
    ["0.1.0", "sales-pack-v0.2.0", "behind remote"],
  ])("marks local %s against remote %s as %s", async (localVersion, remoteTag, expectedStatus) => {
    await writeManifest(tempDir, localVersion);
    mockedLatestRelease.mockResolvedValue({
      repo: "t59688/sales-pack",
      tag: remoteTag,
      name: remoteTag,
      releaseUrl: `https://github.com/t59688/sales-pack/releases/tag/${remoteTag}`,
    });

    const result = await summarizeWorkspace(workspace(tempDir));

    expect(result.status).toBe(expectedStatus);
    expect(result.localVersion).toBe(localVersion);
    expect(result.remoteLatest).toBe(remoteTag.replace("sales-pack-v", ""));
  });

  it("marks missing workspace paths without loading a manifest", async () => {
    const result = await summarizeWorkspace(workspace(path.join(tempDir, "missing")));

    expect(result.status).toBe("missing");
    expect(result.exists).toBe(false);
    expect(result.localVersion).toBe("0.1.0");
    expect(mockedLatestRelease).not.toHaveBeenCalled();
  });
});
