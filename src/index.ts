#!/usr/bin/env node
import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { auditCommand } from "./commands/audit.js";
import { bumpCommand } from "./commands/bump.js";
import { createCommand } from "./commands/create.js";
import { diffCommand } from "./commands/diff.js";
import { doctorCommand } from "./commands/doctor.js";
import { downloadCommand } from "./commands/download.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { openCommand } from "./commands/open.js";
import { packCommand } from "./commands/pack.js";
import { publishCommand } from "./commands/publish.js";
import { pullCommand } from "./commands/pull.js";
import { scanCommand } from "./commands/scan.js";
import { statusCommand } from "./commands/status.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { upgradeCommand } from "./commands/upgrade.js";
import { isInteractive } from "./utils/prompts.js";

type ProgramOptions = {
  homeMenu: boolean;
};

type HomeAction = "install" | "create" | "publish" | "pull" | "open" | "status" | "scan" | "doctor" | "upgrade";

async function promptHomeAction(): Promise<HomeAction> {
  return select({
    message: "What do you want to do?",
    choices: [
      { name: "1. Install a skill pack", value: "install" as const },
      { name: "2. Create a new skill pack", value: "create" as const },
      { name: "3. Publish a pack", value: "publish" as const },
      { name: "4. Pull a pack for editing", value: "pull" as const },
      { name: "5. Open a workspace", value: "open" as const },
      { name: "6. Upgrade a published pack", value: "upgrade" as const },
      { name: "7. Manage my workspaces", value: "status" as const },
      { name: "8. Scan installed skills", value: "scan" as const },
      { name: "9. Check environment", value: "doctor" as const },
    ],
  });
}

function buildProgram(options: ProgramOptions): Command {
  const program = new Command();

  program
    .name("skillpack")
    .description("Package, share, install, audit, and sync AI agent skill packs.")
    .version("0.1.1");

  program.addCommand(scanCommand());
  program.addCommand(createCommand());
  program.addCommand(bumpCommand());
  program.addCommand(addCommand());
  program.addCommand(packCommand());
  program.addCommand(publishCommand());
  program.addCommand(upgradeCommand());
  program.addCommand(pullCommand());
  program.addCommand(openCommand());
  program.addCommand(downloadCommand());
  program.addCommand(installCommand());
  program.addCommand(listCommand());
  program.addCommand(uninstallCommand());
  program.addCommand(statusCommand());
  program.addCommand(diffCommand());
  program.addCommand(auditCommand());
  program.addCommand(doctorCommand());

  if (options.homeMenu) {
    program.action(async () => {
      if (!isInteractive()) {
        program.outputHelp();
        return;
      }

      const action = await promptHomeAction();
      await buildProgram({ homeMenu: false }).parseAsync([...process.argv.slice(0, 2), action]);
    });
  }

  program.showHelpAfterError();

  return program;
}

const program = buildProgram({ homeMenu: true });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exitCode = 1;
});
