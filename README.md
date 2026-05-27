<div align="center">

<pre>
  ____  _    _ _ _ ____            _    
 / ___|| | _(_) | |  _ \ __ _  ___| | __
 \___ \| |/ / | | | |_) / _` |/ __| |/ /
  ___) |   <| | | |  __/ (_| | (__|   < 
 |____/|_|\_\_|_|_|_|   \__,_|\___|_|\_\
</pre>

<strong>SkillPack CLI</strong><br/>
Open-source package manager for AI agent skills

<br/>

**English** | [中文](README.zh-CN.md)

<br/>

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

<br/>

```bash
npm i -g @t59688/skillpack
```

</div>

---

**SkillPack CLI** is an open-source package manager for AI agent skills.

It lets you scan local agent skill folders, bundle multiple skills into a reproducible **skill pack**, publish that pack to GitHub Releases, install other people's packs, and keep editable workspaces synced across machines.

Think of it as a lightweight package manager for your AI agent skill stack:

```bash
skillpack scan
skillpack create
skillpack add
skillpack publish
skillpack install github:owner/repo
skillpack pull github:owner/repo
skillpack publish my-pack
```

## Why SkillPack?

AI agent skills often start as local folders copied between tools such as Claude Code, Cursor, Codex, Windsurf, OpenCode, OpenClaw, Gemini CLI, Cline, GitHub Copilot, Goose, Pi, or custom agents. That becomes hard to manage when:

- you have many skills spread across several agents;
- you want to share a curated set of skills with someone else;
- a team needs the same skills installed consistently;
- you want to publish a new version without manually editing release tags;
- you switch to a new computer and need to pull, edit, and republish a pack.

SkillPack focuses on this workflow:

```text
scan local skills -> create a pack -> publish to GitHub -> install anywhere -> pull as workspace -> update and republish
```

## Features

- Interactive prompts for everyday usage.
- Scriptable commands for CI and power users.
- Scan common agent skill directories.
- Create `skillpack.yaml` manifests.
- Add one or many skills into a pack.
- Package packs as `.skillpack` artifacts.
- Publish packs to GitHub Releases.
- Create a GitHub repo during publish when it does not exist.
- Install packs from local folders, `.skillpack` files, GitHub repos, or GitHub release URLs.
- Pull a GitHub release into an editable local workspace.
- Remember workspace and provider bindings in `~/.skillpack/state.yaml`.
- Publish upgrades without re-entering the GitHub repo every time.
- Check remote GitHub release tags before republishing the same version.
- Bump pack versions with `patch`, `minor`, or `major`.
- Diff local packs against installed agent directories.
- Audit packs for structure and basic safety issues.
- Uninstall only the skills previously installed by SkillPack.

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

Use the global install command shown at the top of this README, then verify:

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

SkillPack stores persistent metadata in:

```text
~/.skillpack/state.yaml
```

This file records local workspaces and provider bindings, for example:

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

Important behavior:

- `~/.skillpack` is not the only place where packs can live.
- Existing local folders are supported and remain editable where they are.
- `pull` uses `~/.skillpack/workspaces/<owner>/<pack>` by default for convenience.
- `publish sales-pack` can resolve a remembered workspace by pack name, full pack id, or provider.
- GitHub release conflicts are checked against the remote repository, not only against local state.

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

Package a skill pack into a `.skillpack` artifact.

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

### `skillpack pull [source]`

Download a GitHub release and extract it into an editable workspace.

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

### `skillpack status [packDir]`

Show remembered workspaces and provider bindings.

```bash
skillpack status
skillpack status sales-pack
skillpack status tiechui/sales-pack
skillpack status github:tiechui/my-skillpacks
skillpack status sales-pack --remote
```

Options:

| Option | Description |
|---|---|
| `--remote` | Also check whether the current GitHub release tag exists remotely. |
| `--token <token>` | GitHub token. Defaults to `GITHUB_TOKEN` or `GH_TOKEN`. |

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

Compare a pack with an installed target skill directory.

```bash
skillpack diff
skillpack diff sales-pack --target claude
skillpack diff sales-pack --target cursor
skillpack diff sales-pack --target local --target-dir ./tmp/skills
```

Options:

| Option | Description |
|---|---|
| `-t, --target <target>` | Any supported target id (see table above), including `openclaw`, `gemini`, `cline`, `copilot`, `agents`, `goose`, and `pi`. |
| `--target-dir <dir>` | Custom target skill directory. |

### `skillpack uninstall [pack]`

Uninstall a previously installed pack from an agent target.

```bash
skillpack uninstall
skillpack uninstall tiechui/sales-pack
skillpack uninstall sales-pack --target claude
```

Options:

| Option | Description |
|---|---|
| `-t, --target <target>` | Limit uninstall to one target. |

Uninstall uses SkillPack install records, so it avoids deleting unrelated folders.

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

Edit files in the workspace, then run:

```bash
skillpack publish sales-pack
```

If `sales-pack-v0.1.0` already exists on GitHub, SkillPack prompts:

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

SkillPack can copy files into agent skill directories. Before installing packs from people you do not trust:

```bash
skillpack download github:owner/repo
skillpack audit ./downloaded-pack
```

Current audit checks are intentionally lightweight. Treat skills as executable behavior: inspect instructions and scripts before using them in sensitive environments.

## Roadmap

- Remote registry backend beyond GitHub Releases.
- Pack signing and provenance metadata.
- Stronger policy and security scanning.
- Team dashboards and drift detection.
- Workspace lockfiles.
- More agent adapters.
- Import/export compatibility with other skill ecosystems.

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
