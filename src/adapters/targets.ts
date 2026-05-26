import os from "node:os";
import path from "node:path";
import { TargetName } from "../types/schema.js";
import { expandHome } from "../utils/fs.js";

export type TargetAdapter = {
  name: TargetName;
  displayName: string;
  defaultDir: () => string;
};

export const TARGETS: Record<TargetName, TargetAdapter> = {
  claude: {
    name: "claude",
    displayName: "Claude Code",
    defaultDir: () => path.join(os.homedir(), ".claude", "skills"),
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    defaultDir: () => path.join(os.homedir(), ".cursor", "skills"),
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    defaultDir: () => path.join(os.homedir(), ".codex", "skills"),
  },
  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    defaultDir: () => path.join(os.homedir(), ".windsurf", "skills"),
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    defaultDir: () => path.join(os.homedir(), ".config", "opencode", "skills"),
  },
  openclaw: {
    name: "openclaw",
    displayName: "OpenClaw",
    defaultDir: () => path.join(os.homedir(), ".openclaw", "skills"),
  },
  gemini: {
    name: "gemini",
    displayName: "Gemini CLI",
    defaultDir: () => path.join(os.homedir(), ".gemini", "skills"),
  },
  cline: {
    name: "cline",
    displayName: "Cline",
    defaultDir: () => path.join(os.homedir(), ".cline", "skills"),
  },
  copilot: {
    name: "copilot",
    displayName: "GitHub Copilot",
    defaultDir: () => path.join(os.homedir(), ".copilot", "skills"),
  },
  agents: {
    name: "agents",
    displayName: "Agents (universal)",
    defaultDir: () => path.join(os.homedir(), ".agents", "skills"),
  },
  goose: {
    name: "goose",
    displayName: "Goose",
    defaultDir: () => path.join(os.homedir(), ".config", "goose", "skills"),
  },
  pi: {
    name: "pi",
    displayName: "Pi",
    defaultDir: () => path.join(os.homedir(), ".pi", "agent", "skills"),
  },
  local: {
    name: "local",
    displayName: "Local directory",
    defaultDir: () => path.resolve(process.cwd(), "skills"),
  },
};

export function resolveTargetDir(target: TargetName, customDir?: string): string {
  return expandHome(customDir ?? TARGETS[target].defaultDir());
}

export function targetNames(): TargetName[] {
  return Object.keys(TARGETS) as TargetName[];
}

export function formatTargetHelp(): string {
  return targetNames().join(", ");
}
