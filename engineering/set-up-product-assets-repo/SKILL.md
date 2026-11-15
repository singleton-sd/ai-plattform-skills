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
publisher. Snapshots must sit beside the latest root (`clean-exclude: releases`
and `CNAME`).

Wire three workflows (pin every `uses:` to a commit SHA). In `pages.yml` and
`snapshot.yml` a `build` job (`contents: read`) validates, tests, builds, and
uploads `dist/` as an artifact; a separate `deploy` job is the only writer.

1. **`pages.yml`** — on push to `<default-branch>`: deploy `dist/` to the
   `gh-pages` root with `clean: true` and `clean-exclude: releases` + `CNAME`.
2. **`snapshot.yml`** — on `release: published` (not tag push: the release commit
   is `chore(release): v${version} [skip ci]`, which skips tag-push CI):
   - Parse a stable semver tag; reject prereleases.
   - The Release archive is the source of truth, so a re-run is idempotent. If
     `<product>-assets-<version>.tar.gz` is already on the Release, download it
     with its `.sha256`, run `sha256sum -c`, and extract it as the snapshot
     (archive without checksum → fail closed). Otherwise `tar -czf` the built
     `dist/`, write `sha256sum`, and `gh release upload` the archive, checksum,
     and `dist/manifest.json` (never `--clobber`).
   - Probe `GET …/contents/releases/<version>/manifest.json?ref=gh-pages`.
     **404** → publish. **200** with the same bytes as the snapshot's
     `manifest.json` → already published, skip. **200** and different → fail.
     Any other status → fail closed.
   - Publish `target-folder: releases/<version>` with `clean: false`, then
     refresh the root under the stale-root guard below.
3. **`release.yml`** — section 2 below.

### gh-pages writers

- **Credentials.** `gh` is unauthenticated in Actions unless `GH_TOKEN` is set,
  and the default job token is read-only. Give **only** the `deploy` job
  `permissions: contents: write` and pass the job token explicitly:
  `GH_TOKEN: ${{ github.token }}` for `gh release view/download/upload` and
  `gh api`, `token: ${{ github.token }}` for the deploy action. That token
  writes `gh-pages` and Release assets only; keep `gh-pages` out of the
  default-branch ruleset. It never pushes `<default-branch>` (section 2).
- **One writer at a time.** Both deploy jobs use the same
  `concurrency: { group: gh-pages, cancel-in-progress: false }` and deploy with
  `force: false`, so the action rebases onto a concurrent push (up to
  `attempt-limit` times) instead of overwriting it. GitHub keeps one *pending*
  run per group and cancels the older pending one: a superseded `pages.yml`
  run is harmless; re-run a cancelled `snapshot.yml` (it is idempotent).
- **Stale-root guard.** Refresh the root only when the artifact's source commit
  (`github.sha`; for `release` events that is the tagged commit) is still the
  tip of `<default-branch>`. Otherwise skip it: the newer commit's run owns
  the root. The check runs inside the serialized job, so an older build cannot
  replace a newer root.

```yaml
  deploy: # pages.yml; snapshot.yml first deploys releases/<version>, then this
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: write # gh-pages and Release assets only
    concurrency:
      group: gh-pages # same group in pages.yml and snapshot.yml
      cancel-in-progress: false
    steps:
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: catalog
          path: dist/

      - name: Stale-root guard
        id: guard
        env:
          GH_TOKEN: ${{ github.token }}
          SOURCE_SHA: ${{ github.sha }}
        run: |
          set -euo pipefail
          tip="$(gh api "repos/${GITHUB_REPOSITORY}/commits/<default-branch>" --jq .sha)"
          if [[ "${tip}" == "${SOURCE_SHA}" ]]; then root=true; else root=false; fi
          echo "root=${root}" >> "$GITHUB_OUTPUT"

      - if: steps.guard.outputs.root == 'true'
        uses: JamesIves/github-pages-deploy-action@fa24774553152dd7873cd16ebd8d959b010c5445 # v4.9.0
        with:
          token: ${{ github.token }}
          branch: gh-pages
          folder: dist
          clean: true
          clean-exclude: |
            releases
            CNAME
          force: false
          attempt-limit: 5
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
| Unauthenticated work | Install, **validate, build, test, and `prepublishOnly`** run in the `build` job (no `id-token`, no App token) and hand `dist/` to `release` as an artifact. `release` installs and publishes with `--ignore-scripts` |
| Token | `actions/create-github-app-token` with `vars.RELEASE_APP_ID` + `secrets.RELEASE_APP_PRIVATE_KEY`, minted right before the Release step |
| Scope | This repo only (`repositories: ${{ github.event.repository.name }}`), `permission-contents: write` |
| Identity | Pass `app-slug` (and app id when used in `run:`) through `env:`, never inline `${{ }}` in scripts |
| Commit / push | `git commit --no-verify`, `git push --follow-tags --atomic --no-verify` (release-it `commitArgs` / `pushArgs`) |
| Push auth | Token in `http.https://github.com/.extraheader`, never in the origin URL; removed under `if: always()` |
| Hooks | `HUSKY: '0'` and `core.hooksPath=/dev/null`: `--no-verify` does not skip `prepare-commit-msg` or `post-commit` |
| `.release-it.js` | Declarative only: no `hooks`, functions, or imports beyond the changelog plugin |
| Recovery | Version on npm but missing in git → `workflow_dispatch` with `recover_version` |
| Fallback | **None**. Missing App id/key fails the job. Do not use `secrets.GITHUB_TOKEN` or a PAT |
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

concurrency:
  group: release-<default-branch>
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  build:
    # No id-token and no App token: dependency and repo scripts run only here.
    if: "${{ github.event_name == 'workflow_dispatch' || !startsWith(github.event.head_commit.message, 'chore(release):') }}"
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.rev.outputs.sha }}
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

      # checkout's own fetch uses the read-only job token (private repos work);
      # persist-credentials: false removes it. No separate unauthenticated fetch.
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: <default-branch>
          fetch-depth: 0
          persist-credentials: false

      - id: rev
        run: echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"

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
          cache: pnpm

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
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          HUSKY: '0'
          RECOVER_VERSION: ${{ inputs.recover_version }}
        run: |
          set -euo pipefail
          # Token in an extraheader, never in the origin URL; no repo git hooks.
          auth="$(printf 'x-access-token:%s' "${GH_TOKEN}" | base64 -w0)"
          echo "::add-mask::${auth}"
          git config --local http.https://github.com/.extraheader "AUTHORIZATION: basic ${auth}"
          git config --local core.hooksPath /dev/null
          next="$(pnpm exec release-it --ci --release-version | tail -n1)"
          name="$(node -p 'require("./package.json").name')"
          code="$(curl -sS -o /dev/null -w '%{http_code}' "https://registry.npmjs.org/${name/\//%2f}/${next}")"
          case "${code}" in
            404) pnpm release:ci ;;
            200)
              # npm has this version but its push failed: finish git + GitHub Release only.
              if [[ "${RECOVER_VERSION}" != "${next}" ]]; then
                echo "::error::${next} is on npm without its tag. Re-run with recover_version=${next}." >&2
                exit 1
              fi
              pnpm release:ci --npm.publish=false ;;
            *)
              echo "::error::npm registry probe returned ${code}." >&2
              exit 1 ;;
          esac

      - name: Remove push credentials
        if: always()
        run: git config --local --unset-all http.https://github.com/.extraheader || true
```

Pin **all** `uses:` to commit SHAs and name the **exact tag** in the comment
(`v4.4.0`, not `v4`). Do not leave `@v4` floating.

release-it (single package). The commit message below is **only** for the
workflow's release commit.

`pnpm release:ci` runs while `GITHUB_TOKEN` / `GH_TOKEN` and the git
extraheader hold the App token. **Do not** add release-it `hooks` that run
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
  github: { release: true, releaseName: 'v${version}' },
};
```

release-it 19 **npm-publishes before `git push`**. If the push fails, the
version is already immutable on npmjs and a plain re-run would fail on
`npm publish`. The Release step therefore probes
`GET https://registry.npmjs.org/@singleton-sd%2f<product>-assets/<next>` first:
**404** → normal release; **200** → fail, unless re-run via `workflow_dispatch`
with `recover_version=<next>`, which runs `release:ci --npm.publish=false` to
finish the bump commit, tag, push, and GitHub Release; anything else → fail
closed. Recover only if nothing has landed on `<default-branch>` since the
failed run, or the tag would point at code npm never shipped. If the tag was
pushed and only the GitHub Release is missing, create it from the tag
(`gh release create <tag> --verify-tag`); that also triggers `snapshot.yml`.

OIDC npm publish, `npm.skipChecks`, and auth-`.npmrc` fail-closed checks:
[`publish-npm-library`](../publish-npm-library/SKILL.md). Do not set `NPM_TOKEN`.

---

## 3. Pre-merge setup checklist

Complete **before** merging the first real release workflow to
`<default-branch>`:

1. **Install the singleton-release GitHub App** on this repo (org App). Set
   repository variable `RELEASE_APP_ID` and secret `RELEASE_APP_PRIVATE_KEY`.
   Never commit or print the private key. GitHub may ask for **sudo**
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
- [ ] pages.yml → gh-pages root; clean-exclude releases + CNAME
- [ ] snapshot.yml on release:published; idempotent (Release archive is source
      of truth, same-content guard); tar + sha256 + manifest, no --clobber
- [ ] gh-pages deploy jobs: contents:write + GH_TOKEN; shared gh-pages group;
      force: false; stale-root guard
- [ ] release.yml: build job (no id-token) → artifact → release job
      (id-token); App token minted last; npm@11.5.1 + auth-npmrc refuse;
      publishArgs --ignore-scripts (no release-it hooks); extraheader +
      --no-verify atomic push; recover_version; no GITHUB_TOKEN/PAT fallback
- [ ] App installed; RELEASE_APP_ID + RELEASE_APP_PRIVATE_KEY (Pato sudo if asked)
- [ ] Maintainer published npm 0.0.0; waited for registry; trusted publisher
- [ ] DNS CNAME via Singleton Server; Pato confirmed in his own words
- [ ] CodeRabbit ruleset copied from poc-inkads-assets 27247890; App on bypass
- [ ] After first release: Pages from gh-pages, custom domain, HTTPS
```

## Related

- Recipe: `singleton-sd/design-system/assets` `docs/product-assets-recipe.md`
- npm OIDC + App-token git push: [`publish-npm-library`](../publish-npm-library/SKILL.md)
- DNS (after owner confirmation): [`route53-subdomains`](../route53-subdomains/SKILL.md)
