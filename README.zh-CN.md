<div align="center">

# SkillPack CLI

面向 AI Agent 技能的开源包管理器

[English](README.md) | **中文** · [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

```bash
npm i -g @t59688/skillpack
```

</div>

它可以扫描本机 Agent 技能目录，将多个技能打包成可复现的 **skill pack（技能包）**，发布到 GitHub Releases，安装他人发布的技能包，并在多台机器之间同步可编辑的工作区。

可以把它理解成 AI Agent 技能栈的轻量级包管理器：

```bash
skillpack scan
skillpack create
skillpack add
skillpack publish
skillpack install github:owner/repo
skillpack pull github:owner/repo
skillpack publish my-pack
```

## 目录

- [为什么需要 SkillPack？](#为什么需要-skillpack)
- [功能特性](#功能特性)
- [支持的 Agent 目标](#支持的-agent-目标)
- [环境要求](#环境要求)
- [安装](#安装)
  - [通过 npm 安装](#通过-npm-安装)
  - [从源码使用](#从源码使用)
  - [开发时本地链接](#开发时本地链接)
  - [不链接直接运行](#不链接直接运行)
- [快速开始](#快速开始)
  - [1. 扫描已有技能](#1-扫描已有技能)
  - [2. 创建技能包](#2-创建技能包)
  - [3. 添加技能](#3-添加技能)
  - [4. 审计与打包](#4-审计与打包)
  - [5. 发布到 GitHub Releases](#5-发布到-github-releases)
  - [6. 从 GitHub 安装](#6-从-github-安装)
  - [7. 在新机器上拉取、编辑并重新发布](#7-在新机器上拉取编辑并重新发布)
- [状态模型](#状态模型)
- [技能包清单](#技能包清单)
  - [清单字段](#清单字段)
- [命令参考](#命令参考)
  - [`skillpack scan`](#skillpack-scan-path)
  - [`skillpack create`](#skillpack-create-name)
  - [`skillpack add`](#skillpack-add-packdir-skilldir)
  - [`skillpack audit`](#skillpack-audit-packdir)
  - [`skillpack pack`](#skillpack-pack-packdir)
  - [`skillpack publish`](#skillpack-publish-packdir)
  - [`skillpack download`](#skillpack-download-source)
  - [`skillpack install`](#skillpack-install-source)
  - [`skillpack pull`](#skillpack-pull-source)
  - [`skillpack status`](#skillpack-status-packdir)
  - [`skillpack bump`](#skillpack-bump-packdir-type)
  - [`skillpack list`](#skillpack-list)
  - [`skillpack diff`](#skillpack-diff-packdir)
  - [`skillpack uninstall`](#skillpack-uninstall-pack)
- [GitHub 发布工作流](#github-发布工作流)
  - [首次发布](#首次发布)
  - [发布升级版本](#发布升级版本)
  - [在新电脑上继续工作](#在新电脑上继续工作)
- [GitHub Token 配置](#github-token-配置)
- [仓库结构](#仓库结构)
- [开发](#开发)
- [安全说明](#安全说明)
- [路线图](#路线图)
- [贡献](#贡献)
- [许可证](#许可证)

## 为什么需要 SkillPack？

AI Agent 技能往往以本地文件夹的形式在 Claude Code、Cursor、Codex、Windsurf、OpenCode、OpenClaw、Gemini CLI、Cline、GitHub Copilot、Goose、Pi 或自定义 Agent 之间复制。当出现以下情况时，管理会变得困难：

- 多个 Agent 上散落着大量技能；
- 希望把一套精选技能分享给他人；
- 团队需要在各环境一致地安装相同技能；
- 希望发布新版本而无需手动维护 release 标签；
- 换新电脑后需要拉取、编辑并重新发布技能包。

SkillPack 聚焦的工作流如下：

```text
扫描本地技能 -> 创建技能包 -> 发布到 GitHub -> 任意环境安装 -> 拉取为工作区 -> 更新并重新发布
```

## 功能特性

- 日常使用的交互式提示。
- 面向 CI 与高级用户的可脚本化命令。
- 扫描常见 Agent 技能目录。
- 创建 `skillpack.yaml` 清单文件。
- 将一个或多个技能加入技能包。
- 将技能包打包为 `.skillpack` 制品。
- 将技能包发布到 GitHub Releases。
- 发布时若 GitHub 仓库不存在可自动创建。
- 从本地目录、`.skillpack` 文件、GitHub 仓库或 GitHub release URL 安装。
- 将 GitHub release 拉取到可编辑的本地工作区。
- 在 `~/.skillpack/state.yaml` 中记录工作区与提供方绑定。
- 升级发布时无需重复输入 GitHub 仓库。
- 重新发布前检查远程 GitHub release 标签是否已存在。
- 使用 `patch`、`minor` 或 `major` 递增包版本。
- 对比本地技能包与已安装的 Agent 目录差异。
- 审计技能包结构与基础安全问题。
- 仅卸载由 SkillPack 安装的技能。

## 支持的 Agent 目标

SkillPack 为以下技能目录提供适配器：

| 目标 | 默认目录 | 说明 |
|---|---|---|
| `claude` | `~/.claude/skills` | [Claude Code skills](https://code.claude.com/docs/en/skills) |
| `cursor` | `~/.cursor/skills` | [Cursor skills](https://cursor.com/docs/context/skills) |
| `codex` | `~/.codex/skills` | [OpenAI Codex skills](https://developers.openai.com/codex/skills/) |
| `windsurf` | `~/.windsurf/skills` | Windsurf Cascade（Agent Skills 格式） |
| `opencode` | `~/.config/opencode/skills` | [OpenCode skills](https://opencode.ai/docs/skills/) |
| `openclaw` | `~/.openclaw/skills` | [OpenClaw 托管技能](https://docs.openclaw.ai/tools/skills) |
| `gemini` | `~/.gemini/skills` | [Gemini CLI skills](https://geminicli.com/docs/cli/skills/) |
| `cline` | `~/.cline/skills` | [Cline skills](https://docs.cline.bot/customization/skills) |
| `copilot` | `~/.copilot/skills` | [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) |
| `agents` | `~/.agents/skills` | 跨工具通用路径（Goose、Gemini CLI、Copilot、OpenClaw 等） |
| `goose` | `~/.config/goose/skills` | Goose 旧版路径；新安装建议用 `agents` |
| `pi` | `~/.pi/agent/skills` | [Pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent#skills) |
| `local` | `./skills` | 当前工作目录 |

使用 `--target local` 时，可配合 `--target-dir` 安装到自定义目录。

许多 Agent 也支持项目级路径，例如 `.agents/skills/`、`.claude/skills/` 或 `<workspace>/skills/`。SkillPack 默认安装到上表中的全局用户目录，以便跨项目复用。

## 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- 仅在发布到 GitHub 或从私有仓库安装时需要 GitHub token

## 安装

### 通过 npm 安装

使用文首顶部的全局安装命令，然后验证：

```bash
skillpack --help
```

### 从源码使用

```bash
git clone https://github.com/t59688/skillpack-manager.git
cd skillpack-manager
npm install
npm run build
node dist/index.js --help
```

### 开发时本地链接

```bash
npm install
npm run build
npm link
skillpack --help
```

### 不链接直接运行

```bash
npm run dev -- --help
node dist/index.js --help
```

## 快速开始

### 1. 扫描已有技能

```bash
skillpack scan
```

交互模式可选择常见 Agent 目录。

可脚本化模式：

```bash
skillpack scan ~/.claude/skills
skillpack scan ~/.cursor/skills
skillpack scan --agents
```

### 2. 创建技能包

```bash
skillpack create
```

可脚本化模式：

```bash
skillpack create sales-pack \
  --owner tiechui \
  --description "Sales follow-up and customer update skills" \
  --visibility public
```

这会创建一个包含 `skillpack.yaml` 清单的文件夹。

### 3. 添加技能

```bash
skillpack add
```

交互模式可从已扫描的 Agent 目录中选择技能。

可脚本化模式：

```bash
skillpack add ./sales-pack ~/.claude/skills/customer-summary
skillpack add ./sales-pack ~/.claude/skills/quote-review
```

### 4. 审计与打包

```bash
skillpack audit ./sales-pack
skillpack pack ./sales-pack --out dist
```

这会生成 `.skillpack` 制品。

### 5. 发布到 GitHub Releases

```bash
export GITHUB_TOKEN=github_pat_xxx
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

在 Windows PowerShell 中：

```powershell
$env:GITHUB_TOKEN="github_pat_xxx"
node .\dist\index.js publish .\sales-pack --to github --repo tiechui/my-skillpacks
```

若仓库不存在，交互模式可代为创建。

### 6. 从 GitHub 安装

```bash
skillpack install github:tiechui/my-skillpacks
```

安装指定 release 标签：

```bash
skillpack install github:tiechui/my-skillpacks@sales-pack-v0.1.0
```

从 GitHub URL 安装：

```bash
skillpack install https://github.com/tiechui/my-skillpacks
skillpack install https://github.com/tiechui/my-skillpacks/releases/tag/sales-pack-v0.1.0
```

### 7. 在新机器上拉取、编辑并重新发布

```bash
skillpack pull github:tiechui/my-skillpacks
skillpack status
skillpack publish sales-pack
```

`pull` 会下载最新的 `.skillpack` release，解压到可编辑工作区，并记住 GitHub 绑定关系。

默认情况下，拉取的工作区存放在：

```text
~/.skillpack/workspaces/<owner>/<pack-name>
```

也可指定其他位置：

```bash
skillpack pull github:tiechui/my-skillpacks --out ./sales-pack
```

## 状态模型

SkillPack 将持久化元数据保存在：

```text
~/.skillpack/state.yaml
```

该文件记录本地工作区与提供方绑定，例如：

```yaml
schema: https://skillpack.dev/schemas/state.v1.json
workspaces:
  - id: tiechui/sales-pack
    pack: tiechui/sales-pack
    owner: tiechui
    name: sales-pack
    localPath: /Users/tiechui/.skillpack/workspaces/tiechui/sales-pack
    provider:
      type: github
      repo: tiechui/my-skillpacks
    lastVersion: 0.1.0
    lastTag: sales-pack-v0.1.0
```

重要行为说明：

- `~/.skillpack` 并非技能包只能存放的位置。
- 支持已有本地目录，并可在原位置继续编辑。
- `pull` 默认使用 `~/.skillpack/workspaces/<owner>/<pack>` 以方便管理。
- `publish sales-pack` 可按包名、完整包 id 或提供方解析已记录的工作区。
- GitHub release 冲突会与远程仓库核对，而不仅依赖本地状态。

示例：

```bash
skillpack publish sales-pack
skillpack publish tiechui/sales-pack
skillpack publish github:tiechui/my-skillpacks
skillpack publish /absolute/path/to/sales-pack
```

## 技能包清单

每个技能包都包含 `skillpack.yaml` 文件。

```yaml
schema: https://skillpack.dev/schemas/skillpack.v1.json
name: sales-pack
displayName: Sales Pack
owner: tiechui
version: 0.1.0
description: Skills for customer updates, quote review, and sales follow-up.
visibility: public
tags:
  - sales
  - crm
skills:
  - name: customer-summary
    path: skills/customer-summary
  - name: quote-review
    path: skills/quote-review
shared:
  references:
    - shared/company-style.md
  assets: []
targets:
  - claude
  - cursor
```

### 清单字段

| 字段 | 必填 | 说明 |
|---|---:|---|
| `name` | 是 | 技能包的小写 slug。示例：`sales-pack`。 |
| `version` | 是 | SemVer 版本。示例：`0.1.0`。 |
| `description` | 是 | 人类可读的描述。 |
| `owner` | 否 | 个人或组织命名空间。示例：`tiechui`。 |
| `displayName` | 否 | 友好的显示名称。 |
| `visibility` | 否 | `private`、`unlisted`、`public` 或 `team`。 |
| `tags` | 否 | 用于搜索与分类的标签。 |
| `skills` | 否 | 包内包含的技能。每个技能指向本地路径。 |
| `shared.references` | 否 | 技能包共用的引用文件。 |
| `shared.assets` | 否 | 技能包共用的资源文件。 |
| `targets` | 否 | 建议的安装目标。 |

## 命令参考

### `skillpack scan [path]`

扫描目录中的技能。只要文件夹包含 `SKILL.md` 即视为技能。

```bash
skillpack scan
skillpack scan ~/.claude/skills
skillpack scan --agents
```

选项：

| 选项 | 说明 |
|---|---|
| `-a, --agents` | 扫描常见 Agent 技能目录。 |

### `skillpack create [name]`

创建新的技能包目录与清单。

```bash
skillpack create
skillpack create sales-pack
skillpack create sales-pack --owner tiechui --description "Sales skills"
```

选项：

| 选项 | 说明 |
|---|---|
| `-d, --description <description>` | 技能包描述。 |
| `-o, --owner <owner>` | 所有者命名空间。 |
| `--dir <dir>` | 输出目录。 |
| `--visibility <visibility>` | `private`、`unlisted`、`public` 或 `team`。 |

### `skillpack add [packDir] [skillDir]`

将本地技能文件夹加入技能包。技能文件夹必须包含 `SKILL.md`。

```bash
skillpack add
skillpack add ./sales-pack ~/.claude/skills/customer-summary
skillpack add ./sales-pack ~/.claude/skills/customer-summary --name customer-summary
```

选项：

| 选项 | 说明 |
|---|---|
| `--name <name>` | 添加单个技能时覆盖技能名称。 |
| `--copy` | 将技能复制进技能包。默认启用。 |

### `skillpack audit [packDir]`

审计技能包的清单有效性、缺失文件与基础安全问题。

```bash
skillpack audit ./sales-pack
skillpack audit sales-pack
```

### `skillpack pack [packDir]`

将技能包打包为 `.skillpack` 制品。

```bash
skillpack pack ./sales-pack
skillpack pack ./sales-pack --out dist
skillpack pack sales-pack --out dist
```

选项：

| 选项 | 说明 |
|---|---|
| `-o, --out <dir>` | `.skillpack` 文件的输出目录。 |

### `skillpack publish [packDir]`

在本地或 GitHub Releases 发布技能包。

```bash
skillpack publish
skillpack publish ./sales-pack
skillpack publish ./sales-pack --out dist
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

选项：

| 选项 | 说明 |
|---|---|
| `-o, --out <dir>` | 本地制品输出目录。默认：`dist`。 |
| `--to <provider>` | `local` 或 `github`。 |
| `--repo <owner/repo>` | GitHub 仓库。首次发布到 GitHub 时必填，除非通过提示输入。 |
| `--token <token>` | GitHub token。默认读取 `GITHUB_TOKEN` 或 `GH_TOKEN`。 |
| `--tag <tag>` | Release 标签。默认：`<pack-name>-v<version>`。 |
| `--release-name <name>` | GitHub release 名称。 |
| `--body <markdown>` | GitHub release 说明。 |
| `--draft` | 以草稿形式创建 release。 |
| `--prerelease` | 标记为预发布。 |
| `--overwrite` | 替换同名已存在的 release 资源。 |
| `--dry-run` | 仅展示将要发布的内容，不调用 GitHub。 |
| `--create-repo` | 若仓库不存在则创建。 |
| `--public` | 将新创建的 GitHub 仓库设为公开。 |
| `--private` | 将新创建的 GitHub 仓库设为私有。 |
| `--bump <type>` | 发布前递增版本：`patch`、`minor` 或 `major`。 |
| `--no-state` | 不在 `~/.skillpack` 下记录工作区/提供方元数据。 |
| `--registry <url>` | 遗留 registry 占位选项。 |

发布行为：

- 首次发布到 GitHub 时，SkillPack 会在 `~/.skillpack/state.yaml` 中记录仓库绑定。
- 之后执行 `skillpack publish sales-pack` 可复用该绑定。
- 发布前会检查目标 GitHub release 标签是否已在远程存在。
- 若标签已存在，交互模式会询问是递增版本、覆盖还是取消。

示例：

```bash
skillpack publish sales-pack --bump patch
skillpack publish sales-pack --bump minor
skillpack publish sales-pack --overwrite
skillpack publish sales-pack --to github --repo tiechui/my-skillpacks --dry-run
```

### `skillpack download [source]`

从 GitHub Releases 下载 `.skillpack` 文件，但不安装。

```bash
skillpack download github:tiechui/my-skillpacks
skillpack download github:tiechui/my-skillpacks@sales-pack-v0.1.0
skillpack download https://github.com/tiechui/my-skillpacks --out downloads
```

选项：

| 选项 | 说明 |
|---|---|
| `-o, --out <dir>` | 输出目录。默认：当前目录。 |
| `--token <token>` | 私有仓库的 GitHub token。默认读取 `GITHUB_TOKEN` 或 `GH_TOKEN`。 |

### `skillpack install [source]`

将技能包安装到一个或多个 Agent 目标。

支持的来源：

```text
./pack-directory
./pack.skillpack
github:owner/repo
github:owner/repo@tag
https://github.com/owner/repo
https://github.com/owner/repo/releases/tag/<tag>
```

示例：

```bash
skillpack install ./dist/sales-pack-0.1.0.skillpack
skillpack install github:tiechui/my-skillpacks
skillpack install github:tiechui/my-skillpacks@sales-pack-v0.1.0
skillpack install github:tiechui/my-skillpacks --target claude
skillpack install github:tiechui/my-skillpacks --target claude --target cursor
skillpack install ./sales-pack --target local --target-dir ./tmp/skills
```

选项：

| 选项 | 说明 |
|---|---|
| `-t, --target <target>` | 目标 Agent。可重复指定以安装到多个目标。 |
| `--target-dir <dir>` | 自定义目标目录。建议与 `--target local` 配合使用。 |
| `--token <token>` | 私有仓库的 GitHub token。默认读取 `GITHUB_TOKEN` 或 `GH_TOKEN`。 |
| `--overwrite` | 覆盖已存在的技能目录。 |

### `skillpack pull [source]`

从 GitHub release 下载并解压到可编辑工作区。

```bash
skillpack pull github:tiechui/my-skillpacks
skillpack pull github:tiechui/my-skillpacks@sales-pack-v0.1.0
skillpack pull https://github.com/tiechui/my-skillpacks --out ./sales-pack
```

选项：

| 选项 | 说明 |
|---|---|
| `-o, --out <dir>` | 工作区目录。默认：`~/.skillpack/workspaces/<owner>/<pack>`。 |
| `--token <token>` | 私有仓库的 GitHub token。默认读取 `GITHUB_TOKEN` 或 `GH_TOKEN`。 |
| `--overwrite` | 替换已存在的工作区目录。 |

拉取之后：

```bash
skillpack status
skillpack publish sales-pack
```

### `skillpack status [packDir]`

显示已记录的工作区与提供方绑定。

```bash
skillpack status
skillpack status sales-pack
skillpack status tiechui/sales-pack
skillpack status github:tiechui/my-skillpacks
skillpack status sales-pack --remote
```

选项：

| 选项 | 说明 |
|---|---|
| `--remote` | 同时检查当前 GitHub release 标签是否已在远程存在。 |
| `--token <token>` | GitHub token。默认读取 `GITHUB_TOKEN` 或 `GH_TOKEN`。 |

### `skillpack bump [packDir] [type]`

在 `skillpack.yaml` 中递增或设置包版本。

```bash
skillpack bump sales-pack patch
skillpack bump sales-pack minor
skillpack bump sales-pack major
skillpack bump sales-pack --set 1.0.0
```

选项：

| 选项 | 说明 |
|---|---|
| `--set <version>` | 设置为指定的 SemVer 版本。 |

### `skillpack list`

列出 SkillPack 记录的已安装技能包。

```bash
skillpack list
```

### `skillpack diff [packDir]`

对比技能包与已安装的目标技能目录。

```bash
skillpack diff
skillpack diff sales-pack --target claude
skillpack diff sales-pack --target cursor
skillpack diff sales-pack --target local --target-dir ./tmp/skills
```

选项：

| 选项 | 说明 |
|---|---|
| `-t, --target <target>` | 任意支持的目标 id（见上表），含 `openclaw`、`gemini`、`cline`、`copilot`、`agents`、`goose`、`pi` 等。 |
| `--target-dir <dir>` | 自定义目标技能目录。 |

### `skillpack uninstall [pack]`

从 Agent 目标卸载先前安装的技能包。

```bash
skillpack uninstall
skillpack uninstall tiechui/sales-pack
skillpack uninstall sales-pack --target claude
```

选项：

| 选项 | 说明 |
|---|---|
| `-t, --target <target>` | 仅卸载指定目标。 |

卸载基于 SkillPack 的安装记录，避免误删无关目录。

## GitHub 发布工作流

### 首次发布

```bash
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

输出示例：

```text
Release: https://github.com/tiechui/my-skillpacks/releases/tag/sales-pack-v0.1.0
Download: https://github.com/tiechui/my-skillpacks/releases/download/sales-pack-v0.1.0/sales-pack-0.1.0.skillpack
Install command: skillpack install github:tiechui/my-skillpacks
```

### 发布升级版本

在工作区中编辑文件后执行：

```bash
skillpack publish sales-pack
```

若 GitHub 上已存在 `sales-pack-v0.1.0`，SkillPack 会提示：

```text
Remote release tiechui/my-skillpacks@sales-pack-v0.1.0 already exists on GitHub.
What should happen?
- Bump patch -> 0.1.1
- Bump minor -> 0.2.0
- Bump major -> 1.0.0
- Keep version and overwrite the existing release asset
- Cancel
```

非交互示例：

```bash
skillpack publish sales-pack --bump patch
skillpack publish sales-pack --bump minor
skillpack publish sales-pack --overwrite
```

### 在新电脑上继续工作

```bash
skillpack pull github:tiechui/my-skillpacks
skillpack status
skillpack publish sales-pack
```

若希望可编辑副本位于其他路径，使用 `--out`：

```bash
skillpack pull github:tiechui/my-skillpacks --out ./sales-pack
```

## GitHub Token 配置

对于公开仓库，安装时不需要 token。

发布需要具备在目标仓库创建 release 并上传 release 资源的权限。若使用细粒度 GitHub token，请为目标仓库授予 **Contents: read and write** 权限。

SkillPack 按以下顺序读取 token：

1. `--token <token>`
2. `GITHUB_TOKEN`
3. `GH_TOKEN`
4. 可用时的交互式掩码输入

示例：

```bash
export GITHUB_TOKEN=github_pat_xxx
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

PowerShell：

```powershell
$env:GITHUB_TOKEN="github_pat_xxx"
node .\dist\index.js publish .\sales-pack --to github --repo tiechui/my-skillpacks
```

## 仓库结构

```text
.
├── src/
│   ├── commands/       # CLI 命令
│   ├── core/           # 打包、发布、安装、状态、GitHub 逻辑
│   ├── adapters/       # 各 Agent 目录适配器
│   ├── types/          # zod schema 与共享类型
│   └── utils/          # 文件系统、提示、错误处理
├── test/               # vitest 测试
├── DESIGN.md           # 设计文档
├── README.md
├── package.json
└── tsconfig.json
```

## 开发

```bash
npm install
npm run build
npm test
npm run lint
npm run format
```

开发时运行 CLI：

```bash
npm run dev -- scan
npm run dev -- publish ./sales-pack --to local
```

构建并直接运行：

```bash
npm run build
node dist/index.js --help
```

## 安全说明

SkillPack 会将文件复制到 Agent 技能目录。在安装不信任来源的技能包之前：

```bash
skillpack download github:owner/repo
skillpack audit ./downloaded-pack
```

当前审计检查有意保持轻量。请将技能视为可执行行为：在敏感环境中使用前，请检查说明与脚本。

## 路线图

- GitHub Releases 之外的远程 registry 后端。
- 技能包签名与来源元数据。
- 更强的策略与安全扫描。
- 团队仪表盘与漂移检测。
- 工作区 lockfile。
- 更多 Agent 适配器。
- 与其他技能生态的导入/导出兼容。

## 贡献

欢迎提交 Issue 与 Pull Request。

有价值的贡献方向：

- 新的目标适配器；
- 更好的 Windows 路径处理；
- 更丰富的审计规则；
- registry 提供方适配器；
- 文档示例；
- GitHub release 边界情况的测试。

提交 PR 前请运行：

```bash
npm run build
npm test
npm run lint
```

## 许可证

MIT。详见 [LICENSE](LICENSE)。
