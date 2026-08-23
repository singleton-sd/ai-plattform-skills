---
name: Submit Change Request
description: >-
  Push a feature branch and open a pull request (GitHub) or merge request
  (GitLab), wait for CI, fix pipeline failures in scope, and update the linked
  ClickUp task or repository issue. Use after implementation is verified locally
  or when the user asks to submit, open a PR/MR, or push for review.
tags: [engineering, workflow, github, gitlab, ci, pr, mr]
audience: [engineers, tech-leads]
status: stable
---

# Submit Change Request

Open a **change request** on the host the target repository uses:

- **GitHub** → pull request (PR)
- **GitLab** → merge request (MR)

Prefer the remote the **target project** treats as authoritative. If the repo
mirrors between hosts, submit on the authoritative remote only.

## Resolve host and tracker

### Host

1. If the user gave a URL → `github.com` → GitHub; `gitlab.com` (or self-hosted GitLab) → GitLab.
2. Else inspect `origin`:

```bash
git remote get-url origin
```

3. Confirm CLI auth: `gh auth status` (GitHub) or `glab auth status` (GitLab).

### Tracker

The linked work item may be **ClickUp**, a **repository issue**, both, or neither.

| Source | Action |
|--------|--------|
| ClickUp URL / custom ID | Update ClickUp after submit (status + comment with change-request URL) |
| GitHub issue `#N` or URL | Link in PR body; comment on issue after submit |
| GitLab issue `#N` or URL | Link in MR body; comment on issue after submit |
| Both | Link both in body; update both when access exists |
| Neither | Open change request only; skip tracker updates |

Do **not** mark ClickUp complete or close a repo issue unless the user asks.

## Workflow

Copy and track:

```text
Submit change request progress:
- [ ] 1. Confirm worktree, branch, and host
- [ ] 2. Push branch to origin
- [ ] 3. Create or update PR/MR
- [ ] 4. Record change-request URL and number
- [ ] 5. Wait for CI / checks
- [ ] 6. On failure: diagnose, fix in scope, push, re-wait
- [ ] 7. Report final status
- [ ] 8. Update ClickUp and/or repo issue
```

Follow [`engineering/isolated-worktree`](engineering/isolated-worktree/SKILL.md) and
[`engineering/git-conventions`](engineering/git-conventions/SKILL.md) before pushing.

### 1. Confirm worktree, branch, and host

- Work happens in a feature/hotfix worktree — not on `main` / `master`.
- Branch name matches project conventions (for Singleton SD:
  `feature/TICKET-NUMBER[-slug]`).

### 2. Push branch

```bash
git push -u origin HEAD
```

### 3. Create or update PR/MR

Title and body must:

- Summarize intent and acceptance-criteria / test coverage
- Link the specification, ClickUp task, and/or repo issue
- Follow the project PR/MR template when present

**GitHub**

```bash
gh pr create --base <default-branch> --fill
# or with explicit title/body:
gh pr create --base <default-branch> --title "..." --body "..."
```

Update an existing PR: `gh pr edit <n> --title "..." --body "..."`

**GitLab**

```bash
glab mr create --target-branch <default-branch> --fill
# draft until CI is green (optional):
glab mr create --target-branch <default-branch> --fill --draft
glab mr update --ready   # when CI passes and ready for review
```

Update an existing MR: `glab mr update --title "..." --description "..."`

Link issues in the body with project conventions (`Fixes #N`, `Closes #N`, etc.).

### 4. Record URL

Capture the web URL and number (`#N`) for tracker updates and later review work.

### 5. Wait for CI / checks

Default: wait up to **~10 minutes** for a terminal result. Use one of:

**GitHub — blocking wait**

```bash
gh pr checks <n> --watch
# or for Actions workflow runs:
gh run watch
```

**GitLab — blocking wait**

```bash
glab ci status --wait --branch <branch>
# live stream (when the agent can stay attached):
glab ci status --live --branch <branch>
```

**Timed poll (either host)**

If `--watch` / `--wait` is unavailable or times out, poll every 60–90 seconds
for up to ~10 minutes. Stop early on success, failure, or cancellation.

**Webhook (optional)**

Automation may re-trigger agents via pipeline webhooks. Agents without webhook
infra use polling; do not block submission on webhook setup.

### 6. On CI failure

1. Fetch logs:
   - GitHub: `gh run view --log-failed` or `gh pr checks <n>`
   - GitLab: `glab ci trace <job>` or `glab ci view`
2. Fix only failures **caused by this change's scope**.
3. Never weaken CI config or skip checks to make red green.
4. If failure looks unrelated (broken default branch), merge or rebase latest
   default branch once, push, and re-wait.
5. Commit → push → return to step 5.
6. Record failing job name and the first actionable error line in the handoff.

If still failing after reasonable in-scope fixes, report blocked status with
logs summary — do not silently stop.

### 7. Report final status

Report:

- Change-request URL
- CI/checks outcome (green / failed / still running)
- Commits pushed during CI fixes
- Anything blocked that needs a human

### 8. Update tracker

**ClickUp** (when linked and access exists):

- Move status toward review / in review (use the list's valid statuses)
- Comment with the change-request URL
- Set Preview URL custom field when the project uses it
- Do not mark complete unless the user asks

**Repository issue** (when linked):

- GitHub: `gh issue comment <n> --body "Change request: <url>"`
- GitLab: `glab issue note <n> -m "Change request: <url>"`

## Guardrails

Never:

- Push feature work to `main` / `master`
- Open duplicate PRs/MRs for the same branch without checking first
- Mark CI green in chat when checks are still running or failed
- Store credentials in the skill or commit secrets

## Composition

Called by [`engineering/implement-feature`](engineering/implement-feature/SKILL.md)
after local verification. After review feedback arrives, hand off to
[`engineering/address-change-request-review`](engineering/address-change-request-review/SKILL.md).

## Related skills

- [`engineering/isolated-worktree`](engineering/isolated-worktree/SKILL.md)
- [`engineering/git-conventions`](engineering/git-conventions/SKILL.md)
- [`engineering/pipelines-npm`](engineering/pipelines-npm/SKILL.md)
- [`engineering/address-change-request-review`](engineering/address-change-request-review/SKILL.md)
- [`operations/task-management`](operations/task-management/SKILL.md)
