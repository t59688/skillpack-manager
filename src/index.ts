#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { auditCommand } from "./commands/audit.js";
import { bumpCommand } from "./commands/bump.js";
import { createCommand } from "./commands/create.js";
import { diffCommand } from "./commands/diff.js";
import { downloadCommand } from "./commands/download.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { packCommand } from "./commands/pack.js";
import { publishCommand } from "./commands/publish.js";
import { pullCommand } from "./commands/pull.js";
import { scanCommand } from "./commands/scan.js";
import { statusCommand } from "./commands/status.js";
import { uninstallCommand } from "./commands/uninstall.js";

const program = new Command();

program
  .name("skillpack")
  .description("Package, share, install, audit, and sync AI agent skill packs.")
  .version("0.1.0");

program.addCommand(scanCommand());
program.addCommand(createCommand());
program.addCommand(bumpCommand());
program.addCommand(addCommand());
program.addCommand(packCommand());
program.addCommand(publishCommand());
program.addCommand(pullCommand());
program.addCommand(downloadCommand());
program.addCommand(installCommand());
program.addCommand(listCommand());
program.addCommand(uninstallCommand());
program.addCommand(statusCommand());
program.addCommand(diffCommand());
program.addCommand(auditCommand());

program.showHelpAfterError();

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exitCode = 1;
});
