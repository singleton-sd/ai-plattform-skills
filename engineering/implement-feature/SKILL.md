---
name: Implement Feature
description: >-
  Implement an approved implementation specification end-to-end: validate the
  spec, inspect the repo, plan, branch, code, verify (lint/typecheck/tests/build),
  review acceptance criteria, submit a change request (PR or MR), wait for CI,
  and update ClickUp or a repo issue when linked. Use when the user asks to
  implement a feature, run /implement, or execute a ready specification with
  Codex, Cursor, or Claude Code.
tags: [engineering, implementation, workflow, pr, mr, github, gitlab, codex, cursor, claude]
audience: [engineers, tech-leads]
status: stable
---

# Implement Feature

Implement an **approved** implementation specification.

This skill does **not** know or care where the specification came from. It may
be ClickUp, Jira, GitHub Issue, Markdown, a PRD, or a Design Contract plus
tickets. The process is identical; only the execution engine changes.

## Supported execution engines

| Engine | When to use |
|--------|-------------|
| Codex | User says `/implement codex` or "use Codex" |
| Cursor | User says `/implement cursor`, default in Cursor Agent, or "use Cursor" |
| Claude Code | User says `/implement claude` or "use Claude Code" |

Keep the workflow identical across engines. Do not invent engine-specific
product steps.

## Inputs

- Implementation specification (required)
- Optional: ClickUp URL / task id
- Optional: repository issue (GitHub or GitLab)
- Optional: repository / base branch
- Optional: execution engine preference

## Workflow

Copy and track:

```text
Implement feature progress:
- [ ] 1. Read specification
- [ ] 2. Validate completeness
- [ ] 3. Read project guidance
- [ ] 4. Inspect nearby code
- [ ] 5. Create an implementation plan
- [ ] 6. Create a sibling worktree and branch
- [ ] 7. Implement
- [ ] 8. Run lint, typecheck, tests, build
- [ ] 9. Review against acceptance criteria
- [ ] 10. Submit change request (PR/MR + CI wait)
- [ ] 11. Update tracker (ClickUp and/or repo issue if linked)
```

### 1. Read specification

Load the full specification from the provided source. Prefer the linked task or
document over chat paraphrases when they conflict — then ask if still unclear.

### 2. Validate completeness

Before coding, confirm the spec has enough to implement safely:

- Goal / user outcome
- Scope and out of scope
- Acceptance criteria (testable)
- Affected surfaces (routes, APIs, components)
- Permissions / error / empty / loading expectations when UI is involved

If critical pieces are missing, stop and ask. Do not invent backend behaviour
or product decisions.

### 3. Read project guidance

In the target repository, read when present:

- `AGENTS.md`
- `.cursor` rules / project rules
- `CLAUDE.md`
- Repository docs relevant to the change (`README`, `DESIGN.md`, `docs/`)

Also apply Singleton SD skills that apply to the change (for example
`engineering/isolated-worktree`, `engineering/git-conventions`,
`engineering/frontend`, `engineering/backend`).

### 4. Inspect nearby code

Inspect existing patterns next to the change:

- Similar features and components
- Tests and fixtures
- API clients / schemas
- Design tokens and shared UI primitives

Match local conventions over generic preferences.

### 5. Create an implementation plan

Share a short plan before large edits:

- Files / areas to touch
- Order of work
- Risks and test approach
- Explicit non-goals

For tiny, unambiguous changes, a one-paragraph plan is enough.

### 6. Create a sibling worktree and branch

Follow [`engineering/isolated-worktree`](../isolated-worktree/SKILL.md)
and [`engineering/git-conventions`](../git-conventions/SKILL.md):

```text
feature/TICKET-NUMBER[-optional-slug]
```

Fetch origin, fast-forward the default-branch checkout if it is clean, then
create a **sibling** worktree from `origin/<default>`. Never implement on
`main` / `master`. Never nest a worktree inside an existing checkout.

If launching a subagent, create the worktree first and start the subagent with
cwd set to that path.

### 7. Implement

- Stay inside the specification
- Prefer reuse over new abstractions
- Keep commits scoped when the user asks to commit
- Do not commit unless the user explicitly asks

### 8. Verify

Run the project's available checks, in this order when scripts exist:

1. Lint
2. Typecheck
3. Tests (focused first, then broader if needed)
4. Build

Record what ran and what passed or failed. Fix failures caused by this change
before submitting the change request.

### 9. Review against acceptance criteria

Check each acceptance criterion. Report:

- Met
- Not met (with reason)
- Blocked (missing dependency / unclear spec)

### 10. Submit change request

Follow [`engineering/submit-change-request`](../submit-change-request/SKILL.md):

- Push the branch and open a PR (GitHub) or MR (GitLab) on the remote the
  target project treats as authoritative
- Wait for CI (~10 minutes by default) and fix in-scope pipeline failures
- Record the change-request URL

Do not duplicate submit steps here — the submit skill owns host detection,
CLI commands, CI wait loop, and tracker updates.

When review feedback arrives later, follow
[`engineering/address-change-request-review`](../address-change-request-review/SKILL.md)
when the user asks to address review comments.

### 11. Update tracker if linked

The submit skill updates ClickUp and/or a repository issue when linked.
Confirm handoff here when needed:

Engineering handoff is the host PR/MR (GitHub or GitLab per
[`config/tracker-profiles/`](../../config/tracker-profiles/README.md) /
consumer `.skills/profile`). Ensure the PR/MR links/closes the repo issue when
one is linked.

ClickUp product or tracking tickets (if any):

- Optionally comment with the PR/MR URL for visibility
- Do **not** use ClickUp for engineering claim/handoff
- Do **not** mark ClickUp complete unless the user asks

If no tracker is linked or access is unavailable, skip without failing the
workflow.

## Guardrails

Never:

- Expand scope beyond the specification without asking
- Invent API contracts or permissions
- Skip verification when project scripts exist
- Push to `main` / `master` for feature delivery
- Edit the default-branch checkout or nest a worktree inside it
- Store credentials in the skill or commit secrets

## Composition

This skill is the implementation stage for composed workflows such as
`feature-from-idea`, `bug-fix`, `api-first`, and `greenfield-module`.
Orchestrators should hand it a ready specification — not embed coding steps.

Suggested command surface (future):

- `/implement`
- `/implement codex`
- `/implement cursor`
- `/implement claude`

## Related skills

- [`engineering/isolated-worktree`](../isolated-worktree/SKILL.md)
- [`engineering/git-conventions`](../git-conventions/SKILL.md)
- [`engineering/submit-change-request`](../submit-change-request/SKILL.md)
- [`engineering/address-change-request-review`](../address-change-request-review/SKILL.md)
- [`engineering/code-review`](../code-review/SKILL.md)
- [`operations/task-driven-development`](../../operations/task-driven-development/SKILL.md)
- [`design/product-design`](design/product-design/SKILL.md) — upstream design stage
- `product/draft-technical-tickets` — upstream ticket stage (format owner; do not duplicate)
