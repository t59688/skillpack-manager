#!/usr/bin/env node
import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
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
import { settingCommand } from "./commands/setting.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { removeCommand, uninstallCommand } from "./commands/uninstall.js";
import { updateCommand } from "./commands/update.js";
import { upgradeCommand } from "./commands/upgrade.js";
import { workspaceCommand } from "./commands/workspace.js";
import { initializeSavedGitHubToken } from "./core/github-auth.js";
import { Language } from "./core/state.js";
import { getLanguage, initializeLanguage, languageLabel, normalizeLanguage, saveLanguage, t } from "./utils/i18n.js";
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
  | "setting"
  | "upgrade";

async function promptHomeAction(): Promise<HomeAction> {
  return select({
    message: t("home.prompt"),
    choices: [
      { name: t("home.install"), value: "install" as const },
      { name: t("home.sync"), value: "sync" as const },
      { name: t("home.update"), value: "update" as const },
      { name: t("home.create"), value: "create" as const },
      { name: t("home.publish"), value: "publish" as const },
      { name: t("home.pull"), value: "pull" as const },
      { name: t("home.open"), value: "open" as const },
      { name: t("home.upgrade"), value: "upgrade" as const },
      { name: t("home.workspace"), value: "workspace" as const },
      { name: t("home.scan"), value: "scan" as const },
      { name: t("home.doctor"), value: "doctor" as const },
      { name: t("home.setting"), value: "setting" as const },
    ],
  });
}

function buildProgram(options: ProgramOptions): Command {
  const program = new Command();

  program
    .name("skillpack")
    .description(t("app.description"))
    .version(packageJson.version);

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
  program.addCommand(settingCommand());

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

function languageCommand(): Command {
  return new Command("language")
    .alias("lang")
    .description(t("language.command.description"))
    .argument("[language]", t("language.argument"))
    .option("--set <language>", t("language.option.set"))
    .action(async (languageArg: string | undefined, options: { set?: string }) => {
      const nextLanguage = options.set ?? languageArg;
      if (!nextLanguage) {
        const language = getLanguage();
        console.log(t("language.current", { language: `${language} (${languageLabel(language)})` }));
        return;
      }

      const language = normalizeLanguage(nextLanguage);
      await saveLanguage(language);
      console.log(chalk.green(t("language.updated", { language: `${language} (${languageLabel(language)})` })));
    });
}

async function promptInitialLanguage(): Promise<void> {
  const language = await select({
    message: "Choose interface language / 选择界面语言",
    default: "zh-CN" as Language,
    choices: [
      { name: "中文", value: "zh-CN" as const },
      { name: "english", value: "en" as const },
    ],
  });
  await saveLanguage(language);
}

function stripLanguageArgs(argv: string[]): string[] {
  const result = [...argv.slice(0, 2)];
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--lang") {
      index += 1;
      continue;
    }
    if (arg.startsWith("--lang=")) continue;
    result.push(arg);
  }
  return result;
}

function shouldPromptInitialLanguage(argv: string[], languageSource: Awaited<ReturnType<typeof initializeLanguage>>): boolean {
  if (languageSource !== "default" || !isInteractive()) return false;

  const args = stripLanguageArgs(argv).slice(2);
  if (args.some((arg) => arg === "--help" || arg === "-h" || arg === "--version" || arg === "-V")) return false;

  const command = args.find((arg) => !arg.startsWith("-"));
  return command !== "language" && command !== "lang";
}

async function main(): Promise<void> {
  const languageSource = await initializeLanguage(process.argv);
  await initializeSavedGitHubToken();
  if (shouldPromptInitialLanguage(process.argv, languageSource)) await promptInitialLanguage();

  const program = buildProgram({ homeMenu: true });

  program
    .option("--lang <language>", t("option.lang"))
    .addCommand(languageCommand());

  await program.parseAsync(stripLanguageArgs(process.argv));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(t("app.error", { message })));
  process.exitCode = 1;
});
