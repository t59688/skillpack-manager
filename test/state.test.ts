import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("workspace state", () => {
  let homeDir: string;

  beforeEach(async () => {
    homeDir = await mkdtemp(path.join(os.tmpdir(), "skillpack-state-"));
    vi.spyOn(os, "homedir").mockReturnValue(homeDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(homeDir);
  });

  it("updates a workspace local path in persisted state", async () => {
    const { loadState, updateWorkspaceLocalPath, upsertWorkspace } = await import("../src/core/state.js");
    const originalPath = path.join(homeDir, "workspaces", "tf", "sales-pack");
    const movedPath = path.join(homeDir, "projects", "sales-pack");

    await upsertWorkspace({
      manifest: { owner: "tf", name: "sales-pack" },
      localPath: originalPath,
      provider: { type: "github", repo: "t59688/sales-pack" },
      lastVersion: "0.1.0",
    });

    const updated = await updateWorkspaceLocalPath("tf/sales-pack", movedPath);
    const state = await loadState();

    expect(updated.localPath).toBe(path.resolve(movedPath));
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].localPath).toBe(path.resolve(movedPath));
    expect(state.workspaces[0].provider).toEqual({ type: "github", repo: "t59688/sales-pack" });
  });
});
