import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { diffInstalledPack } from "../src/core/installed-diff.js";
import { syncInstalledPack } from "../src/core/sync.js";
import { loadInstalledDb } from "../src/core/registry.js";
import { InstalledPack } from "../src/types/schema.js";
import { sha256Directory } from "../src/utils/fs.js";

async function writeSkill(root: string, name: string, body: string): Promise<void> {
  const dir = path.join(root, name);
  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, "SKILL.md"), body);
}

async function writePack(root: string): Promise<void> {
  await fs.ensureDir(root);
  await fs.writeFile(
    path.join(root, "skillpack.yaml"),
    [
      "name: sales-pack",
      "owner: tf",
      "version: 0.2.0",
      "description: Sales pack.",
      "skills:",
      "  - name: company-style",
      "    path: skills/company-style",
      "    version: 0.2.0",
      "  - name: quote-checker",
      "    path: skills/quote-checker",
      "    version: 0.1.0",
      "  - name: meeting-notes",
      "    path: skills/meeting-notes",
      "    version: 0.1.0",
      "",
    ].join("\n"),
  );
  await writeSkill(path.join(root, "skills"), "company-style", "# Company Style v2\n");
  await writeSkill(path.join(root, "skills"), "quote-checker", "# Quote Checker\n");
  await writeSkill(path.join(root, "skills"), "meeting-notes", "# Meeting Notes\n");
}

describe("installed diff and sync", () => {
  let homeDir: string;
  let packDir: string;
  let targetDir: string;
  let record: InstalledPack;

  beforeEach(async () => {
    homeDir = await mkdtemp(path.join(os.tmpdir(), "skillpack-sync-home-"));
    vi.spyOn(os, "homedir").mockReturnValue(homeDir);
    packDir = path.join(homeDir, "pack");
    targetDir = path.join(homeDir, "target");
    await writePack(packDir);

    await writeSkill(targetDir, "company-style", "# Company Style v1\n");
    await writeSkill(targetDir, "meeting-notes", "# Meeting Notes local edits\n");
    await writeSkill(targetDir, "personal-helper", "# Personal Helper\n");

    record = {
      pack: "tf/sales-pack",
      version: "0.1.0",
      target: "local",
      targetDir,
      installedAt: "2026-01-01T00:00:00.000Z",
      source: "github:machinesdeproduction/sales-pack",
      skills: [
        {
          name: "company-style",
          path: path.join(targetDir, "company-style"),
          version: "0.1.0",
          checksum: await sha256Directory(path.join(targetDir, "company-style")),
        },
        {
          name: "quote-checker",
          path: path.join(targetDir, "quote-checker"),
          version: "0.1.0",
          checksum: "sha256:missing",
        },
        {
          name: "meeting-notes",
          path: path.join(targetDir, "meeting-notes"),
          version: "0.1.0",
          checksum: "sha256:original-before-user-edit",
        },
      ],
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(homeDir);
  });

  it("classifies missing, outdated, extra local, and modified installed skills", async () => {
    const diff = await diffInstalledPack(packDir, record);

    expect(diff.missing.map((skill) => skill.name)).toEqual(["quote-checker"]);
    expect(diff.outdated.map((skill) => `${skill.name} ${skill.installedVersion} -> ${skill.latestVersion}`)).toEqual([
      "company-style 0.1.0 -> 0.2.0",
    ]);
    expect(diff.extraLocal.map((skill) => skill.name)).toEqual(["personal-helper"]);
    expect(diff.modified.map((skill) => skill.name)).toEqual(["meeting-notes"]);
  });

  it("syncs missing and outdated skills while preserving extra local and modified skills by default", async () => {
    const result = await syncInstalledPack(packDir, "github:machinesdeproduction/sales-pack", record);
    const installed = await loadInstalledDb();

    expect(result.added.map((skill) => skill.name)).toEqual(["quote-checker"]);
    expect(result.updated.map((skill) => skill.name)).toEqual(["company-style"]);
    expect(result.skippedModified.map((skill) => skill.name)).toEqual(["meeting-notes"]);
    expect(await fs.readFile(path.join(targetDir, "company-style", "SKILL.md"), "utf8")).toBe("# Company Style v2\n");
    expect(await fs.readFile(path.join(targetDir, "quote-checker", "SKILL.md"), "utf8")).toBe("# Quote Checker\n");
    expect(await fs.readFile(path.join(targetDir, "meeting-notes", "SKILL.md"), "utf8")).toBe("# Meeting Notes local edits\n");
    expect(await fs.readFile(path.join(targetDir, "personal-helper", "SKILL.md"), "utf8")).toBe("# Personal Helper\n");
    expect(installed).toHaveLength(1);
    expect(installed[0].skills.find((skill) => skill.name === "company-style")?.version).toBe("0.2.0");
    expect(installed[0].skills.find((skill) => skill.name === "meeting-notes")?.version).toBe("0.1.0");
  });

  it("does not overwrite an unrecorded local skill with the same name by default", async () => {
    const conflictingPack = path.join(homeDir, "conflicting-pack");
    await fs.ensureDir(conflictingPack);
    await fs.writeFile(
      path.join(conflictingPack, "skillpack.yaml"),
      [
        "name: sales-pack",
        "owner: tf",
        "version: 0.2.0",
        "description: Sales pack.",
        "skills:",
        "  - name: personal-helper",
        "    path: skills/personal-helper",
        "    version: 0.1.0",
        "",
      ].join("\n"),
    );
    await writeSkill(path.join(conflictingPack, "skills"), "personal-helper", "# Remote Personal Helper\n");

    const diff = await diffInstalledPack(conflictingPack, { ...record, skills: [] });
    const result = await syncInstalledPack(conflictingPack, "github:machinesdeproduction/sales-pack", { ...record, skills: [] });
    const installed = await loadInstalledDb();

    expect(diff.modified.map((skill) => skill.name)).toEqual(["personal-helper"]);
    expect(result.skippedModified.map((skill) => skill.name)).toEqual(["personal-helper"]);
    expect(await fs.readFile(path.join(targetDir, "personal-helper", "SKILL.md"), "utf8")).toBe("# Personal Helper\n");
    expect(installed[0].skills.find((skill) => skill.name === "personal-helper")).toBeUndefined();
  });
});
