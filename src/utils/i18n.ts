import { Language, loadLanguagePreference, loadState, saveState } from "../core/state.js";
import { SkillPackError } from "./errors.js";

type MessageValue = string | ((params: Record<string, unknown>) => string);
export type LanguageSource = "cli" | "saved" | "default";

const messages = {
  en: {
    "app.description": "Package, share, install, audit, and sync AI agent skill packs.",
    "app.error": "Error: {message}",
    "home.prompt": "What do you want to do?",
    "home.install": "1. Install a skill pack",
    "home.sync": "2. Sync installed packs",
    "home.update": "3. Update installed packs",
    "home.create": "4. Create a new skill pack",
    "home.publish": "5. Publish a pack",
    "home.pull": "6. Pull a pack for editing",
    "home.open": "7. Open a workspace",
    "home.upgrade": "8. Upgrade a published pack",
    "home.workspace": "9. Manage my workspaces",
    "home.scan": "10. Scan installed skills",
    "home.doctor": "11. Check environment",
    "home.setting": "12. Settings",

    "language.command.description": "show or change the interface language",
    "language.argument": "language code: en or zh-CN",
    "language.option.set": "save the interface language",
    "language.current": "Current language: {language}",
    "language.updated": "Language saved: {language}",
    "language.invalid": "Unsupported language: {language}. Use en or zh-CN.",
    "language.optionMissing": "Missing value for --lang. Use en or zh-CN.",
    "language.english": "english",
    "language.chinese": "中文",
    "option.lang": "interface language: en or zh-CN",

    "setting.command.description": "choose SkillPack settings",
    "setting.language.argument": "language code: en or zh-CN",
    "setting.language.option": "set interface language: en or zh-CN",
    "setting.language.prompt": "Interface language",
    "setting.prompt": "What do you want to configure?",
    "setting.choice.language": "Interface language",
    "setting.choice.githubToken": "GitHub token",
    "setting.choice.show": "Show current settings",
    "setting.githubToken.option": "save GitHub token locally",
    "setting.githubToken.clear.option": "remove saved GitHub token",
    "setting.githubToken.prompt": "GitHub personal access token",
    "setting.githubToken.updated": "GitHub token saved locally.",
    "setting.githubToken.cleared": "Saved GitHub token removed.",
    "setting.githubToken.current": "GitHub token: {status}",
    "setting.show.option": "show current settings",

    "prompt.nonInteractive": "{message} Pass the required arguments/options when running non-interactively.",
    "prompt.visibility.message": "Visibility",
    "prompt.visibility.private": "Private - only local/private sharing",
    "prompt.visibility.unlisted": "Unlisted - accessible by direct link",
    "prompt.visibility.public": "Public - discoverable",
    "prompt.visibility.team": "Team - visible to a team/org",
    "prompt.target.found": "found",
    "prompt.target.notFound": "not found yet",
    "prompt.target.chooseOne": "Choose target agent",
    "prompt.target.chooseMany": "Choose target agents",
    "prompt.scan.require": "Choose locations to scan",
    "prompt.scan.message": "Where should I look for skills?",
    "prompt.scan.currentDirectory": "Current directory ({path})",
    "prompt.scan.customDirectory": "Custom directory",
    "prompt.scan.customDirectoryInput": "Custom directory to scan",

    "workspace-output.none": "No remembered workspaces yet. Publish, pull, or clone a pack to create one.",
    "workspace-output.title": "Workspaces:",
    "workspace-output.path": "Path: {path}",
    "workspace-output.provider": "Provider: {provider}",
    "workspace-output.localVersion": "Local version: {version}",
    "workspace-output.remoteLatest": "Remote latest: {version}",
    "workspace-output.status": "Status: {status}",
    "workspace-output.detail": "Detail: {detail}",
    "status.clean": "clean",
    "status.unpublished changes": "unpublished changes",
    "status.behind remote": "behind remote",
    "status.local only": "local only",
    "status.missing": "missing",
    "status.unknown": "unknown",
    "common.none": "none",
    "common.unknown": "unknown",

    "command.list.description": "list installed skill packs",
    "list.none": "No installed packs recorded.",
    "list.title": "Installed packs:",
    "list.source": "Source: {source}",
    "list.targets": "Targets:",
    "list.installedSkills": "Installed skills:",

    "command.doctor.description": "check local SkillPack environment",
    "doctor.title": "SkillPack environment",
    "doctor.home": "Home: {path} {status}",
    "doctor.state": ({ path, status, count }) => `State: ${path} ${status} (${count} workspace${count === 1 ? "" : "s"})`,
    "doctor.installedDb": ({ path, status, count }) => `Installed DB: ${path} ${status} (${count} record${count === 1 ? "" : "s"})`,
    "doctor.workspaceRoot": "Workspace root: {path} {status}",
    "doctor.githubToken": "GitHub token: {status}",
    "doctor.agentDirs": "Agent skill directories",
    "doctor.configured": "configured",
    "doctor.notSet": "not set",

    "command.workspace.description": "list and manage remembered skill pack workspaces",
    "command.workspace.list.description": "list remembered skill pack workspaces",
    "command.workspace.move.description": "move a remembered workspace to a new directory",
    "command.workspace.move.pack.argument": "workspace reference, pack name, owner/name, GitHub repo, or local path",
    "command.workspace.move.destination.argument": "new workspace directory",
    "command.workspace.move.overwrite.option": "replace an existing destination directory",
    "command.token.option": "GitHub token; defaults to GITHUB_TOKEN or GH_TOKEN",
    "workspace.error.noBinding": "No workspace binding found for {reference}. Run 'skillpack status' to see remembered workspaces.",
    "workspace.error.pathMissing": "Workspace path does not exist: {path}",
    "workspace.alreadyAt": "Workspace already at {path}",
    "workspace.confirm.replaceDestination": "Destination {path} already exists. Replace it?",
    "workspace.error.destinationExists": "Destination already exists: {path}. Re-run with --overwrite or choose another directory.",
    "workspace.moved": "Moved {pack}",
    "workspace.from": "From: {path}",
    "workspace.to": "To: {path}",

    "command.status.description": "show remembered skill pack workspaces and provider bindings",
    "command.status.pack.argument": "optional local skill pack directory",
    "command.status.remote.option": "deprecated; remote latest is checked by default for GitHub workspaces",
    "status.noBinding": "No workspace binding found under ~/.skillpack/state.yaml",

    "command.scan.description": "scan one or more directories for skills",
    "command.scan.path.argument": "directory to scan; omit for an interactive agent-directory picker",
    "command.scan.agents.option": "scan common agent skill directories",
    "scan.none": "No skills found.",
    "scan.total": ({ count }) => `Found ${count} skill${count === 1 ? "" : "s"} total.`,
  },
  "zh-CN": {
    "app.description": "打包、分享、安装、审计并同步 AI Agent 技能包。",
    "app.error": "错误：{message}",
    "home.prompt": "你想做什么？",
    "home.install": "1. 安装技能包",
    "home.sync": "2. 同步已安装的技能包",
    "home.update": "3. 更新已安装的技能包",
    "home.create": "4. 创建新的技能包",
    "home.publish": "5. 发布技能包",
    "home.pull": "6. 拉取技能包用于编辑",
    "home.open": "7. 打开工作区",
    "home.upgrade": "8. 升级已发布的技能包",
    "home.workspace": "9. 管理我的工作区",
    "home.scan": "10. 扫描已安装技能",
    "home.doctor": "11. 检查环境",
    "home.setting": "12. 设置",

    "language.command.description": "查看或切换界面语言",
    "language.argument": "语言代码：en 或 zh-CN",
    "language.option.set": "保存界面语言",
    "language.current": "当前语言：{language}",
    "language.updated": "已保存语言：{language}",
    "language.invalid": "不支持的语言：{language}。请使用 en 或 zh-CN。",
    "language.optionMissing": "--lang 缺少值。请使用 en 或 zh-CN。",
    "language.english": "english",
    "language.chinese": "中文",
    "option.lang": "界面语言：en 或 zh-CN",

    "setting.command.description": "选择 SkillPack 设置",
    "setting.language.argument": "语言代码：en 或 zh-CN",
    "setting.language.option": "设置界面语言：en 或 zh-CN",
    "setting.language.prompt": "界面语言",
    "setting.prompt": "你想配置什么？",
    "setting.choice.language": "界面语言",
    "setting.choice.githubToken": "GitHub token",
    "setting.choice.show": "查看当前设置",
    "setting.githubToken.option": "保存 GitHub token 到本地",
    "setting.githubToken.clear.option": "移除已保存的 GitHub token",
    "setting.githubToken.prompt": "GitHub personal access token",
    "setting.githubToken.updated": "GitHub token 已保存到本地。",
    "setting.githubToken.cleared": "已移除本地保存的 GitHub token。",
    "setting.githubToken.current": "GitHub token：{status}",
    "setting.show.option": "查看当前设置",

    "prompt.nonInteractive": "{message} 非交互运行时请传入所需参数或选项。",
    "prompt.visibility.message": "可见性",
    "prompt.visibility.private": "私有 - 仅本地或私下分享",
    "prompt.visibility.unlisted": "未列出 - 可通过直接链接访问",
    "prompt.visibility.public": "公开 - 可被发现",
    "prompt.visibility.team": "团队 - 对团队或组织可见",
    "prompt.target.found": "已找到",
    "prompt.target.notFound": "尚未找到",
    "prompt.target.chooseOne": "选择目标 Agent",
    "prompt.target.chooseMany": "选择目标 Agent",
    "prompt.scan.require": "选择扫描位置",
    "prompt.scan.message": "要在哪里查找技能？",
    "prompt.scan.currentDirectory": "当前目录（{path}）",
    "prompt.scan.customDirectory": "自定义目录",
    "prompt.scan.customDirectoryInput": "要扫描的自定义目录",

    "workspace-output.none": "还没有记住的工作区。发布、拉取或克隆一个技能包后会自动创建。",
    "workspace-output.title": "工作区：",
    "workspace-output.path": "路径：{path}",
    "workspace-output.provider": "来源：{provider}",
    "workspace-output.localVersion": "本地版本：{version}",
    "workspace-output.remoteLatest": "远端最新：{version}",
    "workspace-output.status": "状态：{status}",
    "workspace-output.detail": "详情：{detail}",
    "status.clean": "干净",
    "status.unpublished changes": "有未发布变更",
    "status.behind remote": "落后于远端",
    "status.local only": "仅本地",
    "status.missing": "缺失",
    "status.unknown": "未知",
    "common.none": "无",
    "common.unknown": "未知",

    "command.list.description": "列出已安装的技能包",
    "list.none": "没有已记录的安装技能包。",
    "list.title": "已安装技能包：",
    "list.source": "来源：{source}",
    "list.targets": "目标：",
    "list.installedSkills": "已安装技能：",

    "command.doctor.description": "检查本地 SkillPack 环境",
    "doctor.title": "SkillPack 环境",
    "doctor.home": "主目录：{path} {status}",
    "doctor.state": ({ path, status, count }) => `状态文件：${path} ${status}（${count} 个工作区）`,
    "doctor.installedDb": ({ path, status, count }) => `安装数据库：${path} ${status}（${count} 条记录）`,
    "doctor.workspaceRoot": "工作区根目录：{path} {status}",
    "doctor.githubToken": "GitHub token：{status}",
    "doctor.agentDirs": "Agent 技能目录",
    "doctor.configured": "已配置",
    "doctor.notSet": "未设置",

    "command.workspace.description": "列出并管理记住的技能包工作区",
    "command.workspace.list.description": "列出记住的技能包工作区",
    "command.workspace.move.description": "移动记住的工作区到新目录",
    "command.workspace.move.pack.argument": "工作区引用、技能包名、owner/name、GitHub 仓库或本地路径",
    "command.workspace.move.destination.argument": "新的工作区目录",
    "command.workspace.move.overwrite.option": "替换已存在的目标目录",
    "command.token.option": "GitHub token；默认使用 GITHUB_TOKEN 或 GH_TOKEN",
    "workspace.error.noBinding": "没有找到 {reference} 的工作区绑定。运行 'skillpack status' 查看已记住的工作区。",
    "workspace.error.pathMissing": "工作区路径不存在：{path}",
    "workspace.alreadyAt": "工作区已在 {path}",
    "workspace.confirm.replaceDestination": "目标目录 {path} 已存在。要替换它吗？",
    "workspace.error.destinationExists": "目标目录已存在：{path}。请重新运行并加上 --overwrite，或选择其他目录。",
    "workspace.moved": "已移动 {pack}",
    "workspace.from": "原路径：{path}",
    "workspace.to": "新路径：{path}",

    "command.status.description": "显示记住的技能包工作区和来源绑定",
    "command.status.pack.argument": "可选的本地技能包目录",
    "command.status.remote.option": "已废弃；GitHub 工作区默认检查远端最新版本",
    "status.noBinding": "在 ~/.skillpack/state.yaml 下没有找到工作区绑定",

    "command.scan.description": "扫描一个或多个目录中的技能",
    "command.scan.path.argument": "要扫描的目录；省略时进入交互式 Agent 目录选择器",
    "command.scan.agents.option": "扫描常见 Agent 技能目录",
    "scan.none": "没有找到技能。",
    "scan.total": ({ count }) => `共找到 ${count} 个技能。`,
  },
} as const satisfies Record<Language, Record<string, MessageValue>>;

type MessageKey = keyof (typeof messages)["en"];

let currentLanguage: Language = "en";

function interpolate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(params[key] ?? ""));
}

export function normalizeLanguage(input: string): Language {
  const normalized = input.trim().toLowerCase();
  if (normalized === "en" || normalized === "english") return "en";
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "cn" || normalized === "chinese") return "zh-CN";
  throw new SkillPackError(t("language.invalid", { language: input }), "INVALID_LANGUAGE");
}

export function setLanguage(language: Language): void {
  currentLanguage = language;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function languageLabel(language: Language): string {
  return t(language === "zh-CN" ? "language.chinese" : "language.english");
}

export function t(key: MessageKey, params: Record<string, unknown> = {}): string {
  const value = messages[currentLanguage][key] ?? messages.en[key];
  if (typeof value === "function") return value(params);
  return interpolate(value, params);
}

export async function loadSavedLanguage(): Promise<Language> {
  const language = (await loadLanguagePreference()) ?? "en";
  setLanguage(language);
  return language;
}

export async function saveLanguage(language: Language): Promise<void> {
  const state = await loadState();
  await saveState({ ...state, language });
  setLanguage(language);
}

export async function initializeLanguage(argv: string[]): Promise<LanguageSource> {
  const cliLanguage = readCliLanguage(argv);
  if (cliLanguage) {
    setLanguage(normalizeLanguage(cliLanguage));
    return "cli";
  }

  const savedLanguage = await loadLanguagePreference();
  setLanguage(savedLanguage ?? "en");
  return savedLanguage ? "saved" : "default";
}

function readCliLanguage(argv: string[]): string | undefined {
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--lang=")) {
      const value = arg.slice("--lang=".length);
      if (!value) throw new SkillPackError(t("language.optionMissing"), "INVALID_LANGUAGE");
      return value;
    }
    if (arg === "--lang") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) throw new SkillPackError(t("language.optionMissing"), "INVALID_LANGUAGE");
      return value;
    }
  }

  return undefined;
}
