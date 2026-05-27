import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import { TARGETS, targetNames, resolveTargetDir } from "../adapters/targets.js";
import { installedDbPath, loadInstalledDb, skillpackHome } from "../core/registry.js";
import { defaultWorkspaceRoot, loadState, statePath } from "../core/state.js";

function statusIcon(ok: boolean): string {
  return ok ? chalk.green("OK") : chalk.yellow("--");
}

function formatConfigured(value: boolean): string {
  return value ? chalk.green("configured") : chalk.dim("not set");
}

export function doctorCommand(): Command {
  return new Command("doctor").description("check local SkillPack environment").action(async () => {
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

    console.log(chalk.bold("SkillPack environment"));
    console.log(`Node.js: ${process.version}`);
    console.log(`Home: ${home} ${statusIcon(homeExists)}`);
    console.log(`State: ${stateFile} ${statusIcon(stateExists)} (${state.workspaces.length} workspace${state.workspaces.length === 1 ? "" : "s"})`);
    console.log(`Installed DB: ${installedFile} ${statusIcon(installedExists)} (${installed.length} record${installed.length === 1 ? "" : "s"})`);
    console.log(`Workspace root: ${workspaceRoot} ${statusIcon(workspaceRootExists)}`);
    console.log(`GitHub token: ${formatConfigured(Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN))}`);

    console.log(chalk.bold("\nAgent skill directories"));
    for (const target of targetNames()) {
      const dir = resolveTargetDir(target);
      const exists = await fs.pathExists(dir);
      console.log(`${statusIcon(exists)} ${TARGETS[target].displayName}: ${dir}`);
    }
  });
}
