import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateReleaseNotes } from "../src/core/release-notes.js";

async function writeSkill(packDir: string, name: string, body: string): Promise<void> {
  const skillDir = path.join(packDir, "skills", name);
  await fs.ensureDir(skillDir);
  await fs.writeFile(path.join(skillDir, "SKILL.md"), body, "utf8");
}

async function writePack(
  packDir: string,
  options: {
    version: string;
    skills: string[];
    references?: string[];
    assets?: string[];
    tags?: string[];
  },
): Promise<void> {
  await fs.ensureDir(packDir);
  await fs.writeFile(
    path.join(packDir, "skillpack.yaml"),
    [
      "name: sales-pack",
      "owner: tf",
      `version: ${options.version}`,
      "description: Sales workflow skills.",
      ...(options.tags?.length ? ["tags:", ...options.tags.map((tag) => `  - ${tag}`)] : ["tags: []"]),
      "skills:",
      ...options.skills.flatMap((skill) => [`  - name: ${skill}`, `    path: skills/${skill}`]),
      "shared:",
      ...(options.references?.length
        ? ["  references:", ...options.references.map((reference) => `    - shared/references/${reference}`)]
        : ["  references: []"]),
      ...(options.assets?.length ? ["  assets:", ...options.assets.map((asset) => `    - shared/assets/${asset}`)] : ["  assets: []"]),
      "targets: []",
      "",
    ].join("\n"),
    "utf8",
  );
}

describe("release notes generation", () => {
  let tempDir: string;
  let previousPack: string;
  let currentPack: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "skillpack-release-notes-"));
    previousPack = path.join(tempDir, "previous");
    currentPack = path.join(tempDir, "current");
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("summarizes user-facing skill and shared file changes", async () => {
    await writePack(previousPack, {
      version: "0.1.0",
      skills: ["old-crm-note-cleaner", "quote-checker"],
      references: ["pricing-policy.md", "old-policy.md"],
      assets: ["template.json"],
    });
    await writeSkill(previousPack, "old-crm-note-cleaner", "# Old CRM Note Cleaner\n");
    await writeSkill(previousPack, "quote-checker", "# Quote Checker\nold\n");
    await fs.outputFile(path.join(previousPack, "shared", "references", "pricing-policy.md"), "old pricing\n", "utf8");
    await fs.outputFile(path.join(previousPack, "shared", "references", "old-policy.md"), "old policy\n", "utf8");
    await fs.outputFile(path.join(previousPack, "shared", "assets", "template.json"), "{\"version\":1}\n", "utf8");

    await writePack(currentPack, {
      version: "0.1.0",
      skills: ["proposal-writer", "quote-checker"],
      references: ["pricing-policy.md", "new-policy.md"],
      assets: ["template.json", "deck.png"],
    });
    await writeSkill(currentPack, "proposal-writer", "# Proposal Writer\n");
    await writeSkill(currentPack, "quote-checker", "# Quote Checker\nnew\n");
    await fs.outputFile(path.join(currentPack, "shared", "references", "pricing-policy.md"), "new pricing\n", "utf8");
    await fs.outputFile(path.join(currentPack, "shared", "references", "new-policy.md"), "new policy\n", "utf8");
    await fs.outputFile(path.join(currentPack, "shared", "assets", "template.json"), "{\"version\":1}\n", "utf8");
    await fs.outputFile(path.join(currentPack, "shared", "assets", "deck.png"), "fake image bytes\n", "utf8");

    const notes = await generateReleaseNotes(previousPack, currentPack);

    expect(notes.hasChanges).toBe(true);
    expect(notes.changes).toEqual(
      expect.arrayContaining([
        { kind: "added", area: "skill", label: "proposal-writer" },
        { kind: "updated", area: "skill", label: "quote-checker" },
        { kind: "removed", area: "skill", label: "old-crm-note-cleaner" },
        { kind: "added", area: "shared-reference", label: "new-policy.md" },
        { kind: "updated", area: "shared-reference", label: "pricing-policy.md" },
        { kind: "removed", area: "shared-reference", label: "old-policy.md" },
        { kind: "added", area: "shared-asset", label: "deck.png" },
      ]),
    );
    expect(notes.body).toContain("- `+` Added skill: `proposal-writer`");
    expect(notes.body).toContain("- `~` Updated skill: `quote-checker`");
    expect(notes.body).toContain("- `-` Removed skill: `old-crm-note-cleaner`");
    expect(notes.body).toContain("- `~` Updated shared reference: `pricing-policy.md`");
    expect(notes.body).toContain("- `+` Added shared asset: `deck.png`");
    expect(notes.body).not.toContain("template.json");
  });

  it("ignores version-only changes", async () => {
    await writePack(previousPack, { version: "0.1.0", skills: ["quote-checker"] });
    await writePack(currentPack, { version: "0.2.0", skills: ["quote-checker"] });
    await writeSkill(previousPack, "quote-checker", "# Quote Checker\n");
    await writeSkill(currentPack, "quote-checker", "# Quote Checker\n");

    const notes = await generateReleaseNotes(previousPack, currentPack);

    expect(notes.hasChanges).toBe(false);
    expect(notes.body).toContain("No user-facing skill pack changes detected.");
    expect(notes.body).toContain("Previous pack version: `0.1.0`");
  });

  it("reports meaningful pack metadata updates", async () => {
    await writePack(previousPack, { version: "0.1.0", skills: ["quote-checker"], tags: ["sales"] });
    await writePack(currentPack, { version: "0.1.0", skills: ["quote-checker"], tags: ["sales", "crm"] });
    await writeSkill(previousPack, "quote-checker", "# Quote Checker\n");
    await writeSkill(currentPack, "quote-checker", "# Quote Checker\n");

    const notes = await generateReleaseNotes(previousPack, currentPack);

    expect(notes.changes).toContainEqual({ kind: "updated", area: "metadata", label: "tags" });
    expect(notes.body).toContain("- `~` Updated pack metadata: tags");
  });
});
