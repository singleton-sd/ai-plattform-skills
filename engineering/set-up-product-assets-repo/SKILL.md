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
| `leasemate-assets` | `gh-pages` + snapshot + App-token `release.yml` | LeaseMate names, colours, DNS host |

npm publish details (OIDC, `.npmrc`, first-publish):
[`engineering/publish-npm-library`](../publish-npm-library/SKILL.md).
This skill owns Pages snapshots, DNS/Pages go-live, and the App-token **git**
push. Use `<product>` placeholders; examples (`inkads`, `leasemate`) are not
defaults.

Do **not** put `[skip ci]` / `[ci skip]` in feature commits. That string appears
only in the documented **release-it** commit message below.

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
   below without the tag parse and the "Release assets" step. Download the
   artifact straight into `site-content/`, set `VERSION: ''`, and use
   `concurrency: { group: gh-pages-root, cancel-in-progress: false }` (a newer
   pending root deploy replacing an older pending one is fine).
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

---

## 2. Release design (singleton-release App)

Default-branch protection (CodeRabbit required) **cannot** be bypassed by
`secrets.GITHUB_TOKEN` or a PAT. The release commit/tag/push uses the org
**singleton-release** GitHub App only.

Shared with [`publish-npm-library`](../publish-npm-library/SKILL.md). Rules:

| Rule | Requirement |
|------|-------------|
| Workflow `permissions` | `contents: read`; `id-token: write` **only** on the `release` job, never on `build` |
| Checkout | `ref: <default-branch>`, `persist-credentials: false`; checkout's own authenticated fetch picks the revision (no extra unauthenticated `git fetch`) |
| Unauthenticated work | Install, **validate, build, test, and `prepublishOnly`** run in the `build` job (no `id-token`, no App token, **no `secrets.*`**) and hand `dist/` to `release` as an artifact. `release` installs and publishes with `--ignore-scripts` and has no `cache:` |
| Secrets | `secrets.RELEASE_APP_PRIVATE_KEY` only in `release` / `deploy` jobs; the credential check is the first step of `release`, before checkout |
| Token | `actions/create-github-app-token` with `vars.RELEASE_APP_ID` + `secrets.RELEASE_APP_PRIVATE_KEY`, minted right before the step that writes |
| gh-pages / Release assets | Same App token, in `deploy` jobs that run no repo code; App stays installed with Contents read/write |
| Scope | This repo only (`repositories: ${{ github.event.repository.name }}`), `permission-contents: write` |
| Identity | Pass `app-slug` (and app id when used in `run:`) through `env:`, never inline `${{ }}` in scripts |
| Commit / push | `git commit --no-verify`, `git push --follow-tags --atomic --no-verify` (release-it `commitArgs` / `pushArgs`) |
| Push auth | Token in `http.https://github.com/.extraheader` (step-scoped `GIT_CONFIG_*` env for `gh-pages`), never in a URL; removed under `if: always()` |
| Hooks | `HUSKY: '0'` and `core.hooksPath=/dev/null`: `--no-verify` does not skip `prepare-commit-msg` or `post-commit` |
| `.release-it.js` | Declarative only: no `hooks`, functions, or imports beyond the changelog plugin |
| Recovery | Version on npm but missing in git → `workflow_dispatch` with `recover_version` + `recover_sha`; never on push |
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
        description: Version already on npm whose release commit, tag, or GitHub Release is missing
        required: false
        default: ''
      recover_sha:
        description: Source commit the failed run built (its build job logs it)
        required: false
        default: ''

concurrency:
  group: release-<default-branch>
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  build:
    # Untrusted: dependency and repo scripts run here. No secrets, App token, or id-token.
    if: "${{ github.event_name == 'workflow_dispatch' || !startsWith(github.event.head_commit.message, 'chore(release):') }}"
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.rev.outputs.sha }}
    steps:
      # checkout's own fetch uses the read-only job token (private repos work);
      # persist-credentials: false removes it. No separate unauthenticated fetch.
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: <default-branch>
          fetch-depth: 0
          persist-credentials: false

      - id: rev
        run: |
          sha="$(git rev-parse HEAD)"
          echo "Building ${sha} (recover_sha if this run's push fails)"
          echo "sha=${sha}" >> "$GITHUB_OUTPUT"

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

      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: release-dist
          path: dist/
          if-no-files-found: error
          retention-days: 1

  release:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write # only this job can request the npm OIDC token
    steps:
      # Runs before any repo code is checked out.
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

      - name: Verify release revision
        env:
          BUILT_SHA: ${{ needs.build.outputs.sha }}
        run: |
          set -euo pipefail
          if [[ "$(git rev-parse HEAD)" != "${BUILT_SHA}" ]]; then
            echo "::error::<default-branch> moved after the build; the newer run releases it." >&2
            exit 1
          fi

      - uses: pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda # v4.1.0
        with:
          version: 11.22.0

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          # No cache here: the untrusted build job writes the pnpm cache.

      - name: Install release tooling (no lifecycle scripts)
        run: pnpm install --frozen-lockfile --ignore-scripts

      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: release-dist
          path: dist/

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

      # Minted last, right before the only step that pushes and publishes.
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
          GH_TOKEN: ${{ steps.app-token.outputs.token }} # release-it reads it via tokenRef
          HUSKY: '0'
          EVENT_NAME: ${{ github.event_name }}
          RECOVER_VERSION: ${{ inputs.recover_version }}
          RECOVER_SHA: ${{ inputs.recover_sha }}
          DEFAULT_BRANCH: <default-branch>
        run: |
          set -euo pipefail
          fail() { echo "::error::$*" >&2; exit 1; }
          # Token in an extraheader, never in the origin URL; no repo git hooks.
          auth="$(printf 'x-access-token:%s' "${GH_TOKEN}" | base64 -w0)"
          echo "::add-mask::${auth}"
          git config --local http.https://github.com/.extraheader "AUTHORIZATION: basic ${auth}"
          git config --local core.hooksPath /dev/null
          head="$(git rev-parse HEAD)"
          tip="$(git ls-remote origin "refs/heads/${DEFAULT_BRANCH}" | cut -f1)"
          [[ "${tip}" == "${head}" ]] || fail "${DEFAULT_BRANCH} moved to ${tip}; the newer run releases it."
          last_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"
          if [[ -n "${last_tag}" ]] && ! gh release view "${last_tag}" >/dev/null; then
            fail "Tag ${last_tag} has no GitHub Release. Run: gh release create ${last_tag} --verify-tag"
          fi
          next="$(pnpm exec release-it --ci --release-version | tail -n1)"
          semver='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'
          [[ "${next}" =~ ${semver} ]] || fail "release-it printed no valid next version: '${next}'."
          recover=false
          if [[ -n "${RECOVER_VERSION}${RECOVER_SHA}" ]]; then
            [[ "${EVENT_NAME}" == workflow_dispatch && "${RECOVER_VERSION}" == "${next}" && "${RECOVER_SHA}" == "${head}" ]] \
              || fail "Recovery needs a workflow_dispatch with recover_version=${next} and recover_sha set to the failed run's built sha, which must still be the tip."
            recover=true
          fi
          name="$(node -p 'require("./package.json").name')"
          code="$(curl -sS --connect-timeout 10 --max-time 30 -o /dev/null -w '%{http_code}' \
            "https://registry.npmjs.org/${name/\//%2f}/${next}")" || fail "npm registry probe failed."
          case "${code}:${recover}" in
            404:false) pnpm release:ci ;;
            # npm has this version but its push failed: finish git + GitHub Release only.
            200:true) pnpm release:ci --npm.publish=false ;;
            200:false) fail "${next} is on npm without its tag. Dispatch with recover_version=${next} and recover_sha=<failed run's built sha>." ;;
            404:true) fail "${next} is not on npm; nothing to recover." ;;
            *) fail "npm registry probe returned ${code}." ;;
          esac

      - name: Remove push credentials
        if: always()
        run: git config --local --unset-all http.https://github.com/.extraheader || true
```

Pin **all** `uses:` to commit SHAs and name the **exact tag** in the comment
(`v4.4.0`, not `v4`). Do not leave `@v4` floating.

The `build` job references **no `secrets.*`** and no App token: it runs
dependency install scripts, tests, and the build. The credential check is the
first step of `release`, before checkout. `release` has no `cache:` (the
untrusted build job writes the pnpm cache). `dist/` must be in `.gitignore`,
or release-it's `requireCleanWorkingDir` fails after the artifact download.

release-it (single package). The commit message below is **only** for the
workflow's release commit.

`pnpm release:ci` runs while `GH_TOKEN` (release-it `github.tokenRef`) and the
git extraheader hold the App token. **Do not** add release-it `hooks` that run
validate / test / build / prepublish — those would execute after minting.
`publishArgs: ['--ignore-scripts']` stops `npm publish` from re-running
`prepublishOnly`, `prepack`, and `prepare`. That is what makes “build, test,
and prepublish **before minting**” true. (Monorepos that drive publish in
their own script can instead strip the App token from the publish env, as
`post-kit` does.)

The same Release step must not run **git hooks**. `engineering/repo-init`
installs husky (`prepare: husky`; pre-commit, commit-msg, post-checkout via
ts-node). `pnpm install` in CI activates them, so release-it's git commit
and push would execute repo hook scripts while the App token is live. Set
`HUSKY: '0'` on the Release step, `git.commitArgs: ['--no-verify']`, and add
`--no-verify` to `git.pushArgs`. `--no-verify` skips only `pre-commit`,
`commit-msg`, and `pre-push`; `prepare-commit-msg` and `post-commit` still run,
so the step also sets `core.hooksPath=/dev/null`. Keep `.release-it.js`
declarative (plain options, as below): it loads while the App token is live.

```js
export default {
  git: {
    commitMessage: 'chore(release): v${version} [skip ci]',
    tagName: '${version}',
    requireBranch: '<default-branch>',
    requireCleanWorkingDir: true,
    commit: true,
    push: true,
    tag: true,
    commitArgs: ['--no-verify'],
    pushArgs: ['--follow-tags', '--atomic', '--no-verify'],
  },
  npm: {
    publish: true,
    skipChecks: true,
    publishArgs: ['--ignore-scripts'],
  },
  github: { release: true, releaseName: 'v${version}', tokenRef: 'GH_TOKEN' },
};
```

release-it 19 **npm-publishes before `git push`**. If the push fails, the
version is already immutable on npmjs and a plain re-run would fail on
`npm publish`. The Release step checks, in order, and fails closed on anything
unexpected:

1. `<default-branch>` still points at the built commit (re-checked right before
   release-it, so the window for a racing merge is seconds).
2. The latest tag has a GitHub Release. If a run pushed the tag but not the
   Release, it stops instead of cutting another version: create the Release
   from the tag (`gh release create <tag> --verify-tag`); that also triggers `snapshot.yml`.
3. `next` from `release-it --release-version` is strict semver (empty output or
   a stray line such as `latest` would otherwise probe the package root).
4. Recovery inputs are accepted only on `workflow_dispatch`, with
   `recover_version` equal to `next` **and** `recover_sha` equal to the failed
   run's built SHA (its build job logs `Building <sha>`), which must still be
   the checked-out tip. The tag can therefore only land on the source npm
   shipped; if `<default-branch>` has moved since the failed run, recovery
   fails and a maintainer tags that commit by hand.
5. The registry probe (`--connect-timeout 10 --max-time 30`) of the
   `<next>` version document: **404** → normal release; **200** on a
   recovery dispatch → `release:ci --npm.publish=false` (bump commit, tag,
   push, GitHub Release); **200** otherwise → fail (a push can never take the
   recovery path); 404 on a recovery dispatch, or any other status → fail.

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
- [ ] release.yml: build job (no secrets, no id-token) → artifact → release
      job (credential check first, id-token, no cache); App token minted
      last; npm@11.5.1 + auth-npmrc refuse; publishArgs --ignore-scripts;
      extraheader + --no-verify atomic push; semver-checked next;
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
