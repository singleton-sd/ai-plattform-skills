---
name: Task-Driven Development
description: >-
  Work through engineering issues one at a time with dependency checks, scoped
  staging, and review-ready commit messages. Use when implementing work from
  GitHub Issues, GitLab Issues, a backlog, or workflow document. Engineering
  host is GitHub or GitLab per the consumer .skills/profile — not ClickUp.
tags: [operations, tasks, workflow, github, gitlab, git]
audience: [engineers, tech-leads, all]
status: stable
---

# Task-Driven Development

Use this skill when implementing work from the **project host's** issue tracker.

## Resolve the engineering host

1. Read consumer `.skills/profile` when present (`engineeringHost`: `github` | `gitlab`).
2. Else infer from `git remote get-url origin` (`github.com` → github, `gitlab.com` → gitlab).
3. Load the matching profile under [`config/tracker-profiles/`](config/tracker-profiles/README.md).

| Host | CLI | Claim | Handoff |
|------|-----|-------|---------|
| GitHub | `gh` | Branch/worktree + open PR linking the issue | PR body `Closes #N` |
| GitLab | `glab` | Branch/worktree + open MR linking the issue | MR with closing keyword |

**ClickUp is not the engineering tracker.** Product features and optional tracking tickets live in ClickUp; see `operations/create-tracking-ticket`. Do not claim or hand off engineering work via ClickUp status or Claim Token.

Read the target repo `AGENTS.md` for worktree helpers, hub-file rules, and conflict playbooks.

Also apply [`engineering/isolated-worktree`](engineering/isolated-worktree/SKILL.md).

## Issue and chat titles

- Prefer the **issue title** as the primary label in chat and summaries.
- Numbers are fine in URLs, branch names (`<type>/<issue-number>-<kebab-title>`), and as secondary references.

## Out of scope → follow-up issues

When planning, every real **Out of scope** follow-up must become a host issue:

1. Search existing issues first — do not invent duplicates.
2. Create missing issues with acceptance criteria (`gh issue create` or `glab issue create`).
3. Wire dependencies in issue bodies (`Depends on: #N` / `Blocks: #N` / `Parent: #N` when the repo uses that convention).
4. Leave new backlog issues unclaimed.
5. Link new issues from the parent issue/PR/MR.

## Core rules

1. Gather context first:
   - List relevant open issues and dependency lines.
   - Read the selected issue body and comments before editing.
   - Inspect repo conventions and nearby code.
   - Create a sibling worktree from the latest default branch (repo helper or `git worktree add`).

2. Work one issue at a time:
   - Do not mix files for different issues in the same staged set.
   - Do not start the next issue until the current one is staged and summarized.

3. Readiness and claiming:
   - Agent-ready means: clear goal, scope, testable acceptance criteria, stated constraints, and no unresolved blocking `Depends on`.
   - Claim by creating the branch/worktree and opening a PR/MR that links the issue. There is no separate claim token.
   - If an open PR/MR already closes the issue, do not start a second one — use `pr-agent-wake` (or equivalent) instead.
   - Handoff is the linked PR/MR with a closing keyword. Merging closes the issue when the host is configured that way.
   - Review bots and humans review the PR/MR; agents address feedback on their own PR/MR.
   - Hub ownership: do not edit shared skill install trees or other hub paths unless the issue requires it — follow `AGENTS.md`.

4. Staging and commits:
   - Stage only files for the current issue.
   - Do not commit unless the user explicitly asks.
   - One issue per commit message; follow `engineering/git-conventions`.

5. Requirement drift:
   - If issue text conflicts with user clarification or repo reality, ask before expanding scope.
   - Update the issue description when clarified scope differs.

## End-of-task response

```text
Completed #<n>: <issue title>

Staged files:
- path/to/file

Verified:
- command that passed

Proposed commit message:
type: Summary #<n>

Host: github|gitlab
PR/MR: <url or pending>
```

## Relationship to other skills

- `operations/task-management` — create/triage host issues
- `operations/agent-orchestration` — multi-issue / multi-agent coordination
- `operations/pr-agent-wake` — fix an existing PR/MR after CI or review feedback
- `operations/create-tracking-ticket` — ClickUp tracking only
- `engineering/implement-feature` — end-to-end implement from an approved spec
