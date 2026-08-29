---
name: PR Agent Wake
description: >-
  Fix an existing pull request or merge request after CI failure or review
  feedback. Attach to the existing branch; never open a second PR/MR for the
  same issue. Delegates to engineering/address-change-request-review and
  engineering/submit-change-request for CI re-checks.
tags: [operations, pr, mr, ci, review, github, gitlab]
audience: [engineers, tech-leads]
status: stable
---

# PR Agent Wake

Use when an **existing** PR (GitHub) or MR (GitLab) needs fixes: CI failure,
merge conflicts, or actionable review feedback. Do **not** open a second PR/MR
for the same closing issue.

## Before editing

1. Resolve `engineeringHost` from `.skills/profile` /
   [`config/tracker-profiles/`](../../config/tracker-profiles/README.md).
2. Read target `AGENTS.md` and [`operations/agent-orchestration`](../agent-orchestration/SKILL.md).
3. Check out / attach to the **existing** PR/MR branch worktree (create a
   worktree for that branch if needed — do not create a new feature branch).

## Workflow

Follow [`engineering/address-change-request-review`](../../engineering/address-change-request-review/SKILL.md)
for review feedback and in-scope CI fixes on the branch.

After pushing fixes, follow
[`engineering/submit-change-request`](../../engineering/submit-change-request/SKILL.md)
steps 5–6 to re-wait for CI (~10 minutes by default).

Summary:

1. Fetch the PR/MR tip and unresolved review/CI comments.
2. Reproduce failures locally when practical.
3. Fix the smallest change that clears the blocker.
4. Push to the same branch (`--force-with-lease` only after rebase, when required).
5. Reply in-thread on each addressed review comment; resolve threads only when
   the repo policy allows agents to do so (otherwise leave open for the
   reviewer or bot).
6. Re-check required CI / mergeability.

## Rules

- One PR/MR per engineering issue claim.
- Prefer the repo conflict playbook for dirty merges.
- Do not expand into unrelated issues.
- ClickUp is not part of this loop unless the user asks for a visibility comment.

## Starter prompt

```text
You are the PR/MR fixer for this repository.
Follow operations/pr-agent-wake, engineering/address-change-request-review,
engineering/submit-change-request, AGENTS.md, and operations/agent-orchestration.
Attach to the existing branch for PR/MR <url or number>. Fix CI/review feedback only.
```
