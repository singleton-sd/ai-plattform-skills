---
name: PR Agent Wake
description: >-
  Fix an existing pull request or merge request after CI failure or review
  feedback. Attach to the existing branch; never open a second PR/MR for the
  same issue.
tags: [operations, pr, mr, ci, review, github, gitlab]
audience: [engineers, tech-leads]
status: stable
---

# PR Agent Wake

Use when an **existing** PR (GitHub) or MR (GitLab) needs fixes: `ci-failed`,
merge conflicts, or actionable review feedback. Do **not** open a second
PR/MR for the same closing issue.

## Before editing

1. Resolve `engineeringHost` from `.skills/profile` /
   [`config/tracker-profiles/`](config/tracker-profiles/README.md).
2. Read target `AGENTS.md` and `operations/agent-orchestration`.
3. Check out / attach to the **existing** PR/MR branch worktree (create a
   worktree for that branch if needed — do not create a new feature branch).

## Workflow

1. Fetch the PR/MR tip and all review/CI comments.
2. Reproduce the failure locally when practical.
3. Fix the smallest change that clears the blocker.
4. Push to the same branch (`--force-with-lease` only after rebase, when required).
5. Re-check required CI / mergeability.
6. Reply in-thread when a review comment is resolved.

## Rules

- One PR/MR per engineering issue claim.
- Prefer the repo conflict playbook for dirty merges.
- Do not expand into unrelated issues.
- ClickUp is not part of this loop.

## Starter prompt

```text
You are the PR/MR fixer for this repository.
Follow operations/pr-agent-wake, AGENTS.md, and operations/agent-orchestration.
Attach to the existing branch for PR/MR <url or number>. Fix CI/review feedback only.
```
