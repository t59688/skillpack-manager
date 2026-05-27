import chalk from "chalk";
import { checkbox } from "@inquirer/prompts";
import { Command } from "commander";
import { TARGETS } from "../adapters/targets.js";
import { planUninstall, uninstallPack, UninstallPlan } from "../core/installer.js";
import { loadInstalledDb } from "../core/registry.js";
import { TargetName, TargetSchema } from "../types/schema.js";
import { isInteractive, promptConfirm, promptText } from "../utils/prompts.js";

type UninstallOptions = {
  target?: string;
  force?: boolean;
};

function printPlan(plans: UninstallPlan[]): void {
  for (const plan of plans) {
    const targetName = TARGETS[plan.item.target].displayName;
    const existingSkills = plan.skills.filter((skill) => skill.exists);
    const modifiedSkills = plan.skills.filter((skill) => skill.modified);
    console.log("");
    console.log(`This will remove ${existingSkills.length} skill${existingSkills.length === 1 ? "" : "s"} installed by ${chalk.bold(plan.item.pack)} from ${targetName}.`);
    console.log("");
    for (const skill of existingSkills) console.log(`- ${skill.name}`);
    if (modifiedSkills.length > 0) {
      console.log("");
      console.log(chalk.yellow("Skills modified after install:"));
      for (const skill of modifiedSkills) console.log(`${chalk.yellow("!")} ${skill.name}`);
    }
  }
}

async function confirmAndUninstall(pack: string, target: TargetName | undefined, options: UninstallOptions): Promise<number> {
  const plans = await planUninstall(pack, target);
  if (plans.length === 0) {
    console.log(chalk.yellow("No matching installed pack found."));
    return 0;
  }

  printPlan(plans);
  const hasModified = plans.some((plan) => plan.skills.some((skill) => skill.modified));
  let force = Boolean(options.force);

  if (hasModified && !force) {
    force = isInteractive() ? await promptConfirm("Remove modified skills too?", false) : false;
    if (!force) {
      console.log(chalk.yellow("Cancelled."));
      return 0;
    }
  } else if (!force) {
    const shouldRemove = isInteractive() ? await promptConfirm("Remove these skills?", false) : true;
    if (!shouldRemove) {
      console.log(chalk.yellow("Cancelled."));
      return 0;
    }
  }

  return (await uninstallPack(pack, target, { force })).length;
}

export function uninstallCommand(name = "uninstall"): Command {
  return new Command(name)
    .description("uninstall a previously installed skill pack")
    .argument("[pack]", "pack id, for example tiechui/sales-pack or sales-pack; omit to choose installed packs")
    .option("-t, --target <target>", "limit uninstall to a target")
    .option("--force", "remove skills even if they were modified after install")
    .action(async (packArg: string | undefined, options: UninstallOptions) => {
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
          choices: installed.map((item) => ({ name: `${item.pack}@${item.version} on ${TARGETS[item.target].displayName}`, value: `${item.pack}::${item.target}` })),
        });
        let total = 0;
        for (const value of selected) {
          const [selectedPack, selectedTarget] = value.split("::") as [string, string];
          total += await confirmAndUninstall(selectedPack, TargetSchema.parse(selectedTarget), options);
        }
        if (total > 0) console.log(chalk.green(`Uninstalled ${total} installation record(s).`));
        return;
      }

      pack = pack ?? (await promptText("Pack id to uninstall"));
      const target: TargetName | undefined = options.target ? TargetSchema.parse(options.target) : undefined;
      const total = await confirmAndUninstall(pack, target, options);
      if (total > 0) console.log(chalk.green(`Uninstalled ${total} installation record(s).`));
    });
}

export function removeCommand(): Command {
  return uninstallCommand("remove").alias("rm");
}
