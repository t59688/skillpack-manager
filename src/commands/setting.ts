import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { Command } from "commander";
import { resolveGitHubTokenFromEnv, setSavedGitHubToken } from "../core/github-auth.js";
import { loadGitHubToken, saveGitHubToken } from "../core/state.js";
import { getLanguage, languageLabel, normalizeLanguage, saveLanguage, t } from "../utils/i18n.js";
import { isInteractive, promptSecret } from "../utils/prompts.js";

type SettingAction = "language" | "githubToken" | "show";

type SettingOptions = {
  language?: string;
  githubToken?: string;
  clearGithubToken?: boolean;
  show?: boolean;
};

function formatLanguage(): string {
  const language = getLanguage();
  return `${language} (${languageLabel(language)})`;
}

function formatTokenStatus(token: string | undefined): string {
  return token ? chalk.green(t("doctor.configured")) : chalk.dim(t("doctor.notSet"));
}

async function printCurrentSettings(): Promise<void> {
  console.log(t("language.current", { language: formatLanguage() }));
  console.log(t("setting.githubToken.current", { status: formatTokenStatus(await loadGitHubToken()) }));
}

async function saveToken(token: string | undefined): Promise<void> {
  await saveGitHubToken(token);
  setSavedGitHubToken(token);
}

async function configureLanguage(value?: string): Promise<void> {
  let nextLanguage = value;
  if (!nextLanguage) {
    if (!isInteractive()) {
      console.log(t("language.current", { language: formatLanguage() }));
      return;
    }
    nextLanguage = await select({
      message: t("setting.language.prompt"),
      default: getLanguage(),
      choices: [
        { name: languageLabel("zh-CN"), value: "zh-CN" as const },
        { name: languageLabel("en"), value: "en" as const },
      ],
    });
  }

  const language = normalizeLanguage(nextLanguage);
  await saveLanguage(language);
  console.log(chalk.green(t("language.updated", { language: `${language} (${languageLabel(language)})` })));
}

async function configureGitHubToken(value?: string, clear = false): Promise<void> {
  if (clear) {
    await saveToken(undefined);
    console.log(chalk.green(t("setting.githubToken.cleared")));
    return;
  }

  const token = value ?? (isInteractive() ? await promptSecret(t("setting.githubToken.prompt")) : undefined);
  if (!token) {
    console.log(t("setting.githubToken.current", { status: formatTokenStatus(resolveGitHubTokenFromEnv()) }));
    return;
  }

  await saveToken(token);
  console.log(chalk.green(t("setting.githubToken.updated")));
}

async function promptSettingAction(): Promise<SettingAction> {
  return select({
    message: t("setting.prompt"),
    choices: [
      { name: t("setting.choice.language"), value: "language" as const },
      { name: t("setting.choice.githubToken"), value: "githubToken" as const },
      { name: t("setting.choice.show"), value: "show" as const },
    ],
  });
}

export function settingCommand(): Command {
  return new Command("setting")
    .alias("settings")
    .description(t("setting.command.description"))
    .argument("[language]", t("setting.language.argument"))
    .option("--language <language>", t("setting.language.option"))
    .option("--github-token <token>", t("setting.githubToken.option"))
    .option("--clear-github-token", t("setting.githubToken.clear.option"))
    .option("--show", t("setting.show.option"))
    .action(async (languageArg: string | undefined, options: SettingOptions) => {
      if (options.show) {
        await printCurrentSettings();
        return;
      }

      if (options.clearGithubToken || options.githubToken) {
        await configureGitHubToken(options.githubToken, options.clearGithubToken);
        return;
      }

      const language = options.language ?? languageArg;
      if (language) {
        await configureLanguage(language);
        return;
      }

      if (!isInteractive()) {
        await printCurrentSettings();
        return;
      }

      const action = await promptSettingAction();
      if (action === "language") await configureLanguage();
      else if (action === "githubToken") await configureGitHubToken();
      else await printCurrentSettings();
    });
}
