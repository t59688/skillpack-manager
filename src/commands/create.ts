import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { saveManifest } from "../core/manifest.js";
import { SkillPackManifest } from "../types/schema.js";
import { promptOptionalText, promptText, promptVisibility } from "../utils/prompts.js";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createCommand(): Command {
  return new Command("create")
    .description("create a new skill pack")
    .argument("[name]", "pack slug, for example sales-pack; omit for an interactive wizard")
    .option("-d, --description <description>", "pack description")
    .option("-o, --owner <owner>", "owner namespace")
    .option("--dir <dir>", "output directory")
    .option("--visibility <visibility>", "private, unlisted, public, or team")
    .action(async (nameArg: string | undefined, options: { description?: string; owner?: string; dir?: string; visibility?: SkillPackManifest["visibility"] }) => {
      const name = nameArg ?? slugify(await promptText("Pack name", "my-agent-stack"));
      const displayName = name
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      const description = options.description ?? (await promptText("Description", "A reusable AI agent skill pack."));
      const owner = options.owner ?? (await promptOptionalText("Owner namespace, optional", undefined));
      const visibility = options.visibility ?? (await promptVisibility("private"));
      const packDir = path.resolve(options.dir ?? name);
      if (await fs.pathExists(packDir)) throw new Error(`Directory already exists: ${packDir}`);
      await fs.ensureDir(path.join(packDir, "skills"));
      await fs.ensureDir(path.join(packDir, "shared", "references"));
      await fs.ensureDir(path.join(packDir, "shared", "assets"));
      const manifest: SkillPackManifest = {
        schema: "https://skillpack.dev/schemas/skillpack.v1.json",
        name,
        displayName,
        version: "0.1.0",
        description,
        owner,
        visibility,
        tags: [],
        skills: [],
        shared: { references: [], assets: [] },
        targets: [],
      };
      await saveManifest(packDir, manifest);
      console.log(chalk.green(`Created skill pack at ${packDir}`));
      console.log(chalk.dim(`Next: skillpack add ${packDir} <skill-dir>`));
    });
}
