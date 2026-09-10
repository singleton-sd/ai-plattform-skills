---
name: Publish npm Library
description: >-
  Publish a public @singleton-sd TypeScript library to npmjs.org with Trusted
  Publishing (OIDC) from GitHub Actions — no long-lived NPM_TOKEN, no Azure Key
  Vault publish secret, no 2FA-bypass automation tokens. Use when setting up npm
  releases for a client/library package, wiring release-it + release.yml, or
  when an agent would otherwise invent a token-based publish path.
tags: [engineering, npm, npmjs, trusted-publishing, oidc, github, release, library]
audience: [engineers, tech-leads]
status: stable
---

# Publish npm Library

Stand up and publish a **public** `@singleton-sd/<name>` library to **npmjs.org**
using **Trusted Publishing (OIDC)** from GitHub Actions.

Canonical reference (live):
[`@singleton-sd/inkads-epaper-renderer`](https://www.npmjs.com/package/@singleton-sd/inkads-epaper-renderer)
— repo [`singleton-sd/poc-inkads-epaper-renderer`](https://github.com/singleton-sd/poc-inkads-epaper-renderer)
(issue [#22](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/22),
PR [#30](https://github.com/singleton-sd/poc-inkads-epaper-renderer/pull/30)).

Docs: [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/),
[release-it npm / OIDC](https://github.com/release-it/release-it/blob/main/docs/npm.md).

## When to use this vs related skills

| Goal | Skill |
|------|--------|
| Public library on **npmjs** via **OIDC** (GitHub Actions) | **This skill** |
| CLI/tool on **GitLab Package Registry** (± token npmjs) | [`engineering/repo-init-npm-publish`](../repo-init-npm-publish/SKILL.md) + [`engineering/pipelines-npm`](../pipelines-npm/SKILL.md) |
| Husky / commitlint / release-it only (no publish) | [`engineering/repo-init`](../repo-init/SKILL.md) |

Do **not** mix paths: do not add `NPMJS_TOKEN` / Azure Key Vault publish secrets
when Trusted Publishing is the auth model.

---

## Gather inputs

Confirm with the user:

| Input | Example |
|-------|---------|
| **Package name** | `@singleton-sd/inkads-epaper-renderer` |
| **GitHub org/repo** | `singleton-sd/poc-inkads-epaper-renderer` |
| **Default branch** | `main` (confirm — do not assume) |
| **Package manager** | `pnpm` (preferred for client libs) or `yarn`/`npm` |
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
- `files` allowlist with **negated** `*.spec.*` / fixtures so tests never ship
- `prepublishOnly` runs the build
- Proprietary packages use `SEE LICENSE IN LICENSE` — **not** `UNLICENSED` (that blocks public installability)
- `repository.url` must **exactly** match the GitHub repo (OIDC / provenance requirement)
- UTF-8 **without BOM** on `package.json`

---

## Trusted Publishing setup (one-time per package)

### 1. npmjs.com

On the package (create the empty package name on npm under the org if needed):

1. **Settings → Trusted publishing → GitHub Actions**
2. Organization: `singleton-sd`
3. Repository: `<repo>` (name only)
4. Workflow filename: `release.yml` (**filename only**, not `.github/workflows/…`)
5. Allowed action: enable **`npm publish`** (not stage-only unless the team wants staged flow)

npm does **not** validate the config on save — mismatches only fail at publish time.

### 2. GitHub Actions workflow

Create `.github/workflows/release.yml`. Required:

- `permissions.id-token: write` (OIDC)
- `permissions.contents: write` (release commit / tag / GitHub Release)
- Upgrade **npm CLI ≥ 11.5.1** in the job (Trusted Publishing minimum)
- **Do not** set `NPM_TOKEN` / `NODE_AUTH_TOKEN` on the publish / `release:ci` step
- Prefer **not** passing `registry-url` to `actions/setup-node` for the publish job

#### Failure mode: stale / auth-bearing `.npmrc`

If `actions/setup-node` is given `registry-url`, it writes the user `.npmrc`
with `always-auth` and an empty `_authToken`. **npm ≥ 11.5** then rejects
publish (Unknown user config / bogus `--//registry` argv). A **project**
`.npmrc` with `_authToken` / `always-auth` (for example a read token for
private deps) is also read by `npm publish` and can short-circuit OIDC or
publish with a long-lived credential.

Fix: omit `registry-url` for OIDC publish jobs; before `release:ci`, fail
closed if **any** applicable npmrc (project, user, or global) contains registry
auth. Install private deps in a separate step that does not leave auth config
in place for publish (or use a clean userconfig for the publish invocation).

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
  contents: write
  id-token: write

jobs:
  release:
    if: "${{ github.event_name == 'workflow_dispatch' || !startsWith(github.event.head_commit.message, 'chore: Release') }}"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: pnpm/action-setup@v4
        with:
          version: 11.22.0

      - uses: actions/setup-node@v4
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
              echo "Refusing to publish with an auth .npmrc: $npmrc" >&2
              cat "$npmrc" >&2
              exit 1
            fi
          done

      - name: Configure git identity
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          git remote set-url origin \
            "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
          git fetch origin <default-branch> --tags
          git checkout -B <default-branch> origin/<default-branch>
          # Do not retry blindly: commit/tag may already exist if a later step failed.
          pnpm release:ci
```

Copy from the live InkAds workflow when in doubt:
`.github/workflows/release.yml` in `poc-inkads-epaper-renderer`.

---

## release-it integration

```js
// .release-it.js (ESM) — essentials
// Set requireBranch to the confirmed default branch (not always "main").
export default {
  git: {
    commitMessage: 'chore: Release v${version}\n\n[skip ci]',
    requireBranch: '<default-branch>',
    requireCleanWorkingDir: true,
    commit: true,
    push: true,
    tag: true,
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

## First-publish bootstrap

Trusted Publishing often cannot take over until the package exists with at least
one version (or the org has reserved the name — verify carefully).

1. If `npm view @singleton-sd/<pkg>` **404s**, do **one** interactive first publish
   from a maintainer machine:

   ```bash
   pnpm build
   npm publish --access public
   ```

   Complete 2FA when prompted.

2. Org UI may show the package name as **public** before any version exists —
   that is **not** enough. Always verify with:

   ```bash
   npm view @singleton-sd/<pkg> version
   ```

3. After the first OIDC CI publish succeeds, harden:

   **Package → Publishing access → Require 2FA and disallow tokens**

---

## What not to do

- Do not create Azure Key Vault secrets for npm publish tokens
- Do not create Automation / Granular tokens with **bypass 2FA** for direct publish
- Do not set `NPM_TOKEN` / `NODE_AUTH_TOKEN` on the OIDC publish step
- Do not use `UNLICENSED` for a public installable package
- Do not point `repository.url` at a different host/path than the publishing GitHub repo
- Do not invent a GitLab `ENABLE_RELEASE_PUBLISH_*` + `NPMJS_TOKEN` path for this use case
  (that belongs to [`pipelines-npm`](../pipelines-npm/SKILL.md))

Private **install** deps are separate: use a **read-only** token for `pnpm install` /
`npm ci` if needed; publish still uses OIDC with no write token.

---

## Agent checklist

```text
Publish npm library (Trusted Publishing):
- [ ] package.json name, license, files, prepublishOnly, repository.url
- [ ] private: true removed; publishConfig.access public
- [ ] release-it: npm.publish true + npm.skipChecks true
- [ ] Default branch substituted in workflow + release-it requireBranch
- [ ] .github/workflows/release.yml — id-token write, npm ≥ 11.5.1, no registry-url / auth-npmrc trap
- [ ] npmjs Trusted Publisher: org, repo, workflow filename release.yml, allow npm publish
- [ ] First version exists (npm view) or interactive bootstrap done
- [ ] CI release:ci succeeded once via OIDC
- [ ] Publishing access hardened (2FA + disallow tokens)
- [ ] Consumer install documented (pnpm add @singleton-sd/<name>@x.y.z)
```

---

## Related

- Reference implementation: `singleton-sd/poc-inkads-epaper-renderer`
- GitLab dual-registry publish: [`engineering/pipelines-npm`](../pipelines-npm/SKILL.md)
- GitLab package scaffold: [`engineering/repo-init-npm-publish`](../repo-init-npm-publish/SKILL.md)
