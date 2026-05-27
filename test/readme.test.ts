import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillPackManifest } from "../src/types/schema.js";
import { README_SECTION_START, updateSkillPackReadme, upsertSkillPackReadmeSection } from "../src/core/readme.js";

describe("SkillPack README generation", () => {
  let tempDir: string;

  const manifest: SkillPackManifest = {
    schema: "https://skillpack.dev/schemas/skillpack.v1.json",
    name: "sales-pack",
    displayName: "Sales Pack",
    version: "0.2.0",
    description: "Reusable sales workflow skills.",
    visibility: "public",
    tags: [],
    skills: [
      { name: "quote-review", path: "skills/quote-review", version: "1.0.0" },
      { name: "customer-summary", path: "skills/customer-summary" },
    ],
    shared: { references: [], assets: [] },
    targets: [],
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "skillpack-readme-"));
    await fs.ensureDir(path.join(tempDir, "skills", "quote-review"));
    await fs.ensureDir(path.join(tempDir, "skills", "customer-summary"));
    await fs.writeFile(
      path.join(tempDir, "skills", "quote-review", "SKILL.md"),
      [
        "---",
        "name: quote-review",
        "description: Reviews sales quotes before they are sent to customers.",
        "---",
        "",
        "# Quote Review",
        "",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(path.join(tempDir, "skills", "customer-summary", "SKILL.md"), "# Customer Summary\n", "utf8");
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("creates a readable README with install instructions and a skills table", async () => {
    const result = await updateSkillPackReadme(tempDir, manifest, "tiechui/sales-pack");

    expect(result.changed).toBe(true);
    expect(result.installCommand).toBe("skillpack install github:tiechui/sales-pack");
    expect(result.content).toContain("# Sales Pack");
    expect(result.content).toContain("```sh\nskillpack install github:tiechui/sales-pack\n```");
    expect(result.content).toContain("| Pack | Version | Source |");
    expect(result.content).toContain("| `customer-summary` | - | `skills/customer-summary` | - |");
    expect(result.content).toContain(
      "| `quote-review` | Reviews sales quotes before they are sent to customers. | `skills/quote-review` | 1.0.0 |",
    );
  });

  it("replaces the managed section on later publishes", async () => {
    await fs.writeFile(
      path.join(tempDir, "README.md"),
      [
        "# Existing Pack",
        "",
        "Keep this introduction.",
        "",
        README_SECTION_START,
        "old content",
        "<!-- skillpack:readme:end -->",
        "",
        "Keep this footer.",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await updateSkillPackReadme(tempDir, manifest, "tiechui/new-sales-pack");

    expect(result.content).toContain("Keep this introduction.");
    expect(result.content).toContain("Keep this footer.");
    expect(result.content).toContain("skillpack install github:tiechui/new-sales-pack");
    expect(result.content).not.toContain("old content");
  });

  it("rejects incomplete managed markers", () => {
    expect(() => upsertSkillPackReadmeSection("hello\n<!-- skillpack:readme:start -->\n", manifest, "section")).toThrow(
      "incomplete SkillPack managed section",
    );
  });
});
