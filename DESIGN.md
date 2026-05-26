# SkillPack Manager Design Document

## 1. Product summary

SkillPack Manager is an open-source, local-first package manager for AI agent skill bundles. It lets users scan existing agent skills, bundle multiple skills into a reusable pack, publish/share that pack, install it into supported agents, and later audit, diff, update, or uninstall it.

The core idea is simple:

```text
single skill = one reusable capability
skill pack = a reproducible agent skill stack
```

The project is intentionally not a marketplace first. It is a packaging, installation, synchronization, and governance layer for skills that may live locally, in GitHub, in a private registry, or in a public registry.

## 2. Problem

Power users and teams often have different sets of skills installed across different agents:

```text
User A: 5 skills
User B: 7 skills
User C: 6 skills
```

Some skills are personal, but many should be shared across a team or reused by other agents. Without a pack manager, teams end up sending zip files, copying directories manually, or losing track of versions.

The real need is not just installing a single skill. The real need is:

- Share a full skill stack with one command.
- Install the same pack into Claude, Cursor, Codex, Windsurf, OpenCode, or a custom local agent.
- Know which skills are missing or modified.
- Lock versions and checksums so installs are reproducible.
- Audit skills before installation.
- Support private/team packs without requiring a public marketplace.

## 3. Target users

### 3.1 Individual power users

They want to share their personal agent setup:

```bash
skillpack scan ~/.claude/skills
skillpack create my-agent-stack
skillpack publish ./my-agent-stack
```

### 3.2 Teams

They want consistent agent behavior across members:

```bash
skillpack install machinesdeproduction/sales-pack --target cursor
skillpack diff ./sales-pack --target claude
```

### 3.3 Open-source maintainers

They want to publish packs around workflows:

- frontend pack
- data analysis pack
- startup founder pack
- product manager pack
- code review pack

### 3.4 Enterprise admins

They need audit, provenance, permissions, and drift detection.

## 4. Product principles

1. **Local-first**: users can pack, install, and audit without a hosted service.
2. **Manifest-driven**: every pack has `skillpack.yaml`.
3. **Reproducible**: installs record checksums and versions.
4. **Agent-agnostic**: adapters map packs to agent-specific skill directories.
5. **Safe by default**: audit before packing; avoid deleting locally modified skills.
6. **Registry-optional**: publishing can mean a local artifact, GitHub Release, private registry, or future public registry.
7. **Composable**: packs can later support imports, forks, shared references, and team policies.

## 5. Core concepts

### 5.1 Skill

A skill is a directory containing a `SKILL.md` file and optional supporting files.

Example:

```text
customer-summary/
  SKILL.md
  references/
  scripts/
  assets/
```

### 5.2 Skill Pack

A skill pack is a directory containing a manifest, one or more skills, and optional shared resources.

```text
sales-pack/
  skillpack.yaml
  skills/
    customer-summary/
      SKILL.md
    quote-review/
      SKILL.md
  shared/
    references/
      company-style.md
    assets/
      proposal-template.docx
```

### 5.3 Manifest

The manifest is the source of truth for a pack.

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
    checksum: sha256:...
  - name: quote-review
    path: skills/quote-review
shared:
  references:
    - shared/references/company-style.md
  assets: []
targets:
  - claude
  - cursor
```

### 5.4 Pack ID

Use npm/GitHub-style naming:

```text
owner/pack-name@version
```

Examples:

```text
tiechui/sales-pack@1.2.0
machinesdeproduction/support-pack@2.0.0
```

The unique constraints in a registry should be:

```text
(owner, name)
(owner, name, version)
```

### 5.5 Artifact

A `.skillpack` file is a zip archive with a custom extension. It contains:

```text
skillpack.yaml
skills/**
shared/**
```

## 6. MVP scope

The MVP should support the full local loop:

```text
scan existing skills
→ create pack
→ add skills
→ audit
→ pack artifact
→ install artifact into agent
→ list installed packs
→ diff pack vs target
→ uninstall safely
```

### P0 commands

```bash
skillpack scan [path]
skillpack create <name>
skillpack add <packDir> <skillDir>
skillpack audit <packDir>
skillpack pack <packDir>
skillpack install <source> --target <target>
skillpack list
skillpack diff <packDir> --target <target>
skillpack uninstall <packId>
```

### P1 commands

```bash
skillpack publish <packDir>
skillpack download <source>
skillpack update <packId>
skillpack sync <packDir> --target <target>
skillpack fork <source> <newName>
```

In this codebase, `publish` is local-first and creates a distributable artifact. Remote registry upload is intentionally left as an adapter.

## 7. User flows

### 7.1 Publisher flow

```bash
skillpack scan ~/.claude/skills
skillpack create sales-pack --owner tiechui --description "Sales and customer follow-up skills."
skillpack add ./sales-pack ~/.claude/skills/customer-summary
skillpack add ./sales-pack ~/.claude/skills/quote-review
skillpack audit ./sales-pack
skillpack pack ./sales-pack --out dist
```

Result:

```text
dist/sales-pack-0.1.0.skillpack
```

### 7.2 Installer flow

```bash
skillpack install ./dist/sales-pack-0.1.0.skillpack --target claude
skillpack install ./dist/sales-pack-0.1.0.skillpack --target cursor
```

### 7.3 Team drift detection flow

```bash
skillpack diff ./sales-pack --target claude
```

Output categories:

- Present
- Missing
- Modified

### 7.4 Safe uninstall flow

```bash
skillpack uninstall tiechui/sales-pack --target claude
```

The tool refuses to remove a skill if its checksum differs from the recorded install checksum.

## 8. CLI architecture

The CLI is written in Node.js and TypeScript.

Recommended libraries:

- `commander`: command routing and help output
- `zod`: manifest validation
- `yaml`: YAML parsing and writing
- `fs-extra`: file operations
- `fast-glob`: skill discovery
- `adm-zip`: `.skillpack` archive creation/extraction
- `chalk`: terminal colors
- `ora`: progress feedback
- `inquirer`: future interactive selection

### Directory layout

```text
src/
  index.ts
  commands/
    scan.ts
    create.ts
    add.ts
    audit.ts
    pack.ts
    publish.ts
    download.ts
    install.ts
    list.ts
    uninstall.ts
    diff.ts
  core/
    manifest.ts
    scanner.ts
    audit.ts
    packer.ts
    installer.ts
    registry.ts
    diff.ts
  adapters/
    targets.ts
  types/
    schema.ts
  utils/
    fs.ts
    skill.ts
    errors.ts
```

## 9. Agent target adapters

A target adapter defines where skills should be installed.

Initial targets:

```text
claude   -> ~/.claude/skills
cursor   -> ~/.cursor/skills
codex    -> ~/.codex/skills
windsurf -> ~/.windsurf/skills
opencode -> ~/.config/opencode/skills
openclaw -> ~/.openclaw/skills
gemini   -> ~/.gemini/skills
cline    -> ~/.cline/skills
copilot  -> ~/.copilot/skills
agents   -> ~/.agents/skills
goose    -> ~/.config/goose/skills
pi       -> ~/.pi/agent/skills
local    -> ./skills
```

Users can override paths:

```bash
skillpack install ./pack.skillpack --target local --target-dir ./tmp/skills
```

Future adapters can support:

- platform-specific config files
- API-based installation
- import/export formats
- MCP-based installation

## 10. Installed database

The CLI records installations at:

```text
~/.skillpack/installed.yaml
```

Example:

```yaml
- pack: tiechui/sales-pack
  version: 0.1.0
  target: claude
  installedAt: 2026-05-26T00:00:00.000Z
  source: ./dist/sales-pack-0.1.0.skillpack
  skills:
    - name: customer-summary
      path: /Users/me/.claude/skills/customer-summary
      checksum: sha256:...
```

This enables:

- list
- uninstall
- modified file detection
- future update/diff/sync

## 11. Audit design

`skillpack audit` performs static checks.

MVP checks:

- manifest exists
- manifest schema is valid
- pack has at least one skill
- every skill has `SKILL.md`
- skill names are unique
- `SKILL.md` has frontmatter
- description is not missing or too short
- suspicious `curl | bash` / `wget | bash`
- secret-like values
- broad destructive delete commands

Future checks:

- trigger overlap detection
- semantic duplicate detection
- unsafe tool-use instructions
- package size limit
- SPDX license detection
- script dependency inventory
- provenance attestation
- signature verification

## 12. Registry design

The MVP does not require a hosted registry. A future registry can be added with these resources:

### Tables

```text
users
- id
- username
- display_name

packs
- id
- owner_id
- slug
- display_name
- description
- visibility
- latest_version

pack_releases
- id
- pack_id
- version
- artifact_url
- checksum
- manifest_json
- created_at

skills
- id
- release_id
- name
- path
- checksum
```

### API

```text
POST /api/packs
POST /api/packs/:owner/:slug/releases
GET  /api/packs/:owner/:slug
GET  /api/packs/:owner/:slug/releases/:version
GET  /api/packs/:owner/:slug/download
```

### Auth

Recommended auth options:

- GitHub OAuth for open source
- Google Workspace for teams
- API tokens for CI/CD

## 13. Sharing model

Visibility options:

```text
private  -> owner only
unlisted -> anyone with link
team     -> team members
public   -> searchable
```

Sharing URL:

```text
https://skillpack.dev/tiechui/sales-pack
https://skillpack.dev/tiechui/sales-pack/releases/1.2.0
```

Install command:

```bash
skillpack install tiechui/sales-pack
skillpack install tiechui/sales-pack@1.2.0
```

## 14. Versioning

Use semantic versioning:

```text
major.minor.patch
```

Recommended policy:

- patch: typo fixes and small instruction edits
- minor: new skills or backward-compatible behavior changes
- major: renamed skills, removed skills, or large behavior changes

Future lockfile:

```yaml
pack: tiechui/sales-pack
version: 1.2.0
resolved:
  customer-summary:
    version: 1.0.0
    checksum: sha256:...
```

## 15. Security model

Threats:

- malicious skill instructions
- embedded secrets
- scripts that exfiltrate data
- remote shell downloads
- destructive shell snippets
- typosquatting pack names
- supply chain attacks via registry artifacts

Mitigations:

- local-first install option
- audit before pack
- checksum recording
- refuse to uninstall modified files
- future signed releases
- future registry provenance metadata
- future sandboxing guidance for script execution

## 16. Production roadmap

### v0.1 Local-first CLI

- scan
- create
- add
- audit
- pack
- install local artifact
- list
- uninstall
- diff

### v0.2 Better authoring

- interactive create
- import from existing agent
- lockfile
- update
- sync
- fork/remix

### v0.3 Registry adapters

- GitHub Release adapter
- HTTP registry adapter
- S3/R2 artifact adapter
- signed manifests

### v0.4 Team workflows

- private packs
- team membership
- role-based publishing
- team diff dashboard
- approvals
- audit reports

## 17. Why this can be an open-source project

The tool handles local skill files, private instructions, and company workflow assets. A local-first open-source CLI gives users confidence and makes adoption easier than a closed hosted service. A hosted registry can come later without making the CLI dependent on it.


## GitHub Release Publishing

The CLI supports GitHub Releases as the first remote publishing adapter. The flow is:

1. Audit and package the skill pack into a `.skillpack` artifact.
2. Resolve the release tag, defaulting to `<pack-name>-v<version>`.
3. Create the GitHub release if it does not exist.
4. Upload the artifact as a release asset.
5. Refuse to overwrite an existing asset unless `--overwrite` is provided.

Command example:

```bash
export GITHUB_TOKEN=github_pat_xxx
skillpack publish ./sales-pack --to github --repo owner/repo --overwrite
```

The implementation uses Node 20 built-in `fetch` and does not require Octokit. This keeps the CLI dependency surface small and makes future adapters easy to add.

## v0.3 Interactive CLI Experience

The CLI is designed for both ordinary users and automation:

- If a required command argument is omitted in an interactive terminal, the command opens a guided prompt.
- If the same command is run in CI or a non-TTY environment, it fails fast and asks the caller to pass explicit arguments.
- Scriptable flags remain stable, so examples can be copied into CI, shell scripts, or documentation.

Interactive commands:

- `skillpack scan` opens a checkbox picker for common agent skill directories plus current/custom paths.
- `skillpack create` asks for pack name, description, owner namespace, and visibility.
- `skillpack add` asks for the pack directory, scans common agent directories, and lets the user select multiple skills.
- `skillpack publish` asks for local vs GitHub Release publishing and prompts for the GitHub repo when needed.
- `skillpack install <artifact>` lets the user select one or more target agents.
- `skillpack diff` asks for the pack directory and target agent.
- `skillpack audit` asks for the pack directory.
- `skillpack uninstall` shows installed pack records and lets the user choose which ones to remove.

Supported built-in target directories are implemented in `src/adapters/targets.ts` and currently include Claude Code, Cursor, Codex, Windsurf, OpenCode, and a local directory.

## Stateful publishing and workspace model

A one-shot publish flow is not sufficient for maintaining a pack over time. The CLI now treats a pack directory as a workspace and persists provider bindings in `~/.skillpack/state.yaml`.

### Source of truth

- GitHub Releases are the remote distribution source of truth for published versions.
- The local workspace is the editable source of truth for the next unpublished version.
- `~/.skillpack/state.yaml` is only an index that remembers where local workspaces live and which provider they are bound to.
- `~/.skillpack/cache` is only a cache for downloads and temporary extraction.
- `~/.skillpack/workspaces/<owner>/<pack>` is the default location for `pull`, but users can keep workspaces anywhere via `--out` or by publishing an existing directory.

### Remote version checks

Before publishing to GitHub, the CLI checks the remote release tag through the GitHub API. It does not rely on local state to decide whether a version already exists. If the tag exists, interactive users are prompted to bump patch/minor/major, overwrite the existing asset, or cancel. Non-interactive users must pass `--bump`, `--tag`, or `--overwrite` explicitly.

### Maintainer flows

First publish:

```bash
skillpack publish ./sales-pack --to github --repo owner/repo
```

Repeated publish from the same machine:

```bash
skillpack publish ./sales-pack
```

Recover/edit from a new machine:

```bash
skillpack pull github:owner/repo
skillpack publish <pack-name>
```

Workspace references are resolved from `~/.skillpack/state.yaml`. A command argument can be a real path, pack name, full `owner/name`, provider reference such as `github:owner/repo`, or the workspace directory basename. If the reference is ambiguous, the CLI shows the matching workspaces and asks the user to use a full id or path.

Explicit workspace location:

```bash
skillpack pull github:owner/repo --out ./sales-pack
```
