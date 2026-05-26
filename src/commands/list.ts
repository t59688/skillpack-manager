import chalk from "chalk";
import { Command } from "commander";
import { loadInstalledDb } from "../core/registry.js";

export function listCommand(): Command {
  return new Command("list").description("list installed skill packs").action(async () => {
    const items = await loadInstalledDb();
    if (items.length === 0) {
      console.log(chalk.yellow("No installed packs recorded."));
      return;
    }
    for (const item of items) {
      console.log(`${chalk.bold(`${item.pack}@${item.version}`)} ${chalk.dim(`target=${item.target}`)}`);
      for (const skill of item.skills) console.log(`  - ${skill.name}`);
    }
  });
}
