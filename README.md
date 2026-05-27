<div align="center">

# SkillPack CLI

Open-source package manager for AI agent skills

**English** | [中文](README.zh-CN.md) · [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

```bash
npm i -g @t59688/skillpack
```

</div>

It lets you scan local agent skill folders, bundle multiple skills into a reproducible **skill pack**, publish that pack to GitHub Releases, install other people's packs, and keep editable workspaces synced across machines.

Think of it as a lightweight package manager for your AI agent skill stack:

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

## Table of Contents

- [Why SkillPack?](#why-skillpack)
- [Features](#features)
- [Supported agent targets](#supported-agent-targets)
- [Requirements](#requirements)
- [Installation](#installation)
- [Interactive CLI](#interactive-cli)
  - [Install from npm](#install-from-npm)
  - [Use from source](#use-from-source)
  - [Link locally during development](#link-locally-during-development)
  - [Run without linking](#run-without-linking)
- [Quick start](#quick-start)
  - [1. Scan your existing skills](#1-scan-your-existing-skills)
  - [2. Create a pack](#2-create-a-pack)
  - [3. Add skills](#3-add-skills)
  - [4. Audit and package](#4-audit-and-package)
  - [5. Publish to GitHub Releases](#5-publish-to-github-releases)
  - [6. Install from GitHub](#6-install-from-github)
  - [7. Pull, edit, and republish on a new machine](#7-pull-edit-and-republish-on-a-new-machine)
- [The state model](#the-state-model)
- [Pack manifest](#pack-manifest)
  - [Manifest fields](#manifest-fields)
- [Command reference](#command-reference)
- [GitHub publishing workflow](#github-publishing-workflow)
  - [First publish](#first-publish)
  - [Publish an upgrade](#publish-an-upgrade)
  - [Work on a new computer](#work-on-a-new-computer)
- [GitHub token setup](#github-token-setup)
- [Repository layout](#repository-layout)
- [Development](#development)
- [Safety notes](#safety-notes)
- [Contributing](#contributing)
- [License](#license)

## Why SkillPack?

AI agent skills often start as local folders copied between tools such as Claude Code, Cursor, Codex, Windsurf, OpenCode, OpenClaw, Gemini CLI, Cline, GitHub Copilot, Goose, Pi, or custom agents. That becomes hard to manage when:

- you have many skills spread across several agents;
- you want to share a curated set of skills with someone else;
- a team needs the same skills installed consistently;
- you want to publish a new version without manually editing release tags;
- you switch to a new computer and need to pull, edit, and republish a pack.

SkillPack focuses on this workflow:

```text
scan local skills -> create a pack -> publish to GitHub -> install anywhere -> sync or update installs -> pull as workspace -> upgrade and republish
```

## Features

- **Interactive home menu** — run `skillpack` with no subcommand in a TTY to pick common actions.
- Interactive prompts for everyday usage; scriptable flags for CI and power users.
- Scan common agent skill directories (`skillpack scan --agents`).
- Create `skillpack.yaml` manifests; add skills with checksums; bump SemVer versions.
- Package packs as `.skillpack` or `.zip` artifacts (`pack` runs audit first and blocks on errors).
- Publish to local artifacts or **GitHub Releases**; auto-create repos; update GitHub README install sections.
- **`skillpack upgrade`** — compare workspace content to the latest release, generate release notes, audit, bump, and publish in one flow.
- Install from local pack dirs, `.skillpack`/`.zip` files, `github:owner/repo`, or GitHub URLs.
- **Install-time security summary** (secrets, remote scripts, risky patterns) before copying skills.
- **`sync`** — reconcile an installed pack with a newer release while keeping extra local skills you added.
- **`update`** — bump all (or one) GitHub-installed packs to the latest release by SemVer.
- Pull (`clone`) GitHub releases into editable workspaces under `~/.skillpack/workspaces/`.
- **`open`** workspaces in the file manager or VS Code; **`workspace move`** to relocate them.
- Remember workspaces in `~/.skillpack/state.yaml`; track installs in `~/.skillpack/installed.yaml`.
- Workspace status: clean, unpublished changes, behind remote, local only, missing.
- Diff packs against agent dirs or against SkillPack install records (`diff --installed`).
- Audit packs for manifest, structure, and safety issues; uninstall/remove only SkillPack-managed skills.
- **`doctor`** — check Node, config paths, token env vars, and agent skill directories.

## Supported agent targets

SkillPack includes adapters for these skill directories:

| Target | Default directory | Notes |
|---|---|---|
| `claude` | `~/.claude/skills` | [Claude Code skills](https://code.claude.com/docs/en/skills) |
| `cursor` | `~/.cursor/skills` | [Cursor skills](https://cursor.com/docs/context/skills) |
| `codex` | `~/.codex/skills` | [OpenAI Codex skills](https://developers.openai.com/codex/skills/) |
| `windsurf` | `~/.windsurf/skills` | Windsurf Cascade (Agent Skills format) |
| `opencode` | `~/.config/opencode/skills` | [OpenCode skills](https://opencode.ai/docs/skills/) |
| `openclaw` | `~/.openclaw/skills` | [OpenClaw managed skills](https://docs.openclaw.ai/tools/skills) |
| `gemini` | `~/.gemini/skills` | [Gemini CLI skills](https://geminicli.com/docs/cli/skills/) |
| `cline` | `~/.cline/skills` | [Cline skills](https://docs.cline.bot/customization/skills) |
| `copilot` | `~/.copilot/skills` | [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) |
| `agents` | `~/.agents/skills` | Cross-tool convention (Goose, Gemini CLI, Copilot, OpenClaw, and others) |
| `goose` | `~/.config/goose/skills` | Legacy Goose path; prefer `agents` for new installs |
| `pi` | `~/.pi/agent/skills` | [Pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent#skills) |
| `local` | `./skills` | Current working directory |

Use `--target-dir` with `--target local` when you want to install into a custom directory.

Many agents also read project-scoped paths such as `.agents/skills/`, `.claude/skills/`, or `<workspace>/skills/`. SkillPack installs to the global user paths above by default so skills are available across projects.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- GitHub token only when publishing to GitHub or installing from private repositories

## Installation

### Install from npm

Use the global install command in the header above, then verify:

```bash
skillpack --help
```

### Use from source

```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>
npm install
npm run build
node dist/index.js --help
```

### Link locally during development

```bash
npm install
npm run build
npm link
skillpack --help
```

### Run without linking

```bash
npm run dev -- --help
node dist/index.js --help
```

## Interactive CLI

In an interactive terminal (not CI), running `skillpack` with no subcommand opens a home menu:

| Action | Command |
|---|---|
| Install a skill pack | `install` |
| Sync installed packs | `sync` |
| Update installed packs | `update` |
| Create a new skill pack | `create` |
| Publish a pack | `publish` |
| Pull a pack for editing | `pull` |
| Open a workspace | `open` |
| Upgrade a published pack | `upgrade` |
| Manage workspaces | `workspace list` |
| Scan installed skills | `scan` |
| Check environment | `doctor` |

Non-interactive environments print `skillpack --help` instead.

## Quick start

### 1. Scan your existing skills

```bash
skillpack scan
```

Interactive mode lets you choose common agent directories.

Scriptable mode:

```bash
skillpack scan ~/.claude/skills
skillpack scan ~/.cursor/skills
skillpack scan --agents
```

### 2. Create a pack

```bash
skillpack create
```

Scriptable mode:

```bash
skillpack create sales-pack \
  --owner tiechui \
  --description "Sales follow-up and customer update skills" \
  --visibility public
```

This creates a folder containing a `skillpack.yaml` manifest.

### 3. Add skills

```bash
skillpack add
```

Interactive mode lets you pick skills from scanned agent directories.

Scriptable mode:

```bash
skillpack add ./sales-pack ~/.claude/skills/customer-summary
skillpack add ./sales-pack ~/.claude/skills/quote-review
```

### 4. Audit and package

```bash
skillpack audit ./sales-pack
skillpack pack ./sales-pack --out dist
```

This creates a `.skillpack` artifact.

### 5. Publish to GitHub Releases

```bash
export GITHUB_TOKEN=github_pat_xxx
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

On Windows PowerShell:

```powershell
$env:GITHUB_TOKEN="github_pat_xxx"
node .\dist\index.js publish .\sales-pack --to github --repo tiechui/my-skillpacks
```

If the repository does not exist, interactive mode can create it for you.

### 6. Install from GitHub

```bash
skillpack install github:tiechui/my-skillpacks
```

Install a specific release tag:

```bash
skillpack install github:tiechui/my-skillpacks@sales-pack-v0.1.0
```

Install from a GitHub URL:

```bash
skillpack install https://github.com/tiechui/my-skillpacks
skillpack install https://github.com/tiechui/my-skillpacks/releases/tag/sales-pack-v0.1.0
```

After install, keep packs current:

```bash
skillpack update
skillpack sync github:tiechui/my-skillpacks --target claude
```

### 7. Pull, edit, and republish on a new machine

```bash
skillpack pull github:tiechui/my-skillpacks
skillpack status
skillpack publish sales-pack
```

`pull` downloads the latest `.skillpack` release, extracts it into an editable workspace, and remembers the GitHub binding.

By default, pulled workspaces are stored under:

```text
~/.skillpack/workspaces/<owner>/<pack-name>
```

You can choose another location:

```bash
skillpack pull github:tiechui/my-skillpacks --out ./sales-pack
```

## The state model

SkillPack stores persistent metadata under `~/.skillpack/`:

| File | Purpose |
|---|---|
| `state.yaml` | Remembered workspaces and GitHub provider bindings |
| `installed.yaml` | Per-target install records (paths, versions, checksums) |
| `cache/` | Downloaded artifacts and temporary extract dirs |
| `workspaces/<owner>/<pack>/` | Default editable copies after `pull` |

### `state.yaml`

Workspaces and provider bindings, for example:

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

`status` and `workspace list` show workspace health (for example `clean`, `unpublished changes`, `behind remote`). For GitHub-backed workspaces, remote latest is checked by default.

### `installed.yaml`

Each install appends a record used by `list`, `sync`, `update`, `diff --installed`, and `uninstall`:

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

Important behavior:

- `~/.skillpack` is not the only place where packs can live.
- Existing local folders are supported and remain editable where they are.
- `pull` uses `~/.skillpack/workspaces/<owner>/<pack>` by default for convenience.
- `publish sales-pack` can resolve a remembered workspace by pack name, full pack id, or provider.
- GitHub release conflicts are checked against the remote repository, not only against local state.
- `install`, `sync`, and `update` read and update `installed.yaml`; they do not remove skills you added locally outside the pack unless you use `--force` where applicable.

Examples:

```bash
skillpack publish sales-pack
skillpack publish tiechui/sales-pack
skillpack publish github:tiechui/my-skillpacks
skillpack publish /absolute/path/to/sales-pack
```

## Pack manifest

Every pack has a `skillpack.yaml` file.

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

### Manifest fields

| Field | Required | Description |
|---|---:|---|
| `name` | Yes | Lowercase slug for the pack. Example: `sales-pack`. |
| `version` | Yes | SemVer version. Example: `0.1.0`. |
| `description` | Yes | Human-readable description. |
| `owner` | No | Person or organization namespace. Example: `tiechui`. |
| `displayName` | No | Friendly display name. |
| `visibility` | No | `private`, `unlisted`, `public`, or `team`. |
| `tags` | No | Search and organization tags. |
| `skills` | No | Skills included in the pack. Each skill points to a local path. |
| `shared.references` | No | Shared reference files used by the pack. |
| `shared.assets` | No | Shared assets used by the pack. |
| `targets` | No | Suggested install targets. |

## Command reference

### `skillpack scan [path]`

Scan a directory for skills. A skill is any folder containing `SKILL.md`.

```bash
skillpack scan
skillpack scan ~/.claude/skills
skillpack scan --agents
```

Options:

| Option | Description |
|---|---|
| `-a, --agents` | Scan common agent skill directories. |

### `skillpack create [name]`

Create a new skill pack directory and manifest.

```bash
skillpack create
skillpack create sales-pack
skillpack create sales-pack --owner tiechui --description "Sales skills"
```

Options:

| Option | Description |
|---|---|
| `-d, --description <description>` | Pack description. |
| `-o, --owner <owner>` | Owner namespace. |
| `--dir <dir>` | Output directory. |
| `--visibility <visibility>` | `private`, `unlisted`, `public`, or `team`. |

### `skillpack add [packDir] [skillDir]`

Add a local skill folder to a pack. The skill folder must contain `SKILL.md`.

```bash
skillpack add
skillpack add ./sales-pack ~/.claude/skills/customer-summary
skillpack add ./sales-pack ~/.claude/skills/customer-summary --name customer-summary
```

Options:

| Option | Description |
|---|---|
| `--name <name>` | Override the skill name when adding one skill. |
| `--copy` | Copy the skill into the pack. Enabled by default. |

### `skillpack audit [packDir]`

Audit a pack for manifest validity, missing files, and basic safety issues.

```bash
skillpack audit ./sales-pack
skillpack audit sales-pack
```

### `skillpack pack [packDir]`

Package a skill pack into a `.skillpack` artifact. Runs `audit` first; packaging fails if audit reports errors.

```bash
skillpack pack ./sales-pack
skillpack pack ./sales-pack --out dist
skillpack pack sales-pack --out dist
```

Options:

| Option | Description |
|---|---|
| `-o, --out <dir>` | Output directory for the `.skillpack` file. |

### `skillpack publish [packDir]`

Publish a pack locally or to GitHub Releases.

```bash
skillpack publish
skillpack publish ./sales-pack
skillpack publish ./sales-pack --out dist
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

Options:

| Option | Description |
|---|---|
| `-o, --out <dir>` | Output directory for local artifacts. Default: `dist`. |
| `--to <provider>` | `local` or `github`. |
| `--repo <owner/repo>` | GitHub repository. Required for first GitHub publish unless prompted. |
| `--token <token>` | GitHub token. Defaults to `GITHUB_TOKEN` or `GH_TOKEN`. |
| `--tag <tag>` | Release tag. Default: `<pack-name>-v<version>`. |
| `--release-name <name>` | GitHub release name. |
| `--body <markdown>` | GitHub release notes. |
| `--draft` | Create the release as a draft. |
| `--prerelease` | Mark release as prerelease. |
| `--overwrite` | Replace an existing release asset with the same file name. |
| `--dry-run` | Show what would be published without calling GitHub. |
| `--create-repo` | Create the GitHub repo if it does not exist. |
| `--public` | Create a new GitHub repo as public. |
| `--private` | Create a new GitHub repo as private. |
| `--bump <type>` | Bump version before publishing: `patch`, `minor`, or `major`. |
| `--no-state` | Do not record workspace/provider metadata under `~/.skillpack`. |
| `--registry <url>` | Legacy registry placeholder. |

Publishing behavior:

- On first GitHub publish, SkillPack records the repo binding in `~/.skillpack/state.yaml`.
- Later, `skillpack publish sales-pack` can reuse that binding.
- Before publishing, SkillPack checks whether the target GitHub release tag already exists remotely.
- If the tag exists, interactive mode asks whether to bump, overwrite, or cancel.

Examples:

```bash
skillpack publish sales-pack --bump patch
skillpack publish sales-pack --bump minor
skillpack publish sales-pack --overwrite
skillpack publish sales-pack --to github --repo tiechui/my-skillpacks --dry-run
```

### `skillpack upgrade [pack]`

Bump, audit, pack, and publish a GitHub-backed workspace in one step. Compares local content to the latest remote release; skips when nothing changed; can generate release notes.

```bash
skillpack upgrade sales-pack
skillpack upgrade sales-pack --bump patch
skillpack upgrade sales-pack --bump minor --yes
```

Options:

| Option | Description |
|---|---|
| `--bump <type>` | `patch`, `minor`, or `major` (required in non-interactive mode). |
| `-o, --out <dir>` | Output directory for the packaged artifact. |
| `--token <token>` | GitHub token. Defaults to `GITHUB_TOKEN` or `GH_TOKEN`. |
| `--release-name <name>` | GitHub release title. |
| `--body <markdown>` | Release notes (prompted or auto-generated if omitted). |
| `--draft` | Create a draft release. |
| `--prerelease` | Mark as prerelease. |
| `--overwrite` | Replace an existing release asset with the same file name. |
| `--dry-run` | Show what would be published without calling GitHub. |
| `-y, --yes` | Continue when the remote latest tag differs from what the workspace last saw. |

Requires a workspace with `provider.type: github` (from `pull` or `publish --to github`).

### `skillpack download [source]`

Download a `.skillpack` file from GitHub Releases without installing it.

```bash
skillpack download github:tiechui/my-skillpacks
skillpack download github:tiechui/my-skillpacks@sales-pack-v0.1.0
skillpack download https://github.com/tiechui/my-skillpacks --out downloads
```

Options:

| Option | Description |
|---|---|
| `-o, --out <dir>` | Output directory. Default: current directory. |
| `--token <token>` | GitHub token for private repos. Defaults to `GITHUB_TOKEN` or `GH_TOKEN`. |

### `skillpack install [source]`

Install a skill pack to one or more agent targets.

Accepted sources:

```text
./pack-directory
./pack.skillpack
github:owner/repo
github:owner/repo@tag
https://github.com/owner/repo
https://github.com/owner/repo/releases/tag/<tag>
```

Examples:

```bash
skillpack install ./dist/sales-pack-0.1.0.skillpack
skillpack install github:tiechui/my-skillpacks
skillpack install github:tiechui/my-skillpacks@sales-pack-v0.1.0
skillpack install github:tiechui/my-skillpacks --target claude
skillpack install github:tiechui/my-skillpacks --target claude --target cursor
skillpack install ./sales-pack --target local --target-dir ./tmp/skills
```

Options:

| Option | Description |
|---|---|
| `-t, --target <target>` | Target agent. Repeat to install to several targets. |
| `--target-dir <dir>` | Custom target directory. Best with `--target local`. |
| `--token <token>` | GitHub token for private repos. Defaults to `GITHUB_TOKEN` or `GH_TOKEN`. |
| `--overwrite` | Overwrite existing skill directories. |

Shows a security summary before copying skills. Uses manifest `targets` or detected agent directories as install defaults when `--target` is omitted.

### `skillpack sync [source]`

Sync an already installed pack with a newer release. Adds missing skills, updates outdated ones, and **preserves extra local skills** not in the pack. For GitHub sources, resolves the latest release automatically.

```bash
skillpack sync github:tiechui/my-skillpacks
skillpack sync github:tiechui/my-skillpacks --target claude
skillpack sync ./sales-pack-0.2.0.skillpack --target cursor --force
```

Options:

| Option | Description |
|---|---|
| `-t, --target <target>` | Limit to one install target. |
| `--target-dir <dir>` | Match a custom target directory from the install record. |
| `--token <token>` | GitHub token for private repos. |
| `--force` | Overwrite skills modified after install. |

### `skillpack update [pack]`

Update installed GitHub-backed packs to the latest release (by SemVer). Omit `pack` to check all GitHub installs.

```bash
skillpack update
skillpack update tiechui/sales-pack
skillpack update sales-pack --force
```

Options:

| Option | Description |
|---|---|
| `--token <token>` | GitHub token for private repos. |
| `--force` | Overwrite skills modified after install without prompting. |

### `skillpack pull [source]`

Download a GitHub release and extract it into an editable workspace. Alias: `clone`.

```bash
skillpack pull github:tiechui/my-skillpacks
skillpack pull github:tiechui/my-skillpacks@sales-pack-v0.1.0
skillpack pull https://github.com/tiechui/my-skillpacks --out ./sales-pack
```

Options:

| Option | Description |
|---|---|
| `-o, --out <dir>` | Workspace directory. Defaults to `~/.skillpack/workspaces/<owner>/<pack>`. |
| `--token <token>` | GitHub token for private repos. Defaults to `GITHUB_TOKEN` or `GH_TOKEN`. |
| `--overwrite` | Replace an existing workspace directory. |

After pulling:

```bash
skillpack status
skillpack publish sales-pack
```

### `skillpack open [pack]`

Open a remembered workspace in the system file manager or VS Code.

```bash
skillpack open sales-pack
skillpack open sales-pack --code
```

Options:

| Option | Description |
|---|---|
| `--code` | Open in VS Code (`code` on PATH). |

### `skillpack status [packDir]`

Show remembered workspaces, provider bindings, and workspace status (local vs remote version).

```bash
skillpack status
skillpack status sales-pack
skillpack status tiechui/sales-pack
skillpack status github:tiechui/my-skillpacks
```

Options:

| Option | Description |
|---|---|
| `--token <token>` | GitHub token. Defaults to `GITHUB_TOKEN` or `GH_TOKEN`. |

### `skillpack workspace`

Manage remembered workspaces.

#### `skillpack workspace list` (alias `ls`)

Same output as `skillpack status` for all workspaces.

```bash
skillpack workspace list
skillpack workspace ls --token $GITHUB_TOKEN
```

#### `skillpack workspace move <pack> <destination>`

Move a workspace directory on disk and update `state.yaml`.

```bash
skillpack workspace move sales-pack ~/Projects/sales-pack
skillpack workspace move sales-pack ./sales-pack --overwrite
```

Options:

| Option | Description |
|---|---|
| `--overwrite` | Replace a non-empty destination directory. |

### `skillpack bump [packDir] [type]`

Bump or set a pack version in `skillpack.yaml`.

```bash
skillpack bump sales-pack patch
skillpack bump sales-pack minor
skillpack bump sales-pack major
skillpack bump sales-pack --set 1.0.0
```

Options:

| Option | Description |
|---|---|
| `--set <version>` | Set an exact SemVer version. |

### `skillpack list`

List installed skill packs recorded by SkillPack.

```bash
skillpack list
```

### `skillpack diff [packDir]`

Compare a pack with an agent target directory, or with SkillPack install records.

```bash
skillpack diff sales-pack --target claude
skillpack diff sales-pack --installed
skillpack diff github:tiechui/my-skillpacks --installed --target cursor
```

Options:

| Option | Description |
|---|---|
| `-t, --target <target>` | Agent target when comparing against a skill directory. |
| `--target-dir <dir>` | Custom target skill directory. |
| `--installed` | Compare the pack source against `installed.yaml` (missing, outdated, extra local, modified). |
| `--token <token>` | GitHub token when the source is a GitHub ref. |

### `skillpack uninstall [pack]`

Uninstall a previously installed pack from an agent target. Aliases: `remove`, `rm`.

```bash
skillpack uninstall
skillpack uninstall tiechui/sales-pack
skillpack uninstall sales-pack --target claude
skillpack remove sales-pack --force
```

Options:

| Option | Description |
|---|---|
| `-t, --target <target>` | Limit uninstall to one target. |
| `--force` | Skip confirmation prompts. |

Uninstall uses SkillPack install records, so it avoids deleting unrelated folders. Warns when skills were modified after install.

### `skillpack doctor`

Check the local SkillPack environment: Node.js version, `~/.skillpack` paths, workspace and install counts, GitHub token env vars, and whether each agent skills directory exists.

```bash
skillpack doctor
```

## GitHub publishing workflow

### First publish

```bash
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

Output includes:

```text
Release: https://github.com/tiechui/my-skillpacks/releases/tag/sales-pack-v0.1.0
Download: https://github.com/tiechui/my-skillpacks/releases/download/sales-pack-v0.1.0/sales-pack-0.1.0.skillpack
Install command: skillpack install github:tiechui/my-skillpacks
```

### Publish an upgrade

Edit files in the workspace, then publish:

```bash
skillpack upgrade sales-pack
```

`upgrade` compares content to the latest GitHub release, runs audit, bumps the version, and publishes. You can also use `publish` directly:

```bash
skillpack publish sales-pack
```

If `sales-pack-v0.1.0` already exists on GitHub, `publish` prompts:

```text
Remote release tiechui/my-skillpacks@sales-pack-v0.1.0 already exists on GitHub.
What should happen?
- Bump patch -> 0.1.1
- Bump minor -> 0.2.0
- Bump major -> 1.0.0
- Keep version and overwrite the existing release asset
- Cancel
```

Non-interactive examples:

```bash
skillpack publish sales-pack --bump patch
skillpack publish sales-pack --bump minor
skillpack publish sales-pack --overwrite
```

### Work on a new computer

```bash
skillpack pull github:tiechui/my-skillpacks
skillpack status
skillpack publish sales-pack
```

Use `--out` if you want the editable copy somewhere else:

```bash
skillpack pull github:tiechui/my-skillpacks --out ./sales-pack
```

## GitHub token setup

For public repositories, installing does not require a token.

Publishing requires a token with permission to create releases and upload release assets in the target repository. For a fine-grained GitHub token, grant the target repository **Contents: read and write** permission.

SkillPack reads tokens in this order:

1. `--token <token>`
2. `GITHUB_TOKEN`
3. `GH_TOKEN`
4. Interactive masked prompt, when available

Examples:

```bash
export GITHUB_TOKEN=github_pat_xxx
skillpack publish ./sales-pack --to github --repo tiechui/my-skillpacks
```

PowerShell:

```powershell
$env:GITHUB_TOKEN="github_pat_xxx"
node .\dist\index.js publish .\sales-pack --to github --repo tiechui/my-skillpacks
```

## Repository layout

```text
.
├── src/
│   ├── commands/       # CLI commands
│   ├── core/           # pack, publish, install, state, GitHub logic
│   ├── adapters/       # target agent directory adapters
│   ├── types/          # zod schemas and shared types
│   └── utils/          # filesystem, prompts, errors
├── test/               # vitest tests
├── DESIGN.md           # design document
├── README.md
├── package.json
└── tsconfig.json
```

## Development

```bash
npm install
npm run build
npm test
npm run lint
npm run format
```

Run the CLI during development:

```bash
npm run dev -- scan
npm run dev -- publish ./sales-pack --to local
```

Build and run directly:

```bash
npm run build
node dist/index.js --help
```

## Safety notes

SkillPack can copy files into agent skill directories. Skills may contain instructions and scripts that run in your agent environment.

Before installing packs from people you do not trust:

```bash
skillpack download github:owner/repo
skillpack audit ./downloaded-pack
```

`install` and `update` also print an automated **security summary** (secret-like values, remote install commands, executable scripts, filesystem references). `audit` checks manifest validity, structure, and suspicious patterns; `pack` and `upgrade` block on audit errors.

Treat skills as executable behavior: inspect `SKILL.md` and bundled scripts before using them in sensitive environments.

## Contributing

Issues and pull requests are welcome.

Useful contribution areas:

- new target adapters;
- better Windows path handling;
- richer audit rules;
- registry provider adapters;
- documentation examples;
- tests for GitHub release edge cases.

Before opening a PR:

```bash
npm run build
npm test
npm run lint
```

## License

MIT. See [LICENSE](LICENSE).

## Friends

- [linuxdo](https://linux.do/) — Thanks to the site and its community users for the support and feedback.
