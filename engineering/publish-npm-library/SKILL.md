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
    "release:bump": "release-it --ci"
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
- `release:bump` only bumps `version` and writes `CHANGELOG.md` (release-it
  with commit, tag, push, publish, and GitHub Release off); the workflow's
  `publish` job does the rest without running any repo code
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

Create `.github/workflows/release.yml` with two jobs. **Repo code never runs
in the job that mints the App token.** Required:

- `prepare` (untrusted): checkout, install, `pnpm release:bump` (version +
  `CHANGELOG.md`, first so generated files see the new version), test, build,
  `prepublishOnly`, `pnpm run --if-present prepack`, then `npm pack
  --ignore-scripts` (which would otherwise skip `prepack`). It has `contents: read` only: **no `secrets.*`**, no App
  token, no `id-token`. It uploads the tarball, `package.json`,
  `CHANGELOG.md`, and the release notes as one artifact and outputs the
  version and the source SHA
- `publish` (no repo code): no install, no `node` / `pnpm` / `npx`, no repo
  scripts, hooks, or config loaders, no `cache:`. The checkout is data for git
  only. Steps, in order: App credential check (first, before checkout) →
  checkout (`fetch-depth: 0`) → download artifact → setup-node + npm ≥ 11.5.1
  + `.npmrc` registry-override/auth refusal (run from `RUNNER_TEMP`, not
  the checkout) →
  **verify the prepared release** (below) → `git commit --no-verify` and
  `git tag -a` of the prepared files
  (hooks off) → **mint the App token (last setup step)** → `git -c
  http.https://github.com/.extraheader=… push --atomic --no-verify origin
  HEAD:<default-branch> refs/tags/<v>` → `npm publish <tarball>
  --ignore-scripts` (OIDC, from an empty directory) → `gh release create
  --verify-tag`
- `permissions.contents: read` at the top; `id-token: write` **only** on
  `publish`. The App token, never `GITHUB_TOKEN`, pushes the release commit/tag
- Upgrade **npm CLI ≥ 11.5.1** in `publish` (Trusted Publishing minimum)
- Prefer **pnpm 11.x** in `prepare` (matches InkAds); pin explicitly
- **Do not** set `NPM_TOKEN` / `NODE_AUTH_TOKEN` on the publish step
- Prefer **not** passing `registry-url` to `actions/setup-node` for the publish job
- `actions/checkout` with `ref: <default-branch>` and `persist-credentials: false`
  (its own fetch is authenticated, so private repos work; no extra `git fetch`)
- Mint with `actions/create-github-app-token` (`vars.RELEASE_APP_ID` +
  `secrets.RELEASE_APP_PRIVATE_KEY`), repo-scoped,
  `permission-contents: write`. No PAT / `secrets.GITHUB_TOKEN` fallback. The
  token goes only to the push and GitHub Release steps through `env:`; the npm
  publish step never sees it
- The release commit uses the static `singleton-release[bot]` identity (user
  id `356768209`), so nothing calls the API before the token exists
- Recovery inputs `recover_version` + `recover_sha` (dispatch only) finish a
  release whose tag is on GitHub but whose npm publish or GitHub Release did
  not. The tag must be a release commit already on `<default-branch>`; the
  version must match the official SemVer regex
- Add a **tag ruleset** so only the singleton-release App can create, update,
  or delete tags (all tags, or at least `*.*.*`): then a writer cannot plant a
  release-shaped tag at all, on top of the ancestry checks
- Pin every `uses:` to a commit SHA
- Skip the run when the head commit starts with `chore(release):`

Same git-push design:
[`set-up-product-assets-repo`](../set-up-product-assets-repo/SKILL.md).

#### Failure mode: stale / auth-bearing `.npmrc`

If `actions/setup-node` is given `registry-url`, it writes the user `.npmrc`
with `always-auth` and an empty `_authToken`. **npm ≥ 11.5** then rejects
publish (Unknown user config / bogus `--//registry` argv). A **project**
`.npmrc` with `_authToken` / `always-auth` (for example a read token for
private deps) is also read by `npm publish` and can short-circuit OIDC or
publish with a long-lived credential.

Fix: omit `registry-url` for OIDC publish jobs; before `npm publish`, fail
closed if **any** applicable npmrc (project, user, or global) overrides the
registry or holds credentials (`registry=`, `//host/:…` lines, `_auth`,
`_authToken`, `_password`, `always-auth`), and if `npm config get registry`
is not `https://registry.npmjs.org/`. **Log only the file path** — never `cat`
the file into Actions logs (credentials may not be masked).

The reference workflow covers public dependencies only (see **Public
dependencies only** below); it has no step that installs private deps.

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
    inputs:
      recover_version:
        description: Version whose tag is on GitHub but whose npm publish or GitHub Release did not finish
        required: false
        default: ''
      recover_sha:
        description: Source commit the failed run prepared (the parent of the release commit)
        required: false
        default: ''

concurrency:
  group: release-<default-branch>
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  prepare:
    # Untrusted: dependency and repo scripts run here. No secrets, App token, or id-token.
    if: "${{ github.event_name == 'workflow_dispatch' || !startsWith(github.event.head_commit.message, 'chore(release):') }}"
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.rev.outputs.sha }}
      recover: ${{ steps.rev.outputs.recover }}
      version: ${{ steps.pack.outputs.version }}
      package: ${{ steps.pack.outputs.package }}
      tarball: ${{ steps.pack.outputs.tarball }}
    steps:
      # checkout's own fetch uses the read-only job token (private repos work);
      # persist-credentials: false removes it. No separate unauthenticated fetch.
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: <default-branch>
          fetch-depth: 0
          persist-credentials: false

      - name: Select release revision
        id: rev
        env:
          EVENT_NAME: ${{ github.event_name }}
          RECOVER_VERSION: ${{ inputs.recover_version }}
          RECOVER_SHA: ${{ inputs.recover_sha }}
          DEFAULT_BRANCH: <default-branch>
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          sha="$(git rev-parse HEAD)"
          recover=false
          if [[ -n "${RECOVER_VERSION}${RECOVER_SHA}" ]]; then
            [[ "${EVENT_NAME}" == workflow_dispatch && -n "${RECOVER_VERSION}" && -n "${RECOVER_SHA}" ]] \
              || fail "Recovery needs a workflow_dispatch with both recover_version and recover_sha."
            tag_commit="$(git rev-parse -q --verify "refs/tags/${RECOVER_VERSION}^{commit}")" \
              || fail "Tag ${RECOVER_VERSION} does not exist; nothing to recover."
            [[ "$(git rev-parse "${tag_commit}^")" == "${RECOVER_SHA}" ]] \
              || fail "Tag ${RECOVER_VERSION} is not the release commit on top of ${RECOVER_SHA}."
            [[ "$(git log -1 --format=%s "${tag_commit}")" == "chore(release): v${RECOVER_VERSION} [skip ci]" ]] \
              || fail "Tag ${RECOVER_VERSION} does not point at a release commit."
            # Only a release commit already on the protected branch can be recovered.
            git merge-base --is-ancestor "${tag_commit}" "refs/remotes/origin/${DEFAULT_BRANCH}" \
              || fail "Tag ${RECOVER_VERSION} is not on ${DEFAULT_BRANCH}; refusing to recover it."
            git checkout --quiet --detach "${tag_commit}"
            sha="${RECOVER_SHA}"
            recover=true
          fi
          echo "Preparing ${sha} (recover_sha if this release does not finish)"
          echo "sha=${sha}" >> "$GITHUB_OUTPUT"
          echo "recover=${recover}" >> "$GITHUB_OUTPUT"

      - uses: pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda # v4.1.0
        with:
          version: 11.22.0

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: pnpm
          # Do NOT set registry-url — breaks OIDC (see skill notes).

      - name: Install
        run: pnpm install --frozen-lockfile

      # Bump first so the build, prepublishOnly, and prepack see the new version.
      - name: Bump version and changelog
        env:
          RECOVER: ${{ steps.rev.outputs.recover }}
        run: |
          set -euo pipefail
          # release-it with commit, tag, push, npm publish, and GitHub Release off
          # (see .release-it.js). A recovery run uses the tagged release commit as is.
          [[ "${RECOVER}" == true ]] || pnpm release:bump

      - name: Build, test, and prepublish
        run: |
          set -euo pipefail
          pnpm test
          pnpm build
          pnpm run --if-present prepublishOnly

      - name: Pack
        id: pack
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          version="$(node -p 'require("./package.json").version')"
          # Official SemVer 2.0.0 regex (semver.org), POSIX ERE form.
          semver='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*))*))?(\+([0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*))?$'
          [[ "${version}" =~ ${semver} ]] || fail "package.json has no valid SemVer version: '${version}'."
          out="${RUNNER_TEMP}/release-files"
          mkdir -p "${out}"
          # npm pack --ignore-scripts skips prepack/prepare, so run prepack here first
          # (prepare already ran during install). The tarball is then final.
          pnpm run --if-present prepack
          tarball="$(npm pack --ignore-scripts --pack-destination "${out}" | tail -n1)"
          cp package.json CHANGELOG.md "${out}/"
          # Only "## " version headings start a section; a "# Changelog" title does not.
          awk '/^## / { if (found) exit; found=1 } found { print }' CHANGELOG.md > "${out}/release-notes.md"
          {
            echo "version=${version}"
            echo "package=$(node -p 'require("./package.json").name')"
            echo "tarball=${tarball}"
          } >> "$GITHUB_OUTPUT"

      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: release-files
          path: ${{ runner.temp }}/release-files/
          if-no-files-found: error
          retention-days: 1

  publish:
    # Runs no repo code: no install, no node/pnpm, no repo scripts or hooks.
    # The checkout is data for git; the App token is minted after every setup step.
    needs: prepare
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write # only this job can request the npm OIDC token
    steps:
      # Runs before anything is checked out.
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
            echo "::error::secrets.RELEASE_APP_PRIVATE_KEY is not set. No job-token or PAT fallback." >&2
            exit 1
          fi

      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: <default-branch>
          fetch-depth: 0
          persist-credentials: false

      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: release-files
          path: ${{ runner.temp }}/release-files

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          # No cache and no registry-url: nothing is installed from the repo.

      - name: Upgrade npm for OIDC publish
        run: |
          set -euo pipefail
          # Outside the checkout, so no repo .npmrc or package.json is read.
          cd "${RUNNER_TEMP}"
          # Node 22 ships npm 10; Trusted Publishing needs npm ≥ 11.5.1.
          npm install -g npm@11.5.1
          npm --version
          # Registry overrides and every credential form npm accepts (_auth also
          # matches _authToken). Log only the path, never the file.
          for npmrc in "${RUNNER_TEMP}/release-files/.npmrc" "$(npm config get userconfig)" "$(npm config get globalconfig)"; do
            if [[ -f "$npmrc" ]] && grep -qE 'always-auth|^[[:space:]]*//|registry[[:space:]]*=|_auth|_password' "$npmrc"; then
              echo "Refusing to publish with a registry override or auth in npmrc: $npmrc" >&2
              exit 1
            fi
          done
          registry="$(npm config get registry)"
          [[ "${registry}" == https://registry.npmjs.org/ ]] \
            || { echo "Refusing to publish: npm registry is ${registry}, not https://registry.npmjs.org/" >&2; exit 1; }

      # prepare ran dependency scripts, so its outputs and artifact are untrusted.
      # Re-derive every fact from git and the files with bash, git, jq, and tar only.
      - name: Verify prepared release
        env:
          VERSION: ${{ needs.prepare.outputs.version }}
          PACKAGE: ${{ needs.prepare.outputs.package }}
          TARBALL: ${{ needs.prepare.outputs.tarball }}
          PREPARED_SHA: ${{ needs.prepare.outputs.sha }}
          RECOVER: ${{ needs.prepare.outputs.recover }}
          EVENT_NAME: ${{ github.event_name }}
          RECOVER_VERSION: ${{ inputs.recover_version }}
          RECOVER_SHA: ${{ inputs.recover_sha }}
          DEFAULT_BRANCH: <default-branch>
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          files="${RUNNER_TEMP}/release-files"
          semver='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*))*))?(\+([0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*))?$'
          [[ "${VERSION}" =~ ${semver} ]] || fail "Prepared version is not SemVer: '${VERSION}'."
          [[ "${PREPARED_SHA}" =~ ^[0-9a-f]{40}$ ]] || fail "Prepared sha is not a commit id."
          # Recovery only when dispatched with exactly the version and sha prepare used.
          if [[ -n "${RECOVER_VERSION}${RECOVER_SHA}" || "${RECOVER}" != false ]]; then
            [[ "${RECOVER}" == true && "${EVENT_NAME}" == workflow_dispatch \
              && "${RECOVER_VERSION}" == "${VERSION}" && "${RECOVER_SHA}" == "${PREPARED_SHA}" ]] \
              || fail "Recovery outputs do not match recover_version/recover_sha."
            base="refs/tags/${VERSION}"
            [[ "$(git rev-parse "${base}^{commit}^")" == "${PREPARED_SHA}" ]] \
              || fail "Tag ${VERSION} is not the release commit on top of ${PREPARED_SHA}."
          else
            [[ "$(git rev-parse HEAD)" == "${PREPARED_SHA}" ]] \
              || fail "${DEFAULT_BRANCH} moved after prepare; the newer run releases it."
            base="${PREPARED_SHA}"
          fi
          git merge-base --is-ancestor "${base}" "refs/remotes/origin/${DEFAULT_BRANCH}" \
            || fail "${base} is not on ${DEFAULT_BRANCH}."
          # The artifact holds exactly these regular files: no extras, no symlinks.
          expected="${PACKAGE#@}"
          expected="${expected//\//-}-${VERSION}.tgz"
          [[ "${TARBALL}" == "${expected}" ]] || fail "Tarball '${TARBALL}' is not ${expected}."
          listing="$(cd "${files}" && find . -mindepth 1 -printf '%y %P\n' | LC_ALL=C sort)"
          want="$(printf 'f %s\n' CHANGELOG.md package.json release-notes.md "${TARBALL}" | LC_ALL=C sort)"
          [[ "${listing}" == "${want}" ]] || fail "Unexpected artifact contents: ${listing//$'\n'/, }"
          # Name from git, not from prepare; package.json may differ only in version.
          [[ "${PACKAGE}" == "$(git show "${PREPARED_SHA}:package.json" | jq -r .name)" ]] \
            || fail "Prepared package name '${PACKAGE}' is not the repo's."
          [[ "$(jq -r .version "${files}/package.json")" == "${VERSION}" ]] || fail "package.json version is not ${VERSION}."
          [[ "$(jq -S 'del(.version)' "${files}/package.json")" == "$(git show "${PREPARED_SHA}:package.json" | jq -S 'del(.version)')" ]] \
            || fail "Prepared package.json changes more than the version."
          if [[ "${RECOVER}" == true ]]; then
            cmp -s "${files}/package.json" <(git show "${base}:package.json") || fail "package.json differs from tag ${VERSION}."
            cmp -s "${files}/CHANGELOG.md" <(git show "${base}:CHANGELOG.md") || fail "CHANGELOG.md differs from tag ${VERSION}."
          fi
          # CHANGELOG.md may only gain lines at the top (below an unchanged "# " title).
          old="$(mktemp)"; new="$(mktemp)"
          git show "${PREPARED_SHA}:CHANGELOG.md" > "${old}" 2>/dev/null || : > "${old}"
          cp "${files}/CHANGELOG.md" "${new}"
          if [[ "$(head -n1 "${old}")" == "# "* && "$(head -n1 "${new}")" == "$(head -n1 "${old}")" ]]; then
            sed -i 1d "${old}" "${new}"
          fi
          n="$(wc -l < "${old}")"
          (( n == 0 )) || tail -n "${n}" "${new}" | cmp -s - "${old}" \
            || fail "CHANGELOG.md changes existing lines; only new lines at the top are allowed."
          # The tarball's own manifest must name the same package and version.
          [[ "$(tar -xOzf "${files}/${TARBALL}" package/package.json | jq -r '.name + "@" + .version')" == "${PACKAGE}@${VERSION}" ]] \
            || fail "Tarball package.json is not ${PACKAGE}@${VERSION}."
          # Release notes are regenerated from the CHANGELOG.md checked above; prepare's copy is replaced.
          notes="${files}/release-notes.md"
          awk '/^## / { if (found) exit; found=1 } found { print }' "${files}/CHANGELOG.md" > "${notes}.new"
          [[ "$(head -n1 "${notes}.new")" == "## "*"${VERSION}"* ]] \
            || fail "CHANGELOG.md does not start with a ## section for ${VERSION}."
          mv -f "${notes}.new" "${notes}"

      - name: Commit and tag the prepared release
        id: plan
        env:
          VERSION: ${{ needs.prepare.outputs.version }}
          PACKAGE: ${{ needs.prepare.outputs.package }}
          RECOVER: ${{ needs.prepare.outputs.recover }}
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          files="${RUNNER_TEMP}/release-files"
          code="$(curl -sS --connect-timeout 10 --max-time 30 -o /dev/null -w '%{http_code}' \
            "https://registry.npmjs.org/${PACKAGE/\//%2f}/${VERSION}")" || fail "npm registry probe failed."
          [[ "${code}" == 200 || "${code}" == 404 ]] || fail "npm registry probe returned ${code}."
          echo "npm=${code}" >> "$GITHUB_OUTPUT"
          if [[ "${RECOVER}" == true ]]; then
            # Verify prepared release checked the tag, its ancestry, and the inputs.
            echo "push=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          if git rev-parse -q --verify "refs/tags/${VERSION}" >/dev/null; then
            fail "Tag ${VERSION} already exists. If its run failed, dispatch with recover_version=${VERSION} and recover_sha=$(git rev-parse "refs/tags/${VERSION}^{commit}^")."
          fi
          [[ "${code}" == 404 ]] || fail "${VERSION} is on npm without its tag; a maintainer investigates before any release."
          # Static singleton-release[bot] identity: no API lookup before the token exists.
          git config --local user.name "singleton-release[bot]"
          git config --local user.email "356768209+singleton-release[bot]@users.noreply.github.com"
          git config --local core.hooksPath /dev/null
          cp "${files}/package.json" "${files}/CHANGELOG.md" .
          git add package.json CHANGELOG.md
          git commit --quiet --no-verify -m "chore(release): v${VERSION} [skip ci]"
          git tag -a "${VERSION}" -m "v${VERSION}"
          echo "push=true" >> "$GITHUB_OUTPUT"

      # Minted last: every later step is inline bash with git, curl, gh, and npm
      # publish of the prepared tarball. Do not add steps that run repo code.
      - uses: actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510 # v3.3.0
        id: app-token
        with:
          app-id: ${{ vars.RELEASE_APP_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: ${{ github.event.repository.name }}
          permission-contents: write

      - name: Push release commit and tag
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          GH_REPO: ${{ github.repository }}
          VERSION: ${{ needs.prepare.outputs.version }}
          PREPARED_SHA: ${{ needs.prepare.outputs.sha }}
          PUSH: ${{ steps.plan.outputs.push }}
          DEFAULT_BRANCH: <default-branch>
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          # Token only in a per-command extraheader: never in a URL or on disk.
          auth="$(printf 'x-access-token:%s' "${GH_TOKEN}" | base64 -w0)"
          echo "::add-mask::${auth}"
          header="http.https://github.com/.extraheader=AUTHORIZATION: basic ${auth}"
          if [[ "${PUSH}" != true ]]; then
            remote="$(git -c "${header}" ls-remote origin "refs/tags/${VERSION}^{}" | cut -f1)"
            [[ "${remote}" == "$(git rev-parse "refs/tags/${VERSION}^{commit}")" ]] \
              || fail "origin's tag ${VERSION} is not the release commit checked out here."
            echo "Recovery: tag ${VERSION} is already on origin; nothing to push."
            exit 0
          fi
          last_tag="$(git describe --tags --abbrev=0 "${PREPARED_SHA}" 2>/dev/null || true)"
          if [[ -n "${last_tag}" ]] && ! gh release view "${last_tag}" >/dev/null; then
            fail "Tag ${last_tag} has no GitHub Release. Dispatch with recover_version=${last_tag} and recover_sha=$(git rev-parse "${last_tag}^{commit}^"), or run: gh release create ${last_tag} --verify-tag"
          fi
          tip="$(git -c "${header}" ls-remote origin "refs/heads/${DEFAULT_BRANCH}" | cut -f1)"
          [[ "${tip}" == "${PREPARED_SHA}" ]] || fail "${DEFAULT_BRANCH} moved to ${tip}; the newer run releases it."
          git -c "${header}" push --atomic --no-verify origin "HEAD:${DEFAULT_BRANCH}" "refs/tags/${VERSION}"

      - name: Publish the prepared tarball to npm (OIDC)
        env:
          VERSION: ${{ needs.prepare.outputs.version }}
          TARBALL: ${{ needs.prepare.outputs.tarball }}
          NPM_STATUS: ${{ steps.plan.outputs.npm }}
        run: |
          set -euo pipefail
          if [[ "${NPM_STATUS}" == 200 ]]; then
            echo "Recovery: ${VERSION} is already on npm."
            exit 0
          fi
          # From an empty directory: no repo or artifact package.json or .npmrc is read.
          tgz_path="${RUNNER_TEMP}/release-files/${TARBALL}"
          cd "$(mktemp -d)"
          npm publish "${tgz_path}" --ignore-scripts --access public

      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          GH_REPO: ${{ github.repository }}
          VERSION: ${{ needs.prepare.outputs.version }}
        run: |
          set -euo pipefail
          if gh release view "${VERSION}" >/dev/null 2>&1; then
            echo "GitHub Release ${VERSION} already exists."
            exit 0
          fi
          gh release create "${VERSION}" --verify-tag --title "v${VERSION}" \
            --notes-file "${RUNNER_TEMP}/release-files/release-notes.md"
```

`prepare` references **no `secrets.*`** and no App token: it runs dependency
install scripts, tests, the build, and the version bump. `publish` runs no
repo code, so the App token is never live while anything from the repo
executes. Its credential check is the first step, before checkout, and it has
no `cache:` (the untrusted `prepare` job writes the pnpm cache). `dist/` must
be in `.gitignore` so the bump's `requireCleanWorkingDir` check passes after
the build.

**Public dependencies only.** This template installs dependencies in
`prepare`, which holds no secrets, so `pnpm install` can fetch only public
packages. It does not cover private registry or Git dependencies: do not add
a read token to `prepare` or `publish` to make one work. A package that needs
private dependencies needs its own reviewed release design.

A default-branch push authenticated with `secrets.GITHUB_TOKEN` (the pattern
older library release workflows used) cannot bypass a CodeRabbit-required
ruleset. Do not copy that fallback.

---

## release-it integration (single-package repos)

release-it only computes the version and writes `CHANGELOG.md`, in `prepare`.
It never commits, tags, pushes, publishes, or creates the GitHub Release: the
no-code `publish` job does that with plain `git`, `npm`, and `gh`.

```js
// .release-it.js (ESM) — bump-only. Set requireBranch to the confirmed default branch.
export default {
  git: {
    requireBranch: '<default-branch>',
    requireCleanWorkingDir: true,
    commit: false, // publish job: git commit --no-verify
    tag: false, // publish job: git tag -a <version>
    push: false, // publish job: atomic push with the App token
  },
  npm: {
    publish: false, // publish job: npm publish <tarball> --ignore-scripts (OIDC)
    skipChecks: true, // no npm whoami / registry checks in the untrusted job
  },
  github: { release: false }, // publish job: gh release create --verify-tag
  plugins: {
    '@release-it/conventional-changelog': {
      infile: 'CHANGELOG.md',
      preset: { name: 'conventionalcommits' },
    },
  },
};
```

Notes:

- Tags are the bare version (`1.2.3`), annotated `v1.2.3`; the release commit
  is `chore(release): v<version> [skip ci]` (the only place `[skip ci]` goes).
- `release:bump` runs before any token exists, so `.release-it.js` may use the
  usual options; it still must not commit, tag, push, or publish. It runs
  before the build so version-stamped output matches `package.json`.
- `npm pack --ignore-scripts` skips `prepack` and `prepare`, so `prepare` runs
  `pnpm run --if-present prepack` right before packing (`prepare` already ran
  during install). Keep generated files out of `prepare`/`prepack` only if
  the build makes them.
- `npm publish <tarball> --ignore-scripts` publishes exactly what `prepare`
  packed: `prepublishOnly` / `prepack` / `prepare` never run in `publish`.
- Release notes are the first `## ` section of `CHANGELOG.md`; a `# Changelog`
  title is not a section.
- No install happens in `publish`, so husky and other repo git hooks are never
  installed there. The step that commits and tags still sets
  `core.hooksPath=/dev/null` and passes `--no-verify` (which alone does not
  skip `prepare-commit-msg` or `post-commit`).
- Local dry-run: `pnpm release` (or `release-it -VV --dry-run`). There is no
  local publish path; CI publishes via OIDC.
- The `publish` job pushes **before** it publishes, so a failure leaves at
  most a tag without its npm version or GitHub Release. Checks, in order, all
  failing closed:

  1. `prepare` validates the version with the official SemVer 2.0.0 regex.
  2. **Verify prepared release** (in `publish`, before minting; bash, git,
     jq, tar, and awk only). `prepare` runs dependency scripts, so nothing it
     hands over is trusted:
     - the version matches the official SemVer regex again;
     - the artifact holds exactly `package.json`, `CHANGELOG.md`,
       `release-notes.md`, and the tarball, all regular files;
     - the tarball is the plain file name `<scope>-<name>-<version>.tgz`
       (npm pack naming), and its `package/package.json` names the same
       package and version;
     - the package name equals `git show <sha>:package.json | jq -r .name`,
       and `jq -S 'del(.version)'` of the prepared `package.json` equals the
       repo's: only the version may change;
     - `CHANGELOG.md` only gains lines at the top (below an unchanged
       `# ` title);
     - the prepared commit (or, on recovery, the tag) is an ancestor of
       `origin/<default-branch>` (`git merge-base --is-ancestor`);
     - recovery outputs equal the dispatch inputs: `recover_version` ==
       version and `recover_sha` == prepared SHA;
     - the GitHub Release notes are regenerated with `awk` from that checked
       `CHANGELOG.md` (its first `## ` section, which must name the
       version), replacing `prepare`'s `release-notes.md`.
  3. The npm registry probe (`--connect-timeout 10 --max-time 30`) of the
     version document returns **200** or **404**; anything else fails.
  4. Normal run: `<default-branch>` still points at the prepared commit, the
     tag does not exist yet, and npm says **404** (a version on npm without
     its tag stops the run for a maintainer to investigate).
  5. After minting: the latest earlier tag has a GitHub Release. If a run
     pushed a tag but did not finish, the next run stops instead of cutting
     another version and names the recovery dispatch.
  6. `<default-branch>` is re-read on origin right before the atomic push.
- **Recovery** (`workflow_dispatch` only, both inputs required):
  `recover_version` is the stuck tag and `recover_sha` the commit the failed
  run prepared (its log line `Preparing <sha>`; also the tag's parent).
  `prepare` checks that the tag is the `chore(release)` commit on top of
  `recover_sha` and an ancestor of `origin/<default-branch>` (checkout with
  `fetch-depth: 0`), and packs that commit without bumping. `publish` repeats
  the ancestry check before minting, requires the prepared `package.json` and
  `CHANGELOG.md` to equal the tag's, and checks that origin's tag matches. It then skips the push, publishes only if npm says
  404, and creates the GitHub Release only if it is missing.

---

## pnpm monorepo (path-aware release)

When the repo is a **pnpm workspace** with several public packages (e.g. post-kit):

1. Keep a path-aware bump/orchestrator (not one global release-it for all packages).
2. Pack with **`pnpm pack`** (or `pnpm publish` in a job without the App token)
   so `workspace:*` dependencies rewrite to concrete versions (`npm publish` of
   a source directory will not).
3. Publish in **dependency order** (types/leaf libs before dependents).
4. Pack every package in `prepare` (`pnpm pack` rewrites `workspace:*`) and
   publish the tarballs with `npm publish <tgz> --ignore-scripts`. Never run the
   orchestrator script in the job that holds the App token; push the release
   commit and tags from a no-code job as above.
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
   that is **not** enough. The registry can take a **few minutes** to show
   `0.0.0`. The CLI `+ name@version` line can also appear while package-root
   metadata is still inconsistent — always verify (next section).

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
- Do not install, run `node` / `pnpm` / `npx`, or run release-it or any repo
  script in the job that mints the App token
- Do not put the App token in the origin URL (use `http.extraheader`)
- Do not grant `id-token: write` to the job that installs, builds, or tests
- Do not put `[skip ci]` in feature commits (release commit message only)

Private **install** deps are separate: use a **read-only** token for `pnpm install` /
`npm ci` if needed; publish still uses OIDC with no write token.

---

## Agent checklist

```text
Publish npm library (Trusted Publishing):
- [ ] package.json name, license, files, prepublishOnly, repository.url
- [ ] private: true removed; publishConfig.access public
- [ ] Single-package: release-it bump only (commit/tag/push/publish/release off)
  OR monorepo: path-aware orchestrator + pnpm pack (workspace rewrite)
- [ ] Default branch substituted in workflow + requireBranch / publish-branch
- [ ] singleton-release App installed; RELEASE_APP_ID + RELEASE_APP_PRIVATE_KEY
- [ ] Default-branch ruleset bypass includes the App (no GITHUB_TOKEN push)
- [ ] Tag ruleset: only the singleton-release App creates/updates/deletes tags
- [ ] .github/workflows/release.yml — prepare job (contents:read, no
      secrets): bump, test, build, prepack, npm pack --ignore-scripts →
      artifact → publish job (credential check first, id-token:write, no
      install, no node/pnpm, no cache): verify prepared release before
      minting (SemVer, exact artifact files, tarball name + manifest,
      package.json only version changed, CHANGELOG only prepended, ancestry
      of origin/<default-branch>, recovery inputs), commit --no-verify +
      tag -a, App token minted
      last, extraheader atomic push, npm publish <tarball> --ignore-scripts,
      gh release create --verify-tag; npm 11.5.1, no registry-url; auth
      npmrc fail-closed (path only); recover_version + recover_sha on
      dispatch only; dist/ gitignored; actions pinned
- [ ] npmjs Trusted Publisher per package: org, repo name only, release.yml,
      empty Environment unless used, allow npm publish
- [ ] First version verified via version URL or npm pack (not npm view alone)
- [ ] CI publish job succeeded once via OIDC
- [ ] Publishing access hardened (2FA + disallow tokens)
- [ ] Consumer install documented (pnpm add @singleton-sd/<name>@x.y.z)
```

---

## Related

- Single-package OIDC npm: `singleton-sd/poc-inkads-epaper-renderer`. Do **not**
  copy a `secrets.GITHUB_TOKEN` default-branch push from any older workflow.
- App-token git push + Pages snapshots:
  [`engineering/set-up-product-assets-repo`](../set-up-product-assets-repo/SKILL.md)
- Monorepo reference: `singleton-sd/post-kit`
- GitLab dual-registry publish: [`engineering/pipelines-npm`](../pipelines-npm/SKILL.md)
- GitLab package scaffold: [`engineering/repo-init-npm-publish`](../repo-init-npm-publish/SKILL.md)
