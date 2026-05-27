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
    const { setLanguage } = await import("../src/utils/i18n.js");
    const { setSavedGitHubToken } = await import("../src/core/github-auth.js");
    setLanguage("en");
    setSavedGitHubToken(undefined);
    vi.restoreAllMocks();
    await fs.remove(homeDir);
  });

  it("defaults to English language preference", async () => {
    const { loadLanguagePreference, loadState } = await import("../src/core/state.js");

    await expect(loadState()).resolves.toMatchObject({
      language: "en",
      workspaces: [],
    });
    await expect(loadLanguagePreference()).resolves.toBeUndefined();
  });

  it("persists the selected language in state", async () => {
    const { loadLanguagePreference, loadState } = await import("../src/core/state.js");
    const { getLanguage, loadSavedLanguage, saveLanguage, setLanguage } = await import("../src/utils/i18n.js");

    await saveLanguage("zh-CN");
    setLanguage("en");

    await expect(loadSavedLanguage()).resolves.toBe("zh-CN");
    expect(getLanguage()).toBe("zh-CN");
    expect((await loadState()).language).toBe("zh-CN");
    await expect(loadLanguagePreference()).resolves.toBe("zh-CN");
  });

  it("uses --lang as a temporary override without saving it", async () => {
    const { loadState } = await import("../src/core/state.js");
    const { getLanguage, initializeLanguage, saveLanguage } = await import("../src/utils/i18n.js");

    await saveLanguage("en");
    await initializeLanguage(["node", "skillpack", "--lang", "zh-CN", "doctor"]);

    expect(getLanguage()).toBe("zh-CN");
    expect((await loadState()).language).toBe("en");
  });

  it("reports where the language preference came from", async () => {
    const { initializeLanguage, saveLanguage } = await import("../src/utils/i18n.js");

    await expect(initializeLanguage(["node", "skillpack", "doctor"])).resolves.toBe("default");

    await saveLanguage("zh-CN");
    await expect(initializeLanguage(["node", "skillpack", "doctor"])).resolves.toBe("saved");
    await expect(initializeLanguage(["node", "skillpack", "--lang", "en", "doctor"])).resolves.toBe("cli");
  });

  it("loads a saved GitHub token into the shared token resolver", async () => {
    const { saveGitHubToken } = await import("../src/core/state.js");
    const { initializeSavedGitHubToken, resolveGitHubTokenFromEnv, setSavedGitHubToken } = await import("../src/core/github-auth.js");

    setSavedGitHubToken(undefined);
    await saveGitHubToken("saved-token");

    expect(resolveGitHubTokenFromEnv()).toBeUndefined();
    await initializeSavedGitHubToken();
    expect(resolveGitHubTokenFromEnv()).toBe("saved-token");
    expect(resolveGitHubTokenFromEnv("explicit-token")).toBe("explicit-token");
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
