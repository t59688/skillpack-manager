import path from "node:path";
import fs from "fs-extra";
import { checkbox, confirm, input, password, select } from "@inquirer/prompts";
import { TARGETS, targetNames, resolveTargetDir } from "../adapters/targets.js";
import { TargetName, TargetSchema } from "../types/schema.js";

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && process.env.CI !== "true");
}

export function requireInteractive(message: string): void {
  if (!isInteractive()) throw new Error(`${message} Pass the required arguments/options when running non-interactively.`);
}

export async function promptText(message: string, defaultValue?: string): Promise<string> {
  requireInteractive(message);
  const value = await input({ message, default: defaultValue, required: true });
  return value.trim();
}

export async function promptOptionalText(message: string, defaultValue?: string): Promise<string | undefined> {
  requireInteractive(message);
  const value = await input({ message, default: defaultValue });
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  requireInteractive(message);
  return confirm({ message, default: defaultValue });
}

export async function promptVisibility(defaultValue: "private" | "unlisted" | "public" | "team" = "private"): Promise<"private" | "unlisted" | "public" | "team"> {
  requireInteractive("Choose visibility");
  return select({
    message: "Visibility",
    default: defaultValue,
    choices: [
      { name: "Private - only local/private sharing", value: "private" as const },
      { name: "Unlisted - accessible by direct link", value: "unlisted" as const },
      { name: "Public - discoverable", value: "public" as const },
      { name: "Team - visible to a team/org", value: "team" as const },
    ],
  });
}

export type TargetChoice = {
  target: TargetName;
  displayName: string;
  dir: string;
  exists: boolean;
};

export async function getTargetChoices(customLocalDir?: string): Promise<TargetChoice[]> {
  const choices: TargetChoice[] = [];
  for (const target of targetNames()) {
    const dir = resolveTargetDir(target, target === "local" ? customLocalDir : undefined);
    choices.push({ target, displayName: TARGETS[target].displayName, dir, exists: await fs.pathExists(dir) });
  }
  return choices;
}

function targetLabel(choice: TargetChoice): string {
  const status = choice.exists ? "found" : "not found yet";
  return `${choice.displayName} (${choice.dir}) - ${status}`;
}

export async function promptOneTarget(message = "Choose target agent", defaultTarget?: TargetName): Promise<TargetName> {
  requireInteractive(message);
  const choices = await getTargetChoices();
  const detected = choices.find((choice) => choice.exists && choice.target !== "local")?.target;
  return select({
    message,
    default: defaultTarget ?? detected ?? "claude",
    choices: choices.map((choice) => ({ name: targetLabel(choice), value: choice.target })),
  });
}

export async function promptManyTargets(message = "Choose target agents", defaults?: TargetName[], customLocalDir?: string): Promise<TargetName[]> {
  requireInteractive(message);
  const choices = await getTargetChoices(customLocalDir);
  const defaultTargets = defaults ?? [];
  const selected = await checkbox({
    message,
    required: true,
    choices: choices.map((choice) => ({
      name: targetLabel(choice),
      value: choice.target,
      checked: defaultTargets.includes(choice.target),
    })),
  });
  return selected.map((target) => TargetSchema.parse(target));
}

export async function promptScanLocations(defaultPath?: string): Promise<string[]> {
  requireInteractive("Choose locations to scan");
  const targetChoices = await getTargetChoices();
  const current = path.resolve(defaultPath ?? process.cwd());
  const selected = await checkbox({
    message: "Where should I look for skills?",
    required: true,
    choices: [
      ...targetChoices.map((choice) => ({
        name: targetLabel(choice),
        value: choice.dir,
        checked: choice.exists && choice.target !== "local",
      })),
      { name: `Current directory (${current})`, value: current, checked: true },
      { name: "Custom directory", value: "__custom__", checked: false },
    ],
  });
  const locations: string[] = [];
  for (const value of selected) {
    if (value === "__custom__") {
      locations.push(await promptText("Custom directory to scan", current));
    } else {
      locations.push(value);
    }
  }
  return [...new Set(locations)];
}

export async function promptSecret(message: string): Promise<string> {
  requireInteractive(message);
  const value = await password({ message, mask: "*" });
  return value.trim();
}
