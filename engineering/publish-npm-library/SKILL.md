---
name: Publish npm Library
description: >-
  Publish a public @singleton-sd TypeScript library to npmjs.org with Trusted
  Publishing (OIDC) from GitHub Actions — no long-lived NPM_TOKEN, no Azure Key
  Vault publish secret, no 2FA-bypass automation tokens. Use when setting up npm
  releases for a client/library package, wiring release-it + release.yml,
  adapting a pnpm monorepo path-aware release, or when an agent would otherwise
  invent a token-based publish path.
tags: [engineering, npm, npmjs, trusted-publishing, oidc, github, release, library, monorepo]
audience: [engineers, tech-leads]
status: stable
---

# Publish npm Library

Stand up and publish a **public** `@singleton-sd/<name>` library to **npmjs.org**
using **Trusted Publishing (OIDC)** from GitHub Actions.

Canonical references (live):

| Shape | Package / repo |
| --- | --- |
| Single package + release-it | [`@singleton-sd/inkads-epaper-renderer`](https://www.npmjs.com/package/@singleton-sd/inkads-epaper-renderer) — [`poc-inkads-epaper-renderer`](https://github.com/singleton-sd/poc-inkads-epaper-renderer) |
| pnpm monorepo + path-aware release | [`@singleton-sd/post-kit-*`](https://www.npmjs.com/org/singleton-sd) — [`post-kit`](https://github.com/singleton-sd/post-kit) (`release.yml` + `scripts/release-changed.mjs` / `publish-npm.mjs`) |

Docs: [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/),
[release-it npm / OIDC](https://github.com/release-it/release-it/blob/main/docs/npm.md).

## When to use this vs related skills

| Goal | Skill |
|------|--------|
| Public library on **npmjs** via **OIDC** (GitHub Actions) | **This skill** |
| Product brand-assets repo (Pages + snapshots + App-token release) | [`engineering/set-up-product-assets-repo`](../set-up-product-assets-repo/SKILL.md) |
| CLI/tool on **GitLab Package Registry** (± token npmjs) | [`engineering/repo-init-npm-publish`](../repo-init-npm-publish/SKILL.md) + [`engineering/pipelines-npm`](../pipelines-npm/SKILL.md) |
| Husky / commitlint / release-it only (no publish) | [`engineering/repo-init`](../repo-init/SKILL.md) |

Do **not** mix paths: do not add `NPMJS_TOKEN` / Azure Key Vault publish secrets
when Trusted Publishing is the auth model.

---

## Gather inputs

Confirm with the user:

| Input | Example |
|-------|---------|
| **Package name(s)** | `@singleton-sd/inkads-epaper-renderer` or several `@singleton-sd/post-kit-*` |
| **GitHub org/repo** | `singleton-sd/poc-inkads-epaper-renderer` |
| **Default branch** | `main` (confirm — do not assume) |
| **Package manager** | `pnpm` (preferred for client libs) or `yarn`/`npm` |
| **Repo shape** | Single package **or** pnpm workspace monorepo |
| **License** | Proprietary → `SEE LICENSE IN LICENSE` + `LICENSE` file |

Substitute the confirmed **default branch** everywhere the examples use
`<default-branch>` (workflow trigger, concurrency group, fetch/checkout, and
release-it `requireBranch`). Do not hard-code `main` unless that is the
confirmed default.

---

## Package contract

`package.json` must satisfy all of:

```json
{
  "name": "@singleton-sd/<name>",
  "version": "0.1.0",
  "license": "SEE LICENSE IN LICENSE",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/singleton-sd/<repo>.git"
  },
  "files": [
    "dist",
    "!dist/**/*.spec.js",
    "!dist/**/*.spec.js.map",
    "!dist/**/*.spec.d.ts",
    "!dist/**/*.spec.d.ts.map",
    "!dist/fixtures/**",
    "LICENSE",
    "README.md",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "prepublishOnly": "pnpm build",
    "release": "release-it -VV --dry-run --ci",
    "release:ci": "release-it --ci"
  }
}
```

Rules:

- Scoped name `@singleton-sd/<name>` — never invent a second name for npmjs
- **Remove** `"private": true`
- `publishConfig.access: "public"` (add `registry` only if you must pin; prefer default npmjs)
- Optional `publishConfig.provenance: true` is **CI / OIDC–oriented**. It breaks
  interactive laptop publish (`Automatic provenance generation not supported
  for provider: null`). Keep it for GHA; strip only for local first-publish
  bootstrap if needed, then restore.
- `files` allowlist with **negated** `*.spec.*` / fixtures so tests never ship
- `prepublishOnly` runs the build
- Proprietary packages use `SEE LICENSE IN LICENSE` — **not** `UNLICENSED` (that blocks public installability)
- `repository.url` must **exactly** match the GitHub repo (OIDC / provenance requirement)
- UTF-8 **without BOM** on `package.json`

---

## Trusted Publishing setup (one-time per package)

npm cannot attach a trusted publisher until the package exists on the registry.
A **maintainer** publishes a placeholder (typically **`0.0.0`**) locally once
(see [First-publish bootstrap](#first-publish-bootstrap)), then adds the
publisher below. Agents do not use a laptop npm token for that placeholder.

Install the org **singleton-release** GitHub App on the repo before merge. Set
`vars.RELEASE_APP_ID` and `secrets.RELEASE_APP_PRIVATE_KEY`. Put that App on
the default-branch ruleset bypass list (CodeRabbit required). There is **no**
`GITHUB_TOKEN` or PAT fallback for the release push.

### 1. npmjs.com — form fields

On **each** package (Settings → Trusted publisher → GitHub Actions → Add):

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization / user | `singleton-sd` |
| Repository | `<repo>` **name only** (e.g. `post-kit`, not `singleton-sd/post-kit`) |
| Workflow filename | `release.yml` **filename only** (not `.github/workflows/…`) |
| Environment | **leave empty** unless the workflow actually uses a GitHub Environment |
| Allowed action | enable **`npm publish`** (not stage-only unless the team wants staged flow) |

npm does **not** validate the config on save — mismatches only fail at publish time.

For monorepos, configure **every** public `@singleton-sd/<pkg>` the same way
(same org/repo/workflow).

### 2. GitHub Actions workflow

Create `.github/workflows/release.yml`. Required:

- `permissions.id-token: write` (OIDC) and `permissions.contents: read` only
  (the App token, not `GITHUB_TOKEN`, writes the release commit/tag)
- Upgrade **npm CLI ≥ 11.5.1** in the job (Trusted Publishing minimum)
- Prefer **pnpm 11.x** on the Release job (matches InkAds); pin explicitly
- **Do not** set `NPM_TOKEN` / `NODE_AUTH_TOKEN` on the publish / `release:ci` step
- Prefer **not** passing `registry-url` to `actions/setup-node` for the publish job
- `actions/checkout` with `persist-credentials: false`
- Run **build, test, and `prepublishOnly`** (or the package's prepublish script)
  **before** minting the App token
- Mint with `actions/create-github-app-token` (`vars.RELEASE_APP_ID` +
  `secrets.RELEASE_APP_PRIVATE_KEY`), repo-scoped,
  `permission-contents: write`. No PAT / `secrets.GITHUB_TOKEN` fallback
- Pass `app-slug` / app id into `run:` scripts through `env:`, not inline
  `${{ }}` expressions
- Atomic push: `git push --follow-tags --atomic`
- Pin every `uses:` to a commit SHA
- Skip the job when the head commit starts with `chore(release):`

Same git-push design:
[`set-up-product-assets-repo`](../set-up-product-assets-repo/SKILL.md).

#### Failure mode: stale / auth-bearing `.npmrc`

If `actions/setup-node` is given `registry-url`, it writes the user `.npmrc`
with `always-auth` and an empty `_authToken`. **npm ≥ 11.5** then rejects
publish (Unknown user config / bogus `--//registry` argv). A **project**
`.npmrc` with `_authToken` / `always-auth` (for example a read token for
private deps) is also read by `npm publish` and can short-circuit OIDC or
publish with a long-lived credential.

Fix: omit `registry-url` for OIDC publish jobs; before `release:ci`, fail
closed if **any** applicable npmrc (project, user, or global) contains registry
auth. **Log only the file path** — never `cat` the file into Actions logs
(credentials may not be masked).

Install private deps in a separate step that does not leave auth config
in place for publish (or use a clean userconfig for the publish invocation).

Non-auth project `.npmrc` keys (e.g. `inject-workspace-packages=true`) are fine
for the OIDC check but can make `npm` noisy; prefer keeping publish jobs free of
auth-bearing npmrc content.

#### Reference workflow shape (adapt package manager + default branch)

Replace every `<default-branch>` with the confirmed default from gather inputs.

```yaml
name: Release

on:
  push:
    branches: [<default-branch>]
  workflow_dispatch:

concurrency:
  group: release-<default-branch>
  cancel-in-progress: false

permissions:
  contents: read
  id-token: write

jobs:
  release:
    if: "${{ github.event_name == 'workflow_dispatch' || !startsWith(github.event.head_commit.message, 'chore(release):') }}"
    runs-on: ubuntu-latest
    steps:
      - name: Require singleton-release GitHub App credentials
        env:
          RELEASE_APP_ID: ${{ vars.RELEASE_APP_ID }}
          RELEASE_APP_PRIVATE_KEY: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
        run: |
          set -euo pipefail
          if [[ -z "${RELEASE_APP_ID}" ]]; then
            echo "::error::vars.RELEASE_APP_ID is not set." >&2
            exit 1
          fi
          if [[ -z "${RELEASE_APP_PRIVATE_KEY}" ]]; then
            echo "::error::secrets.RELEASE_APP_PRIVATE_KEY is not set. Do not use GITHUB_TOKEN or a PAT." >&2
            exit 1
          fi

      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Select release revision
        run: |
          set -euo pipefail
          git fetch origin <default-branch> --tags
          git checkout -B <default-branch> origin/<default-branch>

      - uses: pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda # v4
        with:
          version: 11.22.0

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 22
          cache: pnpm
          # Do NOT set registry-url — breaks OIDC (see skill notes).

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Upgrade npm for OIDC publish
        run: |
          set -euo pipefail
          # Pin npm@11: npm@latest may jump majors and break release-it argv.
          npm install -g npm@11
          npm --version
          for npmrc in "$PWD/.npmrc" "$(npm config get userconfig)" "$(npm config get globalconfig)"; do
            if [[ -f "$npmrc" ]] && grep -qE 'always-auth|^//registry\.npmjs\.org|_authToken' "$npmrc"; then
              # Do not print file contents — they may contain credentials.
              echo "Refusing to publish with an auth .npmrc: $npmrc" >&2
              exit 1
            fi
          done

      - name: Build, test, and prepublish
        run: |
          set -euo pipefail
          pnpm test
          pnpm build
          pnpm prepublishOnly

      - uses: actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510 # v3.3.0
        id: app-token
        with:
          app-id: ${{ vars.RELEASE_APP_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: ${{ github.event.repository.name }}
          permission-contents: write

      - name: Configure git identity as the App bot
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          APP_SLUG: ${{ steps.app-token.outputs.app-slug }}
        run: |
          set -euo pipefail
          user_id="$(gh api "/users/${APP_SLUG}[bot]" --jq .id)"
          git config user.name "${APP_SLUG}[bot]"
          git config user.email "${user_id}+${APP_SLUG}[bot]@users.noreply.github.com"

      - name: Release
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          set -euo pipefail
          git remote set-url origin \
            "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
          # Do not retry blindly: commit/tag may already exist if a later step failed.
          pnpm release:ci
```

Do not copy `poc-inkads-epaper-renderer`'s `secrets.GITHUB_TOKEN` push. That
pattern cannot bypass a CodeRabbit-required ruleset.

---

## release-it integration (single-package repos)

```js
// .release-it.js (ESM) — essentials
// Set requireBranch to the confirmed default branch (not always "main").
export default {
  git: {
    // Workflow release commit only — never copy [skip ci] into feature commits.
    commitMessage: 'chore(release): v${version} [skip ci]',
    requireBranch: '<default-branch>',
    requireCleanWorkingDir: true,
    commit: true,
    push: true,
    tag: true,
    pushArgs: ['--follow-tags', '--atomic'],
  },
  npm: {
    publish: true,
    skipChecks: true, // required for OIDC — npm whoami fails without a static token
  },
  github: { release: true },
  plugins: {
    '@release-it/conventional-changelog': {
      infile: 'CHANGELOG.md',
      preset: { name: 'conventionalcommits' },
    },
  },
};
```

Notes:

- `npm.skipChecks: true` is **required** for OIDC (preflight `npm whoami` has no token)
- `pnpm release:ci` / `yarn release:ci` is **CI-only**; local dry-run is `pnpm release` (or `release-it -VV --dry-run`)
- release-it publishes **before** git push — auth failure rolls back without pushing tags
- Do **not** run `release:ci` on a laptop expecting OIDC

---

## pnpm monorepo (path-aware release)

When the repo is a **pnpm workspace** with several public packages (e.g. post-kit):

1. Keep a path-aware bump/orchestrator (not one global release-it for all packages).
2. Publish with **`pnpm publish`** so `workspace:*` dependencies rewrite to concrete
   versions (`npm publish` alone will not).
3. Publish in **dependency order** (types/leaf libs before dependents).
4. Publish **before** pushing release tags to the default branch (same recovery idea
   as release-it).
5. For partial-run recovery, probe the registry **version document** before each
   publish:

   - `GET https://registry.npmjs.org/<urlencoded-name>/<version>`
   - **200** → skip (already published)
   - **404** → publish
   - **network / 5xx / other** → **throw** — do **not** treat as unpublished
     (otherwise a retry republishes and npm rejects the immutable version)

   Do **not** use package-root `npm view <name>` alone for this check (see
   [Verify a published version](#verify-a-published-version)).

6. Pass `--no-git-checks` and `--publish-branch <default-branch>` when the Release
   job has a dirty tree or needs an explicit publish branch.

Root `.release-it.json` may keep `npm.publish: false` when the orchestrator owns
publish — do not confuse humans into using release-it for monorepo npm.

---

## First-publish bootstrap

Trusted Publishing often cannot take over until the package exists with at least
one version (or the org has reserved the name — verify carefully).

1. Work on a **clean checkout of the default branch** (avoids pnpm
   `ERR_PNPM_GIT_NOT_CORRECT_BRANCH` / unclean-tree failures). Do not bootstrap
   from a feature branch with temporary `package.json` hacks when you can avoid it.

2. If the version document is missing, do **one** interactive first publish from
   a maintainer machine (browser / 2FA / OTP as prompted). Prefer **`0.0.0`**
   as the placeholder so a trusted publisher can be attached before CI mints
   `0.1.0`:

   **Single package:**

   ```bash
   pnpm build
   npm publish --access public
   # or: pnpm publish --access public
   ```

   **Monorepo (rewrites workspace deps):**

   ```bash
   pnpm --filter @singleton-sd/<pkg> build
   pnpm --filter @singleton-sd/<pkg> publish --access public
   ```

   Keep `--filter` and the package name on the **same shell line** (line wraps
   after `--filter` make `pnpm` see a bare `--filter` / `recursive` error).

3. Org UI may show the package name as **public** before any version exists —
   that is **not** enough. The CLI `+ name@version` line can also appear while
   package-root metadata is still inconsistent — always verify (next section).

4. After the first OIDC CI publish succeeds, harden:

   **Package → Publishing access → Require 2FA and disallow tokens**

---

## Verify a published version

Prefer the **version document** or **`npm pack`**. Package-root `npm view
@scope/name` (and even `npm view @scope/name@version` in some clients) can
still **404** briefly after first publish while the website, tarball, and
`GET /@scope%2fname/0.x.y` already succeed.

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://registry.npmjs.org/@singleton-sd%2f<name>/0.1.0"
# expect 200

npm pack @singleton-sd/<name>@0.1.0
```

Only then mark bootstrap done and move to the next package / OIDC CI.

---

## What not to do

- Do not create Azure Key Vault secrets for npm publish tokens
- Do not create Automation / Granular tokens with **bypass 2FA** for direct publish
- Do not set `NPM_TOKEN` / `NODE_AUTH_TOKEN` on the OIDC publish step
- Do not use `UNLICENSED` for a public installable package
- Do not point `repository.url` at a different host/path than the publishing GitHub repo
- Do not invent a GitLab `ENABLE_RELEASE_PUBLISH_*` + `NPMJS_TOKEN` path for this use case
  (that belongs to [`pipelines-npm`](../pipelines-npm/SKILL.md))
- Do not `cat` auth-bearing `.npmrc` files into CI logs
- Do not treat registry probe failures as “not published”
- Do not push the release commit with `secrets.GITHUB_TOKEN` or a PAT
- Do not mint the App token before build / test / prepublish succeed
- Do not put `[skip ci]` in feature commits (release-it commit message only)

Private **install** deps are separate: use a **read-only** token for `pnpm install` /
`npm ci` if needed; publish still uses OIDC with no write token.

---

## Agent checklist

```text
Publish npm library (Trusted Publishing):
- [ ] package.json name, license, files, prepublishOnly, repository.url
- [ ] private: true removed; publishConfig.access public
- [ ] Single-package: release-it npm.publish true + npm.skipChecks true
  OR monorepo: path-aware orchestrator + pnpm publish (workspace rewrite)
- [ ] Default branch substituted in workflow + requireBranch / publish-branch
- [ ] singleton-release App installed; RELEASE_APP_ID + RELEASE_APP_PRIVATE_KEY
- [ ] Default-branch ruleset bypass includes the App (no GITHUB_TOKEN push)
- [ ] .github/workflows/release.yml — contents:read + id-token:write, npm ≥ 11.5.1,
      pnpm 11, no registry-url; auth npmrc fail-closed (path only); App token
      after build/test/prepublish; atomic push; actions pinned to SHAs
- [ ] npmjs Trusted Publisher per package: org, repo name only, release.yml,
      empty Environment unless used, allow npm publish
- [ ] First version verified via version URL or npm pack (not npm view alone)
- [ ] CI release:ci succeeded once via OIDC
- [ ] Publishing access hardened (2FA + disallow tokens)
- [ ] Consumer install documented (pnpm add @singleton-sd/<name>@x.y.z)
```

---

## Related

- Single-package reference: `singleton-sd/poc-inkads-epaper-renderer` (OIDC npm;
  **do not** copy its `GITHUB_TOKEN` default-branch push)
- App-token git push + Pages snapshots:
  [`engineering/set-up-product-assets-repo`](../set-up-product-assets-repo/SKILL.md)
- Monorepo reference: `singleton-sd/post-kit`
- GitLab dual-registry publish: [`engineering/pipelines-npm`](../pipelines-npm/SKILL.md)
- GitLab package scaffold: [`engineering/repo-init-npm-publish`](../repo-init-npm-publish/SKILL.md)
