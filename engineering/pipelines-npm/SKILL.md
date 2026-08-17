---
name: Pipelines npm
description: >-
  Include and configure Singleton SD GitLab CI templates from singletonsd/pipelines/npm
  for Node libraries — install, test, build, release, and dual publish to GitLab
  Package Registry and/or npmjs.org. Use when wiring a consumer .gitlab-ci.yml,
  setting ENABLE_RELEASE_* / NPMJS_* variables, or changing those templates.
tags: [engineering, npm, gitlab, ci, release, publish]
audience: [engineers, tech-leads]
status: stable
---

# Pipelines npm

GitLab CI templates for Node/npm consumer repos.

Canonical source: [singletonsd/pipelines/npm](https://gitlab.com/singletonsd/pipelines/npm). Agent contract in that repo: `AGENTS.md`. Consumer copy-paste: `examples/`.

Compose with [`engineering/repo-init-npm-publish`](engineering/repo-init-npm-publish/SKILL.md) when scaffolding a new publishable package.

## When to use

- Adding or editing `.gitlab-ci.yml` in a library/CLI that should use shared npm jobs
- Enabling GitLab and/or npmjs publish from `release_job`
- Changing templates in `singletonsd/pipelines/npm` (match `AGENTS.md` there)

## Consumer include

```yaml
image: "node:22-alpine"

include:
  - project: "singletonsd/pipelines/npm"
    file: "/src/.gitlab-ci-main.yml"

variables:
  GLOBAL_IMAGE_NAME: "node"
  GLOBAL_IMAGE_TAG: "22-alpine"
  ENABLE_RELEASE_JOB: "true"
  ENABLE_RELEASE_PUBLISH_ALL: "true"
  NPMJS_SCOPE: "singletonsd"
  PAGES_ENABLED: "false"

stages:
  - install
  - test_static
  - build
  - test_dynamic
  - release
  - package
  - deploy
```

Full snippets: `examples/.gitlab-ci-example-main.yml`, `examples/.gitlab-ci-example-common.yml`, `examples/.gitlab-ci-example-release.yml`.

The consumer must define `yarn release:ci` (usually release-it). Package name is always `package.json` `"name"` on every registry. Scopes (`RELEASE_GROUP_NAME`, `NPMJS_SCOPE`) must match that name.

## Publish flags

| Variable | Effect |
|----------|--------|
| `ENABLE_RELEASE_PUBLISH=true` | Legacy GitLab-only when the new flags are unset |
| `ENABLE_RELEASE_PUBLISH_ALL=true` | GitLab Package Registry and npmjs.org |
| `ENABLE_RELEASE_PUBLISH_GITLAB=true` | GitLab only |
| `ENABLE_RELEASE_PUBLISH_NPMJS=true` | npmjs only (`npm publish --access $NPMJS_ACCESS`) |

`NPMJS_ACCESS` defaults to `public`. `NPMJS_SCOPE` defaults to `RELEASE_GROUP_NAME`.

## Secrets (masked CI variables, never in YAML)

| Variable | Required when |
|----------|----------------|
| `SSH_PRIVATE_KEY` | `ENABLE_RELEASE_JOB=true` (push release commit/tag) |
| `NPMJS_TOKEN` | npmjs publish (`_ALL` or `_NPMJS`) |
| `NPM_TOKEN` | GitLab registry auth (defaults to `CI_JOB_TOKEN`) |

If npmjs publish is on and `NPMJS_TOKEN` is missing, `release_job` must fail before `yarn release:ci`.

The trigger flag is `RELEASE_TRIGGER_PIPELINE`. Do not use `NODE_COMMON_RELEASE_TRIGGER_PIPELINE` or `ORIGINAL_REPOSITORY` — those names are unused in the templates.

## Do not

- Invent a second package name for npmjs
- Commit tokens or rewrite `.npmrc` secrets into git
- Point one scope at two registries at once (the job rewrites `@scope:registry` between publishes)
- Treat `ENABLE_RELEASE_PUBLISH=true` as publish-everywhere (that remains GitLab-only)

## Related

- Common templates (Pages, AWS, YAML lint): `singletonsd/pipelines/common` (`AGENTS.md` there)
- New package scaffold: [`engineering/repo-init-npm-publish`](engineering/repo-init-npm-publish/SKILL.md)
