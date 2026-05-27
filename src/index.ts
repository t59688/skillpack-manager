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
import { syncCommand } from "./commands/sync.js";
import { removeCommand, uninstallCommand } from "./commands/uninstall.js";
import { updateCommand } from "./commands/update.js";
import { upgradeCommand } from "./commands/upgrade.js";
import { workspaceCommand } from "./commands/workspace.js";
import { isInteractive } from "./utils/prompts.js";

type ProgramOptions = {
  homeMenu: boolean;
};

type HomeAction =
  | "install"
  | "sync"
  | "update"
  | "create"
  | "publish"
  | "pull"
  | "open"
  | "workspace"
  | "scan"
  | "doctor"
  | "upgrade";

async function promptHomeAction(): Promise<HomeAction> {
  return select({
    message: "What do you want to do?",
    choices: [
      { name: "1. Install a skill pack", value: "install" as const },
      { name: "2. Sync installed packs", value: "sync" as const },
      { name: "3. Update installed packs", value: "update" as const },
      { name: "4. Create a new skill pack", value: "create" as const },
      { name: "5. Publish a pack", value: "publish" as const },
      { name: "6. Pull a pack for editing", value: "pull" as const },
      { name: "7. Open a workspace", value: "open" as const },
      { name: "8. Upgrade a published pack", value: "upgrade" as const },
      { name: "9. Manage my workspaces", value: "workspace" as const },
      { name: "10. Scan installed skills", value: "scan" as const },
      { name: "11. Check environment", value: "doctor" as const },
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
  program.addCommand(syncCommand());
  program.addCommand(updateCommand());
  program.addCommand(listCommand());
  program.addCommand(uninstallCommand());
  program.addCommand(removeCommand());
  program.addCommand(statusCommand());
  program.addCommand(workspaceCommand());
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
      const args = action === "workspace" ? ["workspace", "list"] : [action];
      await buildProgram({ homeMenu: false }).parseAsync([...process.argv.slice(0, 2), ...args]);
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
