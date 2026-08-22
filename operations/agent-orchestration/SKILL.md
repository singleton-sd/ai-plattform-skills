---
name: Agent Orchestration
description: >-
  Coordinate multiple coding agents safely across host issues (GitHub or
  GitLab), git worktrees, dependency-aware execution, rebases, CI, and PR/MR
  handoff. Use when planning or running parallel implementation work across
  two or more issues or agents.
tags: [operations, agents, orchestration, git, worktrees, github, gitlab]
audience: [engineers, tech-leads, all]
status: stable
---

# Agent Orchestration

Use when work spans multiple host issues or multiple coding agents and the
main risk is coordination: stale branches, overlapping files, dependency
ordering, or PRs/MRs becoming unmergeable as the default branch moves.

This skill coordinates work. It does not replace `task-driven-development`.
Resolve `engineeringHost` via `.skills/profile` or
[`config/tracker-profiles/`](config/tracker-profiles/README.md). Read the
target repo `AGENTS.md` for worktree helpers and hub-file rules.

## Goals

- Maximise safe parallelism.
- Keep every agent isolated in its own git worktree and branch.
- Keep feature branches current with `origin/<default>`.
- Do not build on another agent's unmerged branch unless the issue declares that dependency and it is closed/merged.
- Keep CI and mergeability authoritative before handoff.
- Remove stale worktrees after merge or abandon.

## Repository workflow

1. Never work directly on `main` / `master`.
2. Fetch origin before starting.
3. Create each agent branch/worktree from current `origin/<default>`.
4. Before push: refresh from default branch, resolve conflicts per `AGENTS.md`, run relevant tests.
5. Open/update PR (GitHub) or MR (GitLab) with closing keyword linking the issue.
6. Wait for required CI; address feedback on your own PR/MR only.

## Branch and worktree naming

Prefer:

```text
<type>/<issue-number>-<kebab-title>
```

Use the repo's worktree helper when present (for example `pnpm worktree:add`);
otherwise `git worktree add` next to the default checkout per
`engineering/isolated-worktree`.

## Dependencies

Respect `Depends on:` / `Blocks:` / `Parent:` (or the repo's equivalent). Do
not start blocked work. Prefer parallel lanes only when file sets do not
substantially overlap hub paths listed in `AGENTS.md`.

## Agent-ready gate

Do not assign implementation agents to issues that lack clear goal, scope,
acceptance criteria, or that have unresolved blocking dependencies.

## Relationship to other skills

- `operations/task-driven-development` — per-issue implement loop
- `operations/pr-agent-wake` — fix an existing PR/MR after CI/feedback
- `engineering/isolated-worktree` — sibling worktree creation
