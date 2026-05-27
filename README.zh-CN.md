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
skillpack update
skillpack sync github:owner/repo
skillpack publish my-pack
```

## 目录

- [为什么需要 SkillPack？](#为什么需要-skillpack)
- [功能特性](#功能特性)
- [支持的 Agent 目标](#支持的-agent-目标)
- [环境要求](#环境要求)
- [安装](#安装)
- [交互式 CLI](#交互式-cli)
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
- [GitHub 发布工作流](#github-发布工作流)
  - [首次发布](#首次发布)
  - [发布升级版本](#发布升级版本)
  - [在新电脑上继续工作](#在新电脑上继续工作)
- [GitHub Token 配置](#github-token-配置)
- [仓库结构](#仓库结构)
- [开发](#开发)
- [安全说明](#安全说明)
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
扫描本地技能 -> 创建技能包 -> 发布到 GitHub -> 任意环境安装 -> sync/update 保持最新 -> 拉取为工作区 -> upgrade 并重新发布
```

## 功能特性

- **交互式主菜单** — 在 TTY 中直接运行 `skillpack`（无子命令）可快速选择常用操作。
- 日常交互提示与面向 CI 的可脚本化参数。
- 扫描常见 Agent 技能目录（`skillpack scan --agents`）。
- 创建 `skillpack.yaml` 清单；添加技能并记录 checksum；SemVer 版本递增。
- 打包为 `.skillpack` 或 `.zip` 制品（`pack` 会先审计，有错则中止）。
- 发布到本地制品或 **GitHub Releases**；可自动建库；更新 GitHub README 安装说明。
- **`skillpack upgrade`** — 对比工作区与最新 release、生成 release 说明、审计、递增版本并一键发布。
- 从本地包目录、`.skillpack`/`.zip` 文件、`github:owner/repo` 或 GitHub URL 安装。
- **安装前安全摘要**（密钥、远程脚本、风险模式等）。
- **`sync`** — 将已安装包与新版对齐，并保留你本地额外添加的技能。
- **`update`** — 按 SemVer 将已安装的 GitHub 包更新到最新 release。
- **`pull`（`clone`）** — 拉取 release 到 `~/.skillpack/workspaces/` 可编辑工作区。
- **`open`** 用文件管理器或 VS Code 打开工作区；**`workspace move`** 迁移目录。
- 工作区记录在 `state.yaml`；安装记录在 `installed.yaml`。
- 工作区状态：clean、未发布变更、落后远程、仅本地、缺失等。
- `diff` 可对比 Agent 目录或安装记录（`diff --installed`）。
- 审计清单、结构与安全问题；`uninstall`/`remove`/`rm` 仅移除 SkillPack 安装的技能。
- **`doctor`** — 检查 Node、配置路径、token 与各 Agent 技能目录。

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

## 交互式 CLI

在交互式终端（非 CI）中，不带子命令运行 `skillpack` 会打开主菜单：

| 操作 | 对应命令 |
|---|---|
| 安装技能包 | `install` |
| 同步已安装包 | `sync` |
| 更新已安装包 | `update` |
| 创建新技能包 | `create` |
| 发布技能包 | `publish` |
| 拉取以便编辑 | `pull` |
| 打开工作区 | `open` |
| 升级已发布包 | `upgrade` |
| 管理工作区 | `workspace list` |
| 扫描技能 | `scan` |
| 检查环境 | `doctor` |

非交互环境会输出 `skillpack --help`。

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

安装后保持最新：

```bash
skillpack update
skillpack sync github:tiechui/my-skillpacks --target claude
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

SkillPack 在 `~/.skillpack/` 下持久化元数据：

| 文件/目录 | 用途 |
|---|---|
| `state.yaml` | 已记录的工作区与 GitHub 提供方绑定 |
| `installed.yaml` | 各目标上的安装记录（路径、版本、checksum） |
| `cache/` | 下载的制品与临时解压目录 |
| `workspaces/<owner>/<pack>/` | `pull` 后的默认可编辑副本 |

### `state.yaml`

工作区与提供方绑定示例：

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

`status` 与 `workspace list` 会显示工作区健康状态（如 `clean`、`unpublished changes`、`behind remote`）。GitHub 工作区默认会检查远程最新版本。

### `installed.yaml`

每次安装会追加一条记录，供 `list`、`sync`、`update`、`diff --installed`、`uninstall` 使用：

```yaml
- pack: tiechui/sales-pack
  version: "0.1.0"
  target: claude
  targetDir: /Users/tiechui/.claude/skills
  installedAt: "2026-05-27T12:00:00.000Z"
  source: github:tiechui/my-skillpacks@sales-pack-v0.1.0
  skills:
    - name: customer-summary
      path: /Users/tiechui/.claude/skills/customer-summary
      version: "0.1.0"
      checksum: sha256:...
```

重要行为说明：

- `~/.skillpack` 并非技能包只能存放的位置。
- 支持已有本地目录，并可在原位置继续编辑。
- `pull` 默认使用 `~/.skillpack/workspaces/<owner>/<pack>` 以方便管理。
- `publish sales-pack` 可按包名、完整包 id 或提供方解析已记录的工作区。
- GitHub release 冲突会与远程仓库核对，而不仅依赖本地状态。
- `install`、`sync`、`update` 会读写 `installed.yaml`；除非你显式使用 `--force`，否则不会删除你在包外本地新增的技能。

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

将技能包打包为 `.skillpack` 制品。会先运行 `audit`；若存在错误则中止打包。

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

### `skillpack upgrade [pack]`

对绑定了 GitHub 的工作区执行：递增版本、审计、打包并发布。会对比本地内容与远程最新 release；无变更则跳过；可生成 release 说明。

```bash
skillpack upgrade sales-pack
skillpack upgrade sales-pack --bump patch
skillpack upgrade sales-pack --bump minor --yes
```

选项：

| 选项 | 说明 |
|---|---|
| `--bump <type>` | `patch`、`minor` 或 `major`（非交互模式必填）。 |
| `-o, --out <dir>` | 打包制品输出目录。 |
| `--token <token>` | GitHub token。默认 `GITHUB_TOKEN` 或 `GH_TOKEN`。 |
| `--release-name <name>` | GitHub release 标题。 |
| `--body <markdown>` | Release 说明（可交互输入或自动生成）。 |
| `--draft` | 创建草稿 release。 |
| `--prerelease` | 标记为预发布。 |
| `--overwrite` | 替换同名已存在的 release 资源。 |
| `--dry-run` | 仅预览，不调用 GitHub。 |
| `-y, --yes` | 当远程最新标签与工作区记录不一致时仍继续。 |

需要 `provider.type: github` 的工作区（来自 `pull` 或 `publish --to github`）。

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

复制前会显示安全摘要。未指定 `--target` 时，默认使用清单中的 `targets` 或检测到的 Agent 目录。

### `skillpack sync [source]`

将**已安装**的技能包与较新版本对齐：补齐缺失、更新过期项，并**保留你本地额外添加的技能**。GitHub 来源会自动解析最新 release。

```bash
skillpack sync github:tiechui/my-skillpacks
skillpack sync github:tiechui/my-skillpacks --target claude
skillpack sync ./sales-pack-0.2.0.skillpack --target cursor --force
```

选项：

| 选项 | 说明 |
|---|---|
| `-t, --target <target>` | 仅同步指定目标的安装记录。 |
| `--target-dir <dir>` | 匹配安装记录中的自定义目标目录。 |
| `--token <token>` | 私有仓库的 GitHub token。 |
| `--force` | 覆盖安装后被修改过的技能。 |

### `skillpack update [pack]`

将已安装的 GitHub 技能包更新到最新 release（按 SemVer）。省略 `pack` 则检查所有 GitHub 安装。

```bash
skillpack update
skillpack update tiechui/sales-pack
skillpack update sales-pack --force
```

选项：

| 选项 | 说明 |
|---|---|
| `--token <token>` | 私有仓库的 GitHub token。 |
| `--force` | 不提示即覆盖安装后被修改的技能。 |

### `skillpack pull [source]`

从 GitHub release 下载并解压到可编辑工作区。别名：`clone`。

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

### `skillpack open [pack]`

在系统文件管理器或 VS Code 中打开已记录的工作区。

```bash
skillpack open sales-pack
skillpack open sales-pack --code
```

选项：

| 选项 | 说明 |
|---|---|
| `--code` | 使用 VS Code 打开（需 `code` 在 PATH 中）。 |

### `skillpack status [packDir]`

显示已记录的工作区、提供方绑定及工作区状态（本地与远程版本对比）。

```bash
skillpack status
skillpack status sales-pack
skillpack status tiechui/sales-pack
skillpack status github:tiechui/my-skillpacks
```

选项：

| 选项 | 说明 |
|---|---|
| `--token <token>` | GitHub token。默认读取 `GITHUB_TOKEN` 或 `GH_TOKEN`。 |

### `skillpack workspace`

管理工作区。

#### `skillpack workspace list`（别名 `ls`）

与 `skillpack status` 列出全部工作区的输出相同。

```bash
skillpack workspace list
skillpack workspace ls --token $GITHUB_TOKEN
```

#### `skillpack workspace move <pack> <destination>`

在磁盘上移动工作区目录并更新 `state.yaml`。

```bash
skillpack workspace move sales-pack ~/Projects/sales-pack
skillpack workspace move sales-pack ./sales-pack --overwrite
```

选项：

| 选项 | 说明 |
|---|---|
| `--overwrite` | 替换非空的目标目录。 |

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

对比技能包与 Agent 目标目录，或与 SkillPack 安装记录。

```bash
skillpack diff sales-pack --target claude
skillpack diff sales-pack --installed
skillpack diff github:tiechui/my-skillpacks --installed --target cursor
```

选项：

| 选项 | 说明 |
|---|---|
| `-t, --target <target>` | 与技能目录对比时指定的 Agent 目标。 |
| `--target-dir <dir>` | 自定义目标技能目录。 |
| `--installed` | 与 `installed.yaml` 对比（缺失、过期、本地额外、已修改）。 |
| `--token <token>` | 来源为 GitHub 时使用的 token。 |

### `skillpack uninstall [pack]`

从 Agent 目标卸载先前安装的技能包。别名：`remove`、`rm`。

```bash
skillpack uninstall
skillpack uninstall tiechui/sales-pack
skillpack uninstall sales-pack --target claude
skillpack remove sales-pack --force
```

选项：

| 选项 | 说明 |
|---|---|
| `-t, --target <target>` | 仅卸载指定目标。 |
| `--force` | 跳过确认提示。 |

卸载基于 SkillPack 的安装记录，避免误删无关目录；若安装后被修改会给出警告。

### `skillpack doctor`

检查本机 SkillPack 环境：Node 版本、`~/.skillpack` 路径、工作区与安装记录数量、GitHub token 环境变量、各 Agent 技能目录是否存在。

```bash
skillpack doctor
```

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

在工作区中编辑文件后发布：

```bash
skillpack upgrade sales-pack
```

`upgrade` 会对比远程最新 release、运行审计、递增版本并发布。也可直接使用 `publish`：

```bash
skillpack publish sales-pack
```

若 GitHub 上已存在 `sales-pack-v0.1.0`，`publish` 会提示：

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

SkillPack 会将文件复制到 Agent 技能目录。技能中的说明与脚本可能在 Agent 环境中执行。

在安装不信任来源的技能包之前：

```bash
skillpack download github:owner/repo
skillpack audit ./downloaded-pack
```

`install` 与 `update` 还会输出自动化**安全摘要**（类密钥内容、远程安装命令、可执行脚本、文件系统引用等）。`audit` 检查清单有效性、结构与可疑模式；`pack` 与 `upgrade` 在审计报错时会中止。

请将技能视为可执行行为：在敏感环境中使用前，请检查 `SKILL.md` 与附带脚本。

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

## 友链

- [linuxdo](https://linux.do/) — 感谢 LinuxDO 站点及其社区用户的支持与反馈。
