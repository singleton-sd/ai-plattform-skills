---
name: Isolated Worktree
description: >-
  Implement and review in a sibling git worktree created from the latest
  default branch. Use when launching subagents, implementing a feature,
  reviewing a PR, or before any repo edits so agents do not work on
  main/master or nest worktrees inside a checkout.
tags: [engineering, git, worktree, subagent, workflow]
audience: [engineers, tech-leads]
status: stable
---

# Isolated Worktree

Every implementation or review run happens in its **own sibling worktree**,
created from the latest default branch. Do not edit the default-branch
checkout (`main` / `master`).

Follow [`engineering/git-conventions`](engineering/git-conventions/SKILL.md)
for branch names and commit messages.

## Detect the default branch

Never hardcode `main`. Resolve it:

```bash
git symbolic-ref refs/remotes/origin/HEAD
# origin/master or origin/main
```

If `origin/HEAD` is missing: `git remote set-head origin -a`, then retry.

## Parent agent (before launching subagents)

1. `git fetch origin`.
2. Fast-forward the **default-branch worktree only** when all of these are true:
   - cwd is that default branch
   - the working tree is clean
   - this checkout *is* the dedicated default worktree (often a folder named
     `main` even when the branch is `master`)
3. Create **one sibling worktree per subagent**, each with a unique branch:

```text
feature/TICKET-NUMBER[-optional-slug]
```

Place the worktree **next to** the default checkout, not inside it:

```text
<parent>/<repo>/main
<parent>/<repo>/feature-TICKET-optional-slug
```

Example:

```bash
git fetch origin
git -C "<parent>/<repo>/main" merge --ff-only origin/master
git worktree add -b feature/AI-43-isolated-worktree \
  "<parent>/<repo>/feature-AI-43-isolated-worktree" origin/master
```

4. Launch the subagent with `working_directory` (or equivalent) set to that
   worktree. Pass in the prompt: absolute worktree path, branch name, ticket
   ID, and “you are already in a worktree — do not create another.”
5. Parallel subagents each get their own worktree **and** branch. Do not share.

## Subagent

If cwd is already a feature/hotfix worktree:

- Stay there.
- Do **not** `git pull` the default branch into the feature branch.
- Do **not** create a nested worktree.
- Do **not** edit files in the default-branch checkout.

If cwd is the default branch (`main` / `master` / `develop`):

- Stop. Create (or ask the parent to create) a sibling worktree first.
- Do not implement on the default branch.

## Never

- Nested worktrees inside a checkout (for example `.worktrees/` under `main`).
  Nested adapter junctions break, especially on Windows.
- `git pull` on a dirty default-branch checkout.
- Implementing or reviewing on `main` / `master`.
- Reusing another agent's worktree or branch.

## After merge

From a checkout that is **not** the worktree being removed:

```bash
git fetch origin
git worktree remove "<absolute-worktree-path>"
git branch -d feature/TICKET-optional-slug
```

If the worktree still has uncommitted or unpushed work, stop and ask.

## Related skills

- [`engineering/git-conventions`](engineering/git-conventions/SKILL.md)
- [`engineering/implement-feature`](engineering/implement-feature/SKILL.md)
- [`operations/task-driven-development`](operations/task-driven-development/SKILL.md)
