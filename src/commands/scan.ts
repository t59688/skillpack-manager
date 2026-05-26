import chalk from "chalk";
import { Command } from "commander";
import { scanSkills } from "../core/scanner.js";
import { isInteractive, promptScanLocations } from "../utils/prompts.js";

export function scanCommand(): Command {
  return new Command("scan")
    .description("scan one or more directories for skills")
    .argument("[path]", "directory to scan; omit for an interactive agent-directory picker")
    .option("-a, --agents", "scan common agent skill directories")
    .action(async (scanPath: string | undefined, options: { agents?: boolean }) => {
      const locations = scanPath && !options.agents ? [scanPath] : isInteractive() ? await promptScanLocations(scanPath) : [scanPath ?? process.cwd()];
      let total = 0;
      for (const location of locations) {
        const results = await scanSkills(location);
        console.log(chalk.bold(`\n${location}`));
        if (results.length === 0) {
          console.log(chalk.yellow("No skills found."));
          continue;
        }
        total += results.length;
        for (const result of results) {
          console.log(`${chalk.green("✓")} ${chalk.bold(result.name)} ${chalk.dim(result.path)}`);
          if (result.description) console.log(`  ${chalk.dim(result.description)}`);
        }
      }
      console.log(chalk.bold(`\nFound ${total} skill${total === 1 ? "" : "s"} total.`));
    });
}
