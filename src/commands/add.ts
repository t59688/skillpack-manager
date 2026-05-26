import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { loadManifest, saveManifest } from "../core/manifest.js";
import { scanSkills } from "../core/scanner.js";
import { copyDirSafe, sha256Directory } from "../utils/fs.js";
import { inferSkillNameFromDir, readSkillName } from "../utils/skill.js";
import { promptScanLocations, promptText } from "../utils/prompts.js";
import { checkbox } from "@inquirer/prompts";

async function addOneSkill(packDir: string, skillDir: string, overrideName?: string): Promise<string> {
  const manifest = await loadManifest(packDir);
  const skillMd = path.join(skillDir, "SKILL.md");
  if (!(await fs.pathExists(skillMd))) throw new Error(`Missing SKILL.md in ${skillDir}`);
  const name = overrideName ?? (await readSkillName(skillMd)) ?? inferSkillNameFromDir(skillDir);
  const destination = path.join(packDir, "skills", name);
  await copyDirSafe(skillDir, destination, false);
  manifest.skills = manifest.skills.filter((skill) => skill.name !== name);
  manifest.skills.push({
    name,
    path: `skills/${name}`,
    checksum: await sha256Directory(destination),
  });
  await saveManifest(packDir, manifest);
  return name;
}

export function addCommand(): Command {
  return new Command("add")
    .description("add one or more local skill directories to a skill pack")
    .argument("[packDir]", "skill pack directory; omit for prompt")
    .argument("[skillDir]", "skill directory containing SKILL.md; omit to choose from scanned skills")
    .option("--name <name>", "override skill name; only valid when adding one skill")
    .option("--copy", "copy the skill into the pack instead of referencing it", true)
    .action(async (packDirArg: string | undefined, skillDirArg: string | undefined, options: { name?: string; copy: boolean }) => {
      const packDir = packDirArg ?? (await promptText("Skill pack directory", process.cwd()));
      const skillDirs: string[] = [];

      if (skillDirArg) {
        skillDirs.push(skillDirArg);
      } else {
        const locations = await promptScanLocations();
        const found = (await Promise.all(locations.map((location) => scanSkills(location)))).flat();
        if (found.length === 0) throw new Error("No skills found in selected locations.");
        const selected = await checkbox({
          message: "Choose skills to add",
          required: true,
          choices: found.map((skill) => ({ name: `${skill.name} (${skill.path})`, value: skill.path })),
        });
        skillDirs.push(...selected);
      }

      if (options.name && skillDirs.length > 1) throw new Error("--name can only be used when adding one skill.");
      const added: string[] = [];
      for (const skillDir of skillDirs) added.push(await addOneSkill(packDir, skillDir, options.name));
      const manifest = await loadManifest(packDir);
      console.log(chalk.green(`Added ${added.join(", ")} to ${manifest.name}`));
    });
}
