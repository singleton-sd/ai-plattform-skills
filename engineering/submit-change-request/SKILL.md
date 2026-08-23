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

Resolve `engineeringHost` in this order (matches
[`config/tracker-profiles/`](../../config/tracker-profiles/README.md)):

1. If the user gave a change-request URL → `github.com` → GitHub; `gitlab.com`
   (or self-hosted GitLab) → GitLab.
2. Else read consumer `.skills/profile` and use `engineeringHost`
   (`github` | `gitlab`).
3. Else infer from the authoritative remote URL (prefer a remote named
   `gitlab` / `github` when present; otherwise `origin`):

```bash
# Prefer profile when present
test -f .skills/profile && jq -r '.engineeringHost // empty' .skills/profile

# Fallback: remote URL
git remote get-url gitlab 2>/dev/null || git remote get-url origin
```

4. Confirm CLI auth for that host: `gh auth status` (GitHub) or
   `glab auth status` (GitLab).

Push and open the PR/MR on the **authoritative** remote, not a mirror. In
mirrored checkouts, `origin` may be GitHub while `engineeringHost` is `gitlab`
(or the reverse) — use the remote that matches the resolved host.

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
- [ ] 2. Push branch to authoritative remote
- [ ] 3. Create or update PR/MR
- [ ] 4. Record change-request URL and number
- [ ] 5. Wait for CI / checks (max ~10 minutes)
- [ ] 6. On failure: diagnose, fix in scope, push, re-wait
- [ ] 7. Report final status
- [ ] 8. Update ClickUp and/or repo issue
```

Follow [`engineering/isolated-worktree`](../isolated-worktree/SKILL.md) and
[`engineering/git-conventions`](../git-conventions/SKILL.md) before pushing.

### 1. Confirm worktree, branch, and host

- Work happens in a feature/hotfix worktree — not on `main` / `master`.
- Branch name matches project conventions (for Singleton SD:
  `feature/TICKET-NUMBER[-slug]`).
- Host is resolved via profile / URL / remote as above.

### 2. Push branch

Push to the remote that matches the resolved host (examples: `origin`,
`gitlab`, `github`):

```bash
git push -u <authoritative-remote> HEAD
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

Default deadline: **~10 minutes** (600 seconds) for a terminal result. Do not
wait indefinitely. If still queued or running when the deadline expires, stop
and report **still running / blocked** with the change-request URL and current
check status.

**Preferred: timed poll (either host)**

Poll every 60–90 seconds until success, failure, cancellation, or the
10-minute deadline:

```bash
DEADLINE=$((SECONDS + 600))
while (( SECONDS < DEADLINE )); do
  # GitHub: gh pr checks <n>
  # GitLab: glab ci status --branch <branch>
  # Exit the loop early on success / failure / cancelled
  sleep 60
done
# If still running here → report blocked / still running
```

**GitHub — optional watch helper (wrap with timeout)**

```bash
timeout 600 gh pr checks <n> --watch
# or:
timeout 600 gh run watch
```

If `timeout` is unavailable, use the timed poll loop above.

**GitLab — optional wait helper (wrap with timeout)**

```bash
timeout 600 glab ci status --wait --branch <branch>
# live stream only when the agent can stay attached AND still under deadline:
timeout 600 glab ci status --live --branch <branch>
```

If `timeout` is unavailable, use the timed poll loop above. Never rely on
`--watch` / `--wait` / `--live` without an outer deadline.

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
5. Commit → push → return to step 5 (reset the 10-minute deadline).
6. Record failing job name and the first actionable error line in the handoff.

If still failing after reasonable in-scope fixes, report blocked status with
logs summary — do not silently stop.

### 7. Report final status

Report:

- Change-request URL
- CI/checks outcome (green / failed / still running after deadline)
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
- Open a PR/MR on a mirror when `.skills/profile` names a different host
- Open duplicate PRs/MRs for the same branch without checking first
- Mark CI green in chat when checks are still running or failed
- Wait forever on CI without the ~10-minute deadline
- Store credentials in the skill or commit secrets

## Composition

Called by [`engineering/implement-feature`](../implement-feature/SKILL.md)
after local verification. After review feedback arrives, hand off to
[`engineering/address-change-request-review`](../address-change-request-review/SKILL.md).

## Related skills

- [`engineering/isolated-worktree`](../isolated-worktree/SKILL.md)
- [`engineering/git-conventions`](../git-conventions/SKILL.md)
- [`engineering/pipelines-npm`](../pipelines-npm/SKILL.md)
- [`engineering/address-change-request-review`](../address-change-request-review/SKILL.md)
- [`operations/task-management`](../../operations/task-management/SKILL.md)
- [`config/tracker-profiles/`](../../config/tracker-profiles/README.md)
