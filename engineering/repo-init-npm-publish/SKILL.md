---
name: Repo Init npm Publish
description: Scaffold publishable npm packages and CLI tools for the GitLab npm registry (like ai-plattform/tools), including glab project setup with user approval, repo-init conventions, shared CI, and release credentials. Use when creating a new npm package or CLI tool that publishes to the registry — not for private npm apps that never publish.
tags: [engineering, npm, gitlab, tooling, setup, release, publish]
audience: [engineers, tech-leads]
status: stable
---

# Repo Init npm Publish

Scaffold a new **publishable** Singleton SD npm package — a CLI tool or library consumed via the GitLab npm registry (for example `tools/pdf-shrink`, `tools/pdf-context`).

This is the publishable-npm extension of [`engineering/repo-init`](../repo-init/SKILL.md). Use `repo-init` alone for repos that do not publish to the npm registry.

This skill composes:

- [`engineering/repo-init`](../repo-init/SKILL.md) — husky, commitlint, release-it
- [`engineering/git-conventions`](../git-conventions/SKILL.md) — commits, branches, tickets
- [`engineering/scripts/gitlab-credentials-helper`](https://gitlab.com/singleton-sd/engineering/scripts/gitlab-credentials-helper) — one-time release CI credentials

---

## Before starting — gather inputs

Confirm with the user:

| Input | Example |
|-------|---------|
| **Package name** (npm) | `@singleton-sd/ai-plattform-tools-pdf-shrink` |
| **CLI binary name** (if tool) | `pdf-shrink` |
| **GitLab full path** | `singleton-sd/ai-plattform/tools/pdf-shrink` |
| **Ticket prefix** | `AI`, `SSDOP` |
| **Umbrella / parent group** | `singleton-sd/ai-plattform/tools` |
| **Node engine** | `>=20.19.0` (default) |
| **Publish to npm registry?** | yes (required — this skill is only for publishable packages) |
| **Local directory** | `tools/pdf-shrink` or standalone clone path |
| **Description** | One-line package description |
| **Linked skill** (optional) | `documents/pdf-shrink` |

Reference existing tools for naming and layout:

- `ai-plattform/tools/pdf-shrink`
- `ai-plattform/tools/pdf-context`
- `ai-plattform/tools/pdf-to-markdown`

**Naming convention (ai-plattform PDF tools):** use the `pdf-<action>` prefix for CLI binaries, repo folders, and skills — for example `pdf-shrink`, `pdf-context`, `pdf-to-markdown`. npm package: `@singleton-sd/ai-plattform-tools-pdf-<action>`. Do not use reversed names like `shrink-pdf`.

---

## GitLab CLI gate — mandatory confirmation

**Never run `glab` commands that create or mutate GitLab resources without explicit user approval.**

### Workflow

1. **Discover** current GitLab state with read-only commands (safe to run):

   ```bash
   glab auth status
   glab repo view singleton-sd/ai-plattform/tools/pdf-shrink 2>&1
   glab api /groups/singleton-sd%2Fai-plattform%2Ftools 2>&1
   ```

2. **Draft** the exact commands needed (subgroups, project, clone). Present them in a numbered plan:

   ```text
   Planned GitLab commands (review before I run anything):

   1. Create subgroup (only if missing):
      glab api -X POST groups \
        --field name=tools \
        --field path=tools \
        --field parent_id=<AI-PLATTFORM_GROUP_ID>

   2. Create project:
      glab repo create pdf-shrink \
        --group singleton-sd/ai-plattform/tools \
        --description "Shrink PDF files locally" \
        --defaultBranch main

   3. Clone locally:
      glab repo clone singleton-sd/ai-plattform/tools/pdf-shrink tools/pdf-shrink
   ```

3. **Stop and ask**: "Approve these commands? Reply with the numbers to run (e.g. `1,2,3`), edit them, or say `skip GitLab`."

4. **Execute only approved commands**, one at a time. Re-check existence before create steps.

5. **Report results** after each command (URL, group ID, errors).

### Subgroup creation

`glab` has no dedicated `group create` command. Use the API when a parent path does not exist:

```bash
# Read-only: resolve parent group ID
glab api /groups/singleton-sd%2Fai-plattform

# Create subgroup (requires approval first)
glab api -X POST groups \
  --field name=tools \
  --field path=tools \
  --field parent_id=<PARENT_GROUP_ID>
```

URL-encode nested paths with `%2F` when querying: `singleton-sd%2Fai-plattform%2Ftools`.

### Project creation

Prefer `glab repo create` with `--group`:

```bash
glab repo create <project-name> \
  --group <namespace-or-group-path> \
  --description "<description>" \
  --defaultBranch main
```

Or pass the full path:

```bash
glab repo create singleton-sd/ai-plattform/tools/<project-name> \
  --description "<description>" \
  --defaultBranch main
```

Use `--skipGitInit` when scaffolding files locally first, then add `origin` manually.

---

## Scaffold the package

### 1. Initialize git (if not cloned from GitLab)

```bash
git init
git checkout -b main
```

### 2. Create `package.json`

Use ESM (`"type": "module"`) — matches current tools. Write as **UTF-8 without BOM** (see [`engineering/repo-init`](../repo-init/SKILL.md) — PowerShell `Set-Content -Encoding utf8` adds a BOM that breaks `release-it` in CI).

```json
{
  "name": "@singleton-sd/ai-plattform-tools-<name>",
  "version": "0.1.0",
  "type": "module",
  "description": "<description>",
  "license": "Apache-2.0",
  "bin": {
    "<cli-name>": "./<entry>.mjs"
  },
  "scripts": {
    "<primary>": "node <entry>.mjs",
    "build-all": "echo 'Building all...'",
    "test": "node <entry>.mjs <minimal-smoke-args>",
    "prepare": "husky",
    "release": "release-it -VV --dry-run",
    "release:ci": "release-it --ci"
  },
  "engines": {
    "node": ">=20.19.0"
  },
  "files": [
    "<entry>.mjs",
    "lib/",
    "README.md"
  ],
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://gitlab.com/<GITLAB_PROJECT_PATH>.git"
  }
}
```

Omit `bin` for library-only packages. Add `dependencies` / `devDependencies` as needed.

### 3. Add `.gitignore`

```gitignore
node_modules/
.DS_Store
*.log
.env
.env.*
```

If using `*.lock` elsewhere, add `!yarn.lock` so the lockfile is committed.

### 4. Add `README.md`

Include:

- Purpose and link to the consuming skill (if any)
- `singleton-sd/ai-plattform` umbrella link
- Prerequisites (Node version)
- Local install (`git clone`, `yarn install`)
- GitLab npm registry `.npmrc` scope line using the encoded project path
- CLI usage examples with quoted Windows paths

Registry scope template:

```ini
@singleton-sd:registry=https://gitlab.com/api/v4/projects/<URL_ENCODED_GITLAB_PATH>/packages/npm/
```

Example: `singleton-sd%2Fai-plattform%2Ftools%2Fpdf-shrink`.

### 5. Add `.gitlab-ci.yml`

```yaml
image: 'node:22-alpine'

include:
  - project: 'singletonsd/pipelines/npm'
    file: '/src/.gitlab-ci-main.yml'

variables:
  GLOBAL_IMAGE_NAME: 'node'
  GLOBAL_IMAGE_TAG: '22-alpine'
  ORIGINAL_REPOSITORY: '<GITLAB_PROJECT_PATH>'
  ENABLE_RELEASE_JOB: 'true'
  ENABLE_RELEASE_PUBLISH: 'true'
  NODE_COMMON_RELEASE_TRIGGER_PIPELINE: 'true'
  PAGES_ENABLED: 'false'

stages:
  - install
  - test_static
  - test_dynamic
  - build
  - deploy
  - release
  - package

test:
  stage: test_dynamic
  script:
    - yarn test

release_job:
  dependencies: []
```

Set `ENABLE_RELEASE_PUBLISH: 'false'` only when the package must not publish to npm.

### 6. Wire git remote

After GitLab project exists:

```bash
git remote add origin git@gitlab.com:<GITLAB_PROJECT_PATH>.git
```

---

## Apply repo-init (ESM adaptations)

Read and follow [`engineering/repo-init`](../repo-init/SKILL.md) with these ESM-specific defaults:

| repo-init default | npm package default |
|-------------------|---------------------|
| TypeScript hooks (`.ts` + `ts-node`) | `.mjs` hooks called with `node` |
| `.commitlintrc.js` | `.commitlintrc.cjs` |
| `npm.publish: false` | `npm.publish: true` in `.release-it.json` when publishing |

### Dependencies

```bash
yarn add -D \
  husky@^9 \
  @commitlint/cli@^19 \
  @commitlint/config-conventional@^19 \
  release-it@^20 \
  @release-it/conventional-changelog@^11 \
  conventional-changelog-conventionalcommits@^9
```

Add `resolutions` for `conventional-changelog-conventionalcommits` (matches existing tools).

### Husky hooks (ESM / Windows-safe)

Use `node` paths instead of `yarn ts-node`:

**`.husky/commit-msg`**

```sh
. "$(dirname "$0")/husky-use-node.sh"

node .husky/prepare-commit-msg.mjs "$1"
node ./node_modules/@commitlint/cli/cli.js --edit "$1"
```

**`.husky/pre-commit`**

```sh
. "$(dirname "$0")/husky-use-node.sh"

node .husky/check-filenames.mjs
```

Port `prepare-commit-msg`, `check-branch`, and `check-filenames` logic from repo-init as `.mjs` files (no TypeScript types). Copy from an existing tool repo when available.

### `.release-it.json`

```json
{
  "$schema": "https://unpkg.com/release-it/schema/release-it.json",
  "gitlab": { "release": true },
  "git": {
    "commitMessage": "chore: Release v${version}\n\n[skip ci]",
    "requireCleanWorkingDir": true,
    "commit": true,
    "push": true,
    "tag": true
  },
  "npm": { "publish": true },
  "plugins": {
    "@release-it/conventional-changelog": {
      "infile": "CHANGELOG.md",
      "preset": {
        "name": "conventionalcommits"
      },
      "context": {
        "compareUrlFormat": "{{host}}/{{owner}}/{{repository}}/compare/{{currentTag}}..{{previousTag}}"
      }
    }
  }
}
```

### `.gitattributes`

```gitattributes
* text=auto

.husky/* text eol=lf
*.sh text eol=lf
package.json text eol=lf
```

---

## Release credentials (gitlab-credentials-helper)

Run **once per project** after the GitLab repo exists and `origin` is set.

### 1. Create `.env` in the target project (do not commit)

```env
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

Token needs `api` scope and Maintainer access on the project.

### 2. Run the helper

From the **target project root**:

```bash
# Local clone of the helper (build first)
npx --prefix <path-to-engineering>/scripts/gitlab-credentials-helper setup-git-release-credentials
```

Or after installing the published package:

```bash
yarn add -D @singleton-sd/scripts-gitlab-credentials-helper
npx setup-git-release-credentials
```

### 3. Verify in GitLab

- **Settings → Repository → Deploy keys** — `GITLAB_RELEASE_CI_CD` with write access
- **Settings → CI/CD → Variables** — `SSH_PRIVATE_KEY` and `GITLAB_TOKEN` (protected)

See the [helper README](https://gitlab.com/singleton-sd/engineering/scripts/gitlab-credentials-helper/-/blob/main/README.md) for overrides and security notes.

---

## First commit and branch

Follow [`engineering/git-conventions`](../git-conventions/SKILL.md).

**Default:** feature branch + MR:

```bash
git checkout -b feature/<TICKET>-<slug>
git add .
git commit -m "feat: <TICKET> Scaffold <package-name> npm tool"
git push -u origin feature/<TICKET>-<slug>
```

**When the user asks to commit directly to `main`/`master`:** skip feature branches — commit on the default branch with the ticket in the message:

```bash
git checkout main   # or master
git add .
git commit -m "feat: <TICKET> Scaffold <package-name> npm tool"
```

Do not commit unless the user explicitly asks.

---

## Verification checklist

- [ ] GitLab subgroup/project created (user approved `glab` commands)
- [ ] `package.json` name, `repository`, and `bin` are correct
- [ ] `.gitlab-ci.yml` `ORIGINAL_REPOSITORY` matches GitLab path
- [ ] Husky hooks run (`yarn prepare`, test a commit message)
- [ ] `yarn test` passes smoke test
- [ ] `yarn release` dry-run succeeds
- [ ] `package.json` has no UTF-8 BOM (first byte is `{`, not `EF BB BF`)
- [ ] Release credentials configured via `setup-git-release-credentials`
- [ ] README documents npm registry install with correct `.npmrc` scope
- [ ] `.env` is gitignored and not staged

---

## Task progress template

Copy when executing:

```text
Repo Init npm Publish:
- [ ] Gather inputs
- [ ] Discover GitLab state (read-only glab)
- [ ] Present planned glab commands → user approval
- [ ] Create subgroup/project (approved only)
- [ ] Scaffold package files
- [ ] Apply repo-init (ESM)
- [ ] Configure gitlab-credentials-helper
- [ ] Verify checklist
```
