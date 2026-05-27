import chalk from "chalk";
import { Command } from "commander";
import { scanSkills } from "../core/scanner.js";
import { t } from "../utils/i18n.js";
import { isInteractive, promptScanLocations } from "../utils/prompts.js";

export function scanCommand(): Command {
  return new Command("scan")
    .description(t("command.scan.description"))
    .argument("[path]", t("command.scan.path.argument"))
    .option("-a, --agents", t("command.scan.agents.option"))
    .action(async (scanPath: string | undefined, options: { agents?: boolean }) => {
      const locations = scanPath && !options.agents ? [scanPath] : isInteractive() ? await promptScanLocations(scanPath) : [scanPath ?? process.cwd()];
      let total = 0;
      for (const location of locations) {
        const results = await scanSkills(location);
        console.log(chalk.bold(`\n${location}`));
        if (results.length === 0) {
          console.log(chalk.yellow(t("scan.none")));
          continue;
        }
        total += results.length;
        for (const result of results) {
          console.log(`${chalk.green("✓")} ${chalk.bold(result.name)} ${chalk.dim(result.path)}`);
          if (result.description) console.log(`  ${chalk.dim(result.description)}`);
        }
      }
      console.log(chalk.bold(`\n${t("scan.total", { count: total })}`));
    });
}
