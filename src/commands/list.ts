import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { TARGETS } from "../adapters/targets.js";
import { loadInstalledDb } from "../core/registry.js";
import { InstalledPack } from "../types/schema.js";
import { t } from "../utils/i18n.js";

function groupKey(item: InstalledPack): string {
  return `${item.pack}\0${item.version}\0${item.source}`;
}

function targetDir(item: InstalledPack): string {
  return item.targetDir ?? (item.skills[0] ? path.dirname(item.skills[0].path) : TARGETS[item.target].displayName);
}

export function listCommand(): Command {
  return new Command("list").description(t("command.list.description")).action(async () => {
    const items = await loadInstalledDb();
    if (items.length === 0) {
      console.log(chalk.yellow(t("list.none")));
      return;
    }

    console.log(chalk.bold(t("list.title")));
    const groups = new Map<string, InstalledPack[]>();
    for (const item of items) groups.set(groupKey(item), [...(groups.get(groupKey(item)) ?? []), item]);

    for (const records of groups.values()) {
      const first = records[0];
      const skillNames = [...new Set(records.flatMap((record) => record.skills.map((skill) => skill.name)))];
      console.log("");
      console.log(chalk.bold(`${first.pack}@${first.version}`));
      console.log(t("list.source", { source: first.source }));
      console.log(t("list.targets"));
      for (const record of records) {
        console.log(`- ${record.target}: ${targetDir(record)}`);
      }
      console.log(t("list.installedSkills"));
      for (const skill of skillNames) console.log(`- ${skill}`);
    }
  });
}
