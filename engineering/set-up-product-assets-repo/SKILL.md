---
name: Set Up a Product Assets Repo
description: >-
  Create a public, independently versioned product assets repository from the
  Singleton SD recipe: gh-pages catalog, immutable /releases/<tag>/ snapshots,
  GitHub Release archives, and npm Trusted Publishing. Use when standing up
  assets.<product>.poc.singletonsd.com, copying design-system/assets, or wiring
  Pages + the singleton-release GitHub App for a product brand.
tags: [engineering, assets, github, pages, npm, release, branding, oidc]
audience: [engineers, tech-leads]
status: stable
---

# Set Up a Product Assets Repo

Stand up a **public** GitHub assets repo for one product (`<product>`). Marketing,
app, API, firmware, email, and docs consumers live elsewhere; this repo is the
versioned brand catalog.

Recipe (source of truth):
[`docs/product-assets-recipe.md`](https://gitlab.com/singleton-sd/design-system/assets/-/blob/main/docs/product-assets-recipe.md)
in `singleton-sd/design-system/assets`.

Living GitHub examples (copy **contracts**, not product artwork):

| Repo | Copy | Do not copy |
|------|------|-------------|
| Recipe repo | Layout, validate/build, `dist/manifest.json` | Corporate Singleton masters |
| `poc-inkads-assets` | Catalog/validate scripts | GitHub Actions Pages publisher; `secrets.GITHUB_TOKEN` default-branch push |
| `leasemate-assets` | `release.yml` prepare/publish split: App token minted last in a publish job with no install or scripts | LeaseMate names, colours, DNS host; the `node scripts/release-resume.mjs` step in its publish job (use the bash plan below); its `pages.yml` deploy action (use the inline deploy job below) |

npm publish details (OIDC, `.npmrc`, first-publish):
[`engineering/publish-npm-library`](../publish-npm-library/SKILL.md).
This skill owns Pages snapshots, DNS/Pages go-live, and the App-token **git**
push. Use `<product>` placeholders; examples (`inkads`, `leasemate`) are not
defaults.

Do **not** put `[skip ci]` / `[ci skip]` in feature commits. That string appears
only in the release commit message that `release.yml`'s `publish` job writes.

---

## Gather inputs

| Input | Example |
|-------|---------|
| **Product id** (`<product>`) | `inkads` (kebab-case, used in repo/package/DNS) |
| **GitHub repo** | `singleton-sd/<product>-assets` |
| **Default branch** | `main` (confirm — do not assume) |
| **npm package** | `@singleton-sd/<product>-assets` |
| **Asset host** | `assets.<product>.poc.singletonsd.com` |

Substitute the confirmed default branch for every `<default-branch>` below.

---

## 1. Create the repo from the recipe

1. Copy `design-system/assets` **without Git history** (or seed from a current
   product assets repo, then strip product masters).
2. Replace package/repo metadata and `config/product.json` (`id`, `name`,
   `publicUrl` = `https://assets.<product>.poc.singletonsd.com`).
3. Replace corporate/product masters with **approved** `<product>` artwork.
   Empty placeholder categories are OK while identity is in review; production
   inventory must be in `dist/manifest.json` before marketing launch.
4. Keep the recipe layout (`src/`, `scripts/`, `templates/`, `dist/` generated).
5. Required commands (or the repo's equivalent):

   ```sh
   pnpm install --frozen-lockfile
   pnpm validate
   pnpm test
   pnpm build
   ```

   Build must start clean, write the full `dist/` catalog + `dist/manifest.json`,
   and leave committed sources unchanged (`git diff` clean after build).

Approval boundary: `generated concept → owner review → approved src → build →
published dist`. Agents must not promote unreviewed concepts into `src/`.

### Publishing contract

| Surface | Behaviour |
|---------|-----------|
| `gh-pages` **root** | Latest catalog (omit `/dist` from URLs) |
| `/releases/<tag>/` | Immutable snapshot for each stable tag (`1.2.3` or `v1.2.3`; store **unprefixed**) |
| Overwrite guard | `releases/<version>/` is write-once: same content → already published (retry OK); different → fail |
| GitHub Release | Tarball `<product>-assets-<version>.tar.gz`, `.sha256`, and `manifest.json` |

The `.sha256` file checks integrity (a truncated or corrupted download), not
authenticity: anyone who can replace the archive can replace it too, so trust
rests on the App-only write path.

Firmware and other pinned consumers use `/releases/<tag>/` or the Release
archive. Ordinary web consumers may use the root.

**Pages source is the `gh-pages` branch**, not the GitHub Actions Pages
publisher. Snapshots sit beside the latest root: root deploys keep `releases/`
and `CNAME`.

Wire three workflows (pin every `uses:` to a commit SHA). In `pages.yml` and
`snapshot.yml` a `build` job validates, tests, builds, and uploads `dist/` as
an artifact. It runs untrusted dependency and repo scripts, so it gets
`contents: read`, **no secrets**, and no App token. A separate `deploy` job
that runs **no repo code** (no checkout, install, build, or scripts) is the
only writer.

1. **`pages.yml`** — on push to `<default-branch>`: the `snapshot.yml` jobs
   without the tag parse and the "Release assets" step. The artifact goes
   straight into `site-content/`, `VERSION` is `''`, and the workflow uses
   `concurrency: { group: gh-pages-root, cancel-in-progress: false }` (a newer
   pending root deploy replacing an older pending one is fine). Full file
   below the snapshot workflow; its "Publish to gh-pages" `run:` block must
   stay identical to `snapshot.yml`'s.
2. **`snapshot.yml`** — on `release: published` (not tag push: the release commit
   is `chore(release): v${version} [skip ci]`, which skips tag-push CI):
   - Parse a stable semver tag; reject prereleases.
   - **Release assets are idempotent.** The uploaded archive is the source of
     truth: on a re-run it is downloaded and checked with `sha256sum -c`, never
     rebuilt. A first run uploads `<product>-assets-<version>.tar.gz`, then its
     `.sha256` (never `--clobber`). `manifest.json` is uploaded from the
     archive if missing and must match it if present.
   - **`releases/<version>/` is write-once.** If it already exists, every file
     is compared with the archive (`diff -r`): same → nothing to do, different
     → fail. Then the root is refreshed under the stale-root guard.
3. **`release.yml`** — section 2 below.

### gh-pages writers

- **Credentials: the singleton-release App only.** `gh` is unauthenticated in
  Actions unless `GH_TOKEN` is set. The deploy job mints a repo-scoped App
  token (`permission-contents: write`) right before its two writing steps and
  passes it only to them through `env:`. The job token stays `contents: read`;
  there is no job-token or PAT fallback. The App must stay installed on the
  repo with **Contents: read and write**: every `gh-pages` push and Release
  asset upload goes through it.
- **Blast radius.** App `contents: write` is repository-wide (GitHub cannot
  scope it to `gh-pages`) and the App bypasses the default-branch ruleset. So
  the token lives only in inline, reviewed `run:` steps, in a job with no repo
  code and no third-party deploy action. Do not add actions to that job.
- **Ordering.** `pages.yml` serialises on `gh-pages-root`; each snapshot has its
  own group (`gh-pages-snapshot-<tag>`), so a snapshot never cancels a pending
  root deploy. Concurrent writers are safe because the publish step never
  force-pushes: a rejected (non-fast-forward) push re-clones `gh-pages`,
  re-applies, and retries up to 5 times.
- **Stale-root guard.** Every push attempt re-reads the `<default-branch>` tip
  just before committing and refreshes the root only if it equals the
  artifact's source commit (`github.sha`; for `release` events, the tagged
  commit). Otherwise only `releases/<version>/` is written and the newer
  commit's `pages.yml` run owns the root. A commit that lands between that
  check and the push has its own `pages.yml` run queued behind this one.
- **Re-runs are manual.** A cancelled or failed `snapshot.yml` run is not
  retried by anything: re-run it from the Actions tab (it is idempotent).

Snapshot recovery:

- **Archive on the Release without its `.sha256`** (interrupted upload): the
  run fails closed. A maintainer deletes the orphan
  (`gh release delete-asset <tag> <product>-assets-<version>.tar.gz`) and
  re-runs; nothing reached `gh-pages` yet, so the rebuilt archive is safe.
- **`manifest.json` missing from the Release:** a re-run uploads it from the
  verified archive. Present but different → fail; investigate, do not replace.
- **`releases/<version>/` differs from the archive:** fail. Snapshots are
  immutable; never overwrite one.

```yaml
name: Snapshot

on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  build:
    # Untrusted: dependency and repo scripts run here. No secrets, no App token.
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.tag.outputs.version }}
    steps:
      - name: Parse stable tag
        id: tag
        env:
          TAG: ${{ github.event.release.tag_name }}
        run: |
          set -euo pipefail
          version="${TAG#v}"
          [[ "${version}" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] \
            || { echo "::error::${TAG} is not a stable semver tag." >&2; exit 1; }
          echo "version=${version}" >> "$GITHUB_OUTPUT"

      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.release.tag_name }}
          persist-credentials: false

      - uses: pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda # v4.1.0
        with:
          version: 11.22.0

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: pnpm

      - name: Validate, test, build
        run: |
          set -euo pipefail
          pnpm install --frozen-lockfile
          pnpm validate
          pnpm test
          pnpm build

      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: catalog
          path: dist/
          if-no-files-found: error
          retention-days: 1

  deploy:
    # Runs no repo code: only the App token, gh, git, and tar touch the output.
    needs: build
    runs-on: ubuntu-latest
    concurrency:
      group: gh-pages-snapshot-${{ github.event.release.tag_name }}
      cancel-in-progress: false
    steps:
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: catalog
          path: dist/

      # Minted right before the only two steps that write.
      - uses: actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510 # v3.3.0
        id: app-token
        with:
          app-id: ${{ vars.RELEASE_APP_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: ${{ github.event.repository.name }}
          permission-contents: write

      - name: Release assets (idempotent)
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          GH_REPO: ${{ github.repository }}
          TAG: ${{ github.event.release.tag_name }}
          VERSION: ${{ needs.build.outputs.version }}
          PRODUCT: <product>
        run: |
          set -euo pipefail
          archive="${PRODUCT}-assets-${VERSION}.tar.gz"
          assets="$(gh release view "${TAG}" --json assets --jq '.assets[].name')"
          has() { grep -qxF "$1" <<< "${assets}"; }
          work="${RUNNER_TEMP}/release"
          mkdir -p "${work}" site-content
          if has "${archive}"; then
            # Retry: the uploaded archive is the source of truth, never rebuilt.
            has "${archive}.sha256" || { echo "::error::${archive} has no .sha256 (partial upload). See the skill's recovery notes." >&2; exit 1; }
            gh release download "${TAG}" --dir "${work}" --pattern "${archive}" --pattern "${archive}.sha256"
            (cd "${work}" && sha256sum -c "${archive}.sha256")
          else
            tar -czf "${work}/${archive}" -C dist .
            (cd "${work}" && sha256sum "${archive}" > "${archive}.sha256")
            gh release upload "${TAG}" "${work}/${archive}"
            gh release upload "${TAG}" "${work}/${archive}.sha256"
          fi
          tar -xzf "${work}/${archive}" -C site-content
          if has manifest.json; then
            gh release download "${TAG}" --dir "${work}" --pattern manifest.json
            cmp -s "${work}/manifest.json" site-content/manifest.json \
              || { echo "::error::Release manifest.json differs from the archive." >&2; exit 1; }
          else
            gh release upload "${TAG}" site-content/manifest.json
          fi

      - name: Publish to gh-pages
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          APP_SLUG: ${{ steps.app-token.outputs.app-slug }}
          VERSION: ${{ needs.build.outputs.version }} # '' in pages.yml
          SOURCE_SHA: ${{ github.sha }}
          DEFAULT_BRANCH: <default-branch>
        run: |
          set -euo pipefail
          auth="$(printf 'x-access-token:%s' "${GH_TOKEN}" | base64 -w0)"
          echo "::add-mask::${auth}"
          # Step-scoped git config: the token is never in a URL or on disk; no hooks.
          export GIT_CONFIG_COUNT=2
          export GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}"
          export GIT_CONFIG_KEY_1=core.hooksPath GIT_CONFIG_VALUE_1=/dev/null
          url="https://github.com/${GITHUB_REPOSITORY}.git"
          user_id="$(gh api "/users/${APP_SLUG}[bot]" --jq .id)"
          for attempt in 1 2 3 4 5; do
            rm -rf site
            if git ls-remote --exit-code --heads "${url}" gh-pages > /dev/null; then
              git clone --quiet --depth 1 --branch gh-pages "${url}" site
            else
              git init --quiet -b gh-pages site && git -C site remote add origin "${url}"
            fi
            if [[ -n "${VERSION}" ]]; then
              dest="site/releases/${VERSION}"
              if [[ -d "${dest}" ]]; then
                # Write-once: compare every file, not just manifest.json.
                diff -r "${dest}" site-content > /dev/null \
                  || { echo "::error::releases/${VERSION} differs from the Release archive." >&2; exit 1; }
              else
                mkdir -p "${dest}" && cp -a site-content/. "${dest}/"
              fi
            fi
            # Stale-root guard, re-checked right before every push attempt.
            tip="$(git ls-remote "${url}" "refs/heads/${DEFAULT_BRANCH}" | cut -f1)"
            if [[ "${tip}" == "${SOURCE_SHA}" ]]; then
              find site -mindepth 1 -maxdepth 1 ! -name .git ! -name releases ! -name CNAME -exec rm -rf {} +
              cp -a site-content/. site/
            else
              echo "Root left alone: ${DEFAULT_BRANCH} is at ${tip}, not ${SOURCE_SHA}."
            fi
            git -C site add -A
            if git -C site diff --cached --quiet; then echo "gh-pages is up to date."; exit 0; fi
            git -C site -c user.name="${APP_SLUG}[bot]" \
              -c user.email="${user_id}+${APP_SLUG}[bot]@users.noreply.github.com" \
              commit --quiet --no-verify -m "deploy: ${VERSION:-root} from ${SOURCE_SHA}"
            if git -C site push --quiet --no-verify origin gh-pages; then exit 0; fi
            echo "gh-pages push rejected (attempt ${attempt}); retrying on the new tip."
            sleep $((attempt * 5))
          done
          echo "::error::gh-pages push failed after 5 attempts." >&2
          exit 1
```


`pages.yml` (latest catalog at the `gh-pages` root):

```yaml
name: Pages

on:
  push:
    branches: [<default-branch>]

concurrency:
  group: gh-pages-root
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  build:
    # Untrusted: dependency and repo scripts run here. No secrets, no App token.
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false

      - uses: pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda # v4.1.0
        with:
          version: 11.22.0

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: pnpm

      - name: Validate, test, build
        run: |
          set -euo pipefail
          pnpm install --frozen-lockfile
          pnpm validate
          pnpm test
          pnpm build

      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: catalog
          path: dist/
          if-no-files-found: error
          retention-days: 1

  deploy:
    # Runs no repo code: only the App token, gh, and git touch the output.
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: catalog
          path: site-content/

      # Minted right before the only step that writes.
      - uses: actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510 # v3.3.0
        id: app-token
        with:
          app-id: ${{ vars.RELEASE_APP_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: ${{ github.event.repository.name }}
          permission-contents: write

      # Same run block as snapshot.yml's "Publish to gh-pages".
      - name: Publish to gh-pages
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          APP_SLUG: ${{ steps.app-token.outputs.app-slug }}
          VERSION: ''
          SOURCE_SHA: ${{ github.sha }}
          DEFAULT_BRANCH: <default-branch>
        run: |
          set -euo pipefail
          auth="$(printf 'x-access-token:%s' "${GH_TOKEN}" | base64 -w0)"
          echo "::add-mask::${auth}"
          # Step-scoped git config: the token is never in a URL or on disk; no hooks.
          export GIT_CONFIG_COUNT=2
          export GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}"
          export GIT_CONFIG_KEY_1=core.hooksPath GIT_CONFIG_VALUE_1=/dev/null
          url="https://github.com/${GITHUB_REPOSITORY}.git"
          user_id="$(gh api "/users/${APP_SLUG}[bot]" --jq .id)"
          for attempt in 1 2 3 4 5; do
            rm -rf site
            if git ls-remote --exit-code --heads "${url}" gh-pages > /dev/null; then
              git clone --quiet --depth 1 --branch gh-pages "${url}" site
            else
              git init --quiet -b gh-pages site && git -C site remote add origin "${url}"
            fi
            if [[ -n "${VERSION}" ]]; then
              dest="site/releases/${VERSION}"
              if [[ -d "${dest}" ]]; then
                # Write-once: compare every file, not just manifest.json.
                diff -r "${dest}" site-content > /dev/null \
                  || { echo "::error::releases/${VERSION} differs from the Release archive." >&2; exit 1; }
              else
                mkdir -p "${dest}" && cp -a site-content/. "${dest}/"
              fi
            fi
            # Stale-root guard, re-checked right before every push attempt.
            tip="$(git ls-remote "${url}" "refs/heads/${DEFAULT_BRANCH}" | cut -f1)"
            if [[ "${tip}" == "${SOURCE_SHA}" ]]; then
              find site -mindepth 1 -maxdepth 1 ! -name .git ! -name releases ! -name CNAME -exec rm -rf {} +
              cp -a site-content/. site/
            else
              echo "Root left alone: ${DEFAULT_BRANCH} is at ${tip}, not ${SOURCE_SHA}."
            fi
            git -C site add -A
            if git -C site diff --cached --quiet; then echo "gh-pages is up to date."; exit 0; fi
            git -C site -c user.name="${APP_SLUG}[bot]" \
              -c user.email="${user_id}+${APP_SLUG}[bot]@users.noreply.github.com" \
              commit --quiet --no-verify -m "deploy: ${VERSION:-root} from ${SOURCE_SHA}"
            if git -C site push --quiet --no-verify origin gh-pages; then exit 0; fi
            echo "gh-pages push rejected (attempt ${attempt}); retrying on the new tip."
            sleep $((attempt * 5))
          done
          echo "::error::gh-pages push failed after 5 attempts." >&2
          exit 1
```

---

## 2. Release design (singleton-release App)

Default-branch protection (CodeRabbit required) **cannot** be bypassed by
`secrets.GITHUB_TOKEN` or a PAT. The release commit/tag/push uses the org
**singleton-release** GitHub App only.

Shared with [`publish-npm-library`](../publish-npm-library/SKILL.md). Rules:

| Rule | Requirement |
|------|-------------|
| Workflow `permissions` | `contents: read`; `id-token: write` **only** on the `publish` job, never on `prepare` |
| Checkout | `ref: <default-branch>`, `persist-credentials: false`; checkout's own authenticated fetch picks the revision (no extra unauthenticated `git fetch`) |
| `prepare` (untrusted) | Install, **validate, build, test, `prepublishOnly`**, `pnpm release:bump` (version + `CHANGELOG.md`), and `npm pack --ignore-scripts`. No `id-token`, no App token, **no `secrets.*`**. Hands the tarball, `package.json`, `CHANGELOG.md`, and release notes to `publish` as one artifact |
| `publish` (no repo code) | No install, no `node` / `pnpm` / `npx`, no repo scripts, hooks, or config loaders, no `cache:`. The checkout is data for git only |
| Secrets | `secrets.RELEASE_APP_PRIVATE_KEY` only in `publish` / `deploy` jobs; the credential check is the first step of `publish`, before checkout |
| Token | `actions/create-github-app-token` with `vars.RELEASE_APP_ID` + `secrets.RELEASE_APP_PRIVATE_KEY`, minted **last**, after every setup step and after the local commit and tag |
| gh-pages / Release assets | Same App token, in `deploy` jobs that run no repo code; App stays installed with Contents read/write |
| Scope | This repo only (`repositories: ${{ github.event.repository.name }}`), `permission-contents: write` |
| Identity | Release commit: static `singleton-release[bot]` (user id `356768209`), so no API call happens before minting. `deploy` jobs pass `app-slug` through `env:`, never inline `${{ }}` in scripts |
| Commit / push | `git commit --no-verify`, `git tag -a <version> -m v<version>`, then `git -c http.https://github.com/.extraheader=… push --atomic --no-verify origin HEAD:<default-branch> refs/tags/<version>` |
| Push auth | Token only in a per-command `-c` extraheader (step-scoped `GIT_CONFIG_*` env for `gh-pages`), never in a URL or on disk |
| Hooks | No install, so no husky; the commit step still sets `core.hooksPath=/dev/null` (`--no-verify` does not skip `prepare-commit-msg` or `post-commit`) |
| npm / Release | `npm publish <tarball> --ignore-scripts` (OIDC, outside the checkout, no App token in its env), then `gh release create <version> --verify-tag` |
| Recovery | Tag on GitHub but npm publish or GitHub Release missing → `workflow_dispatch` with `recover_version` + `recover_sha`; never on push |
| Fallback | **None**. Missing App id/key fails the job. No `secrets.GITHUB_TOKEN`, `github.token`, or PAT in any release or deploy step |
| Actions | Pin every `uses:` to a commit SHA; comment the exact tag (`v4.4.0`) |
| Skip loop | Skip when the head commit starts with `chore(release):` |

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
          # Do NOT set registry-url — breaks OIDC Trusted Publishing.

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build, test, and prepublish
        run: |
          set -euo pipefail
          pnpm validate
          pnpm test
          pnpm build
          pnpm run --if-present prepublishOnly

      - name: Bump version and changelog, then pack
        id: pack
        env:
          RECOVER: ${{ steps.rev.outputs.recover }}
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          # release-it with commit, tag, push, npm publish, and GitHub Release off
          # (see .release-it.js). A recovery run packs the tagged release commit as is.
          [[ "${RECOVER}" == true ]] || pnpm release:bump
          version="$(node -p 'require("./package.json").version')"
          semver='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'
          [[ "${version}" =~ ${semver} ]] || fail "package.json has no valid version: '${version}'."
          out="${RUNNER_TEMP}/release-files"
          mkdir -p "${out}"
          # Lifecycle scripts already ran above; the tarball is final.
          tarball="$(npm pack --ignore-scripts --pack-destination "${out}" | tail -n1)"
          cp package.json CHANGELOG.md "${out}/"
          awk '/^##? / { if (found) exit; found=1 } found { print }' CHANGELOG.md > "${out}/release-notes.md"
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
          # Node 22 ships npm 10; Trusted Publishing needs npm ≥ 11.5.1.
          npm install -g npm@11.5.1
          npm --version
          for npmrc in "$PWD/.npmrc" "$(npm config get userconfig)" "$(npm config get globalconfig)"; do
            if [[ -f "$npmrc" ]] && grep -qE 'always-auth|^//registry\.npmjs\.org|_authToken' "$npmrc"; then
              echo "Refusing to publish with an auth .npmrc: $npmrc" >&2
              exit 1
            fi
          done

      - name: Commit and tag the prepared release
        id: plan
        env:
          VERSION: ${{ needs.prepare.outputs.version }}
          PACKAGE: ${{ needs.prepare.outputs.package }}
          PREPARED_SHA: ${{ needs.prepare.outputs.sha }}
          RECOVER: ${{ needs.prepare.outputs.recover }}
          DEFAULT_BRANCH: <default-branch>
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          files="${RUNNER_TEMP}/release-files"
          code="$(curl -sS --connect-timeout 10 --max-time 30 -o /dev/null -w '%{http_code}' \
            "https://registry.npmjs.org/${PACKAGE/\//%2f}/${VERSION}")" || fail "npm registry probe failed."
          [[ "${code}" == 200 || "${code}" == 404 ]] || fail "npm registry probe returned ${code}."
          echo "npm=${code}" >> "$GITHUB_OUTPUT"
          if [[ "${RECOVER}" == true ]]; then
            # prepare checked that the tag is the release commit on top of recover_sha.
            [[ "$(git rev-parse "refs/tags/${VERSION}^{commit}^")" == "${PREPARED_SHA}" ]] \
              || fail "Tag ${VERSION} is not the release commit on top of ${PREPARED_SHA}."
            echo "push=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          [[ "$(git rev-parse HEAD)" == "${PREPARED_SHA}" ]] \
            || fail "${DEFAULT_BRANCH} moved after prepare; the newer run releases it."
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
          # Outside the checkout, so no repo package.json or .npmrc is read.
          cd "${RUNNER_TEMP}/release-files"
          npm publish "./${TARBALL}" --ignore-scripts --access public

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

Pin **all** `uses:` to commit SHAs and name the **exact tag** in the comment
(`v4.4.0`, not `v4`). Do not leave `@v4` floating.

`prepare` references **no `secrets.*`** and no App token: it runs dependency
install scripts, tests, the build, and the version bump. `publish` runs no
repo code, so the App token is never live while anything from the repo
executes. Its credential check is the first step, before checkout, and it has
no `cache:` (the untrusted `prepare` job writes the pnpm cache). `dist/` must
be in `.gitignore` so the bump's `requireCleanWorkingDir` check passes after
the build.

release-it (single package) only bumps the version and writes `CHANGELOG.md`
in `prepare` (`"release:bump": "release-it --ci"`). It never commits, tags,
pushes, publishes, or creates the GitHub Release:

```js
export default {
  git: {
    requireBranch: '<default-branch>',
    requireCleanWorkingDir: true,
    commit: false, // publish job: git commit --no-verify
    tag: false, // publish job: git tag -a <version> -m v<version>
    push: false, // publish job: atomic push with the App token
  },
  npm: { publish: false, skipChecks: true }, // publish job: npm publish <tarball> --ignore-scripts
  github: { release: false }, // publish job: gh release create --verify-tag
  plugins: {
    '@release-it/conventional-changelog': {
      infile: 'CHANGELOG.md',
      preset: { name: 'conventionalcommits' },
    },
  },
};
```

The release commit is `chore(release): v<version> [skip ci]` and the tag is the
bare version. The `gh release create` call uses the App token, so it triggers
`snapshot.yml` (a `GITHUB_TOKEN` Release would not).

`publish` pushes **before** it publishes, so a failure leaves at most a tag
without its npm version or GitHub Release. Checks, in order, all failing
closed:

1. `prepare` validates the version from `package.json` as strict semver.
2. The npm registry probe (`--connect-timeout 10 --max-time 30`) of the version
   document returns **200** or **404**; anything else fails.
3. Normal run: `<default-branch>` still points at the prepared commit, the tag
   does not exist yet, and npm says **404** (a version on npm without its tag
   stops the run for a maintainer to investigate).
4. After minting: the latest earlier tag has a GitHub Release. If a run pushed
   a tag but did not finish, the next run stops instead of cutting another
   version and names the recovery dispatch (or create the Release by hand:
   `gh release create <tag> --verify-tag`, which also triggers `snapshot.yml`).
5. `<default-branch>` is re-read on origin right before the atomic push.

**Recovery** (`workflow_dispatch` only, both inputs required): `recover_version`
is the stuck tag and `recover_sha` the commit the failed run prepared (its log
line `Preparing <sha>`; also the tag's parent). `prepare` checks that the tag
is the `chore(release)` commit on top of `recover_sha` and packs that commit
without bumping; `publish` checks that origin's tag matches, skips the push,
publishes only if npm says 404, and creates the GitHub Release only if it is
missing.

OIDC npm publish, `npm.skipChecks`, and auth-`.npmrc` fail-closed checks:
[`publish-npm-library`](../publish-npm-library/SKILL.md). Do not set `NPM_TOKEN`.

---

## 3. Pre-merge setup checklist

Complete **before** merging the first real release workflow to
`<default-branch>`:

1. **Install the singleton-release GitHub App** on this repo (org App). Set
   repository variable `RELEASE_APP_ID` and secret `RELEASE_APP_PRIVATE_KEY`.
   Keep it installed with **Contents: read and write**: releases, `gh-pages`
   pushes, and Release assets all go through it. Never commit or print the
   private key. GitHub may ask for **sudo**
   confirmation (Pato's authenticator).
2. **One-time npm placeholder `0.0.0`.** npm cannot attach a trusted publisher
   until the package exists. A **maintainer** runs this **locally once**
   (browser / 2FA / OTP). Agents do not publish from a laptop token:

   ```sh
   # package.json version is 0.0.0; maintainer only
   pnpm build
   npm publish --access public
   ```

   The registry can take a **few minutes** to show `0.0.0` (website and
   `npm view` may 404 while `GET /@scope%2fname/0.0.0` already returns 200).
   Wait and verify the version document before adding the trusted publisher.
   Then let CI publish later versions.
3. **npm trusted publisher** — GitHub Actions, org `singleton-sd`, repository
   **name only**, workflow filename `release.yml`, Environment empty unless the
   workflow uses one, allow `npm publish`.
4. **DNS CNAME** — **Singleton Server** (the infrastructure bot) creates the
   Route 53 record. Ask it for:

   | Name | Type | Value | TTL |
   |------|------|-------|-----|
   | `assets.<product>.poc.singletonsd.com` | `CNAME` | `singleton-sd.github.io` | `300` |

   Do not create the record yourself. Do not proceed as if DNS is done until
   **Pato confirms the CNAME in his own words**. See
   [`engineering/route53-subdomains`](../route53-subdomains/SKILL.md) for how
   credentialed DNS changes work — this step still needs that confirmation.
5. **CodeRabbit required ruleset** on `<default-branch>`, copied from
   [`singleton-sd/poc-inkads-assets` ruleset `27247890`](https://github.com/singleton-sd/poc-inkads-assets/settings/rules/27247890).
   Put the **singleton-release** GitHub App on the bypass list. Do not add
   `.coderabbit.yaml`. GitHub may prompt for **sudo** confirmation when
   installing the App or saving the ruleset — that needs **Pato's
   authenticator**.

---

## 4. After the first release

After `release.yml` has produced the first GitHub Release and `snapshot.yml`
has pushed `gh-pages`:

1. **Settings → Pages** → Deploy from a **branch** → `gh-pages` / `/` (root).
   Do not select “GitHub Actions” as the source.
2. Custom domain: `assets.<product>.poc.singletonsd.com`.
3. **Enforce HTTPS** once GitHub has issued the certificate.

Verify: CNAME target `singleton-sd.github.io.`, HTTPS 200 on `/` and on
`/releases/<tag>/manifest.json`.

---

## Agent checklist

```text
Set up a product assets repo:
- [ ] Copied recipe without history; <product> metadata + approved src
- [ ] validate / test / build clean; dist/manifest.json
- [ ] pages.yml → gh-pages root (keeps releases/ + CNAME); group gh-pages-root
- [ ] snapshot.yml on release:published; idempotent (Release archive is source
      of truth); write-once releases/<v> (diff -r); per-tag group
- [ ] deploy jobs: no repo code; contents:read; singleton-release App token
      minted before the writing steps; no github.token / GITHUB_TOKEN; push
      retries, never force; stale-root guard at push time
- [ ] release.yml: prepare job (no secrets, no id-token): validate, test,
      build, release:bump, npm pack --ignore-scripts → artifact → publish job
      (credential check first, id-token, no install/node/pnpm, no cache):
      commit --no-verify + tag -a, App token minted last, extraheader
      --atomic --no-verify push, npm publish <tarball> --ignore-scripts,
      gh release create --verify-tag; npm@11.5.1 + auth-npmrc refuse;
      recover_version + recover_sha on dispatch only; dist/ gitignored
- [ ] App installed (Contents read/write); RELEASE_APP_ID + RELEASE_APP_PRIVATE_KEY (Pato sudo if asked)
- [ ] Maintainer published npm 0.0.0; waited for registry; trusted publisher
- [ ] DNS CNAME via Singleton Server; Pato confirmed in his own words
- [ ] CodeRabbit ruleset copied from poc-inkads-assets 27247890; App on bypass
- [ ] After first release: Pages from gh-pages, custom domain, HTTPS
```

## Related

- Recipe: `singleton-sd/design-system/assets` `docs/product-assets-recipe.md`
- npm OIDC + App-token git push: [`publish-npm-library`](../publish-npm-library/SKILL.md)
- DNS (after owner confirmation): [`route53-subdomains`](../route53-subdomains/SKILL.md)
