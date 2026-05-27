import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { TARGETS, targetNames, resolveTargetDir } from "../adapters/targets.js";
import { resolveGitHubTokenFromEnv } from "../core/github-auth.js";
import { installedDbPath, loadInstalledDb, skillpackHome } from "../core/registry.js";
import { defaultWorkspaceRoot, loadState, statePath } from "../core/state.js";
import { t } from "../utils/i18n.js";

function statusIcon(ok: boolean): string {
  return ok ? chalk.green("OK") : chalk.yellow("--");
}

function formatConfigured(value: boolean): string {
  return value ? chalk.green(t("doctor.configured")) : chalk.dim(t("doctor.notSet"));
}

export function doctorCommand(): Command {
  return new Command("doctor").description(t("command.doctor.description")).action(async () => {
    const home = skillpackHome();
    const stateFile = statePath();
    const installedFile = installedDbPath();
    const workspaceRoot = defaultWorkspaceRoot();
    const [homeExists, stateExists, installedExists, workspaceRootExists, state, installed] = await Promise.all([
      fs.pathExists(home),
      fs.pathExists(stateFile),
      fs.pathExists(installedFile),
      fs.pathExists(workspaceRoot),
      loadState(),
      loadInstalledDb(),
    ]);

    console.log(chalk.bold(t("doctor.title")));
    console.log(`Node.js: ${process.version}`);
    console.log(t("doctor.home", { path: home, status: statusIcon(homeExists) }));
    console.log(t("doctor.state", { path: stateFile, status: statusIcon(stateExists), count: state.workspaces.length }));
    console.log(t("doctor.installedDb", { path: installedFile, status: statusIcon(installedExists), count: installed.length }));
    console.log(t("doctor.workspaceRoot", { path: workspaceRoot, status: statusIcon(workspaceRootExists) }));
    console.log(t("doctor.githubToken", { status: formatConfigured(Boolean(resolveGitHubTokenFromEnv())) }));

    console.log(chalk.bold(`\n${t("doctor.agentDirs")}`));
    for (const target of targetNames()) {
      const dir = resolveTargetDir(target);
      const exists = await fs.pathExists(dir);
      console.log(`${statusIcon(exists)} ${TARGETS[target].displayName}: ${dir}`);
    }
  });
}
