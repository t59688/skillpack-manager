import chalk from "chalk";
import { Command } from "commander";
import { checkbox } from "@inquirer/prompts";
import { uninstallPack } from "../core/installer.js";
import { loadInstalledDb } from "../core/registry.js";
import { TargetName, TargetSchema } from "../types/schema.js";
import { promptText } from "../utils/prompts.js";

export function uninstallCommand(): Command {
  return new Command("uninstall")
    .description("uninstall a previously installed skill pack")
    .argument("[pack]", "pack id, for example tiechui/sales-pack or sales-pack; omit to choose installed packs")
    .option("-t, --target <target>", "limit uninstall to a target")
    .action(async (packArg: string | undefined, options: { target?: string }) => {
      let pack = packArg;
      if (!pack) {
        const installed = await loadInstalledDb();
        if (installed.length === 0) {
          console.log(chalk.yellow("No installed packs recorded."));
          return;
        }
        const selected = await checkbox({
          message: "Choose installed pack records to uninstall",
          required: true,
          choices: installed.map((item) => ({ name: `${item.pack}@${item.version} on ${item.target}`, value: `${item.pack}::${item.target}` })),
        });
        let total = 0;
        for (const value of selected) {
          const [selectedPack, selectedTarget] = value.split("::") as [string, string];
          total += (await uninstallPack(selectedPack, TargetSchema.parse(selectedTarget))).length;
        }
        console.log(chalk.green(`Uninstalled ${total} installation record(s).`));
        return;
      }
      pack = pack ?? (await promptText("Pack id to uninstall"));
      const target: TargetName | undefined = options.target ? TargetSchema.parse(options.target) : undefined;
      const removed = await uninstallPack(pack, target);
      if (removed.length === 0) {
        console.log(chalk.yellow("No matching installed pack found."));
        return;
      }
      console.log(chalk.green(`Uninstalled ${removed.length} installation record(s).`));
    });
}
