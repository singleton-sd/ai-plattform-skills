---
name: Implement Feature
description: >-
  Implement an approved implementation specification end-to-end: validate the
  spec, inspect the repo, plan, branch, code, verify (lint/typecheck/tests/build),
  review acceptance criteria, open a PR, and update ClickUp when available. Use
  when the user asks to implement a feature, run /implement, or execute a
  ready specification with Codex, Cursor, or Claude Code.
tags: [engineering, implementation, workflow, pr, codex, cursor, claude]
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
- [ ] 6. Create a branch
- [ ] 7. Implement
- [ ] 8. Run lint, typecheck, tests, build
- [ ] 9. Review against acceptance criteria
- [ ] 10. Create PR
- [ ] 11. Update ClickUp if available
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
`engineering/git-conventions`, `engineering/frontend`, `engineering/backend`).

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

### 6. Create a branch

Follow [`engineering/git-conventions`](engineering/git-conventions/SKILL.md):

```text
feature/TICKET-NUMBER[-optional-slug]
```

Use a dedicated worktree when the team's rules require it. Never implement on
`main` / `master` for feature work.

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
before opening the PR.

### 9. Review against acceptance criteria

Check each acceptance criterion. Report:

- Met
- Not met (with reason)
- Blocked (missing dependency / unclear spec)

### 10. Create PR

Open a pull request against the repo's default integration branch.

- Title and body summarize intent and acceptance-criteria coverage
- Link the specification / ticket
- Follow the project's PR template when present

Remember: for Singleton SD platform repos, **GitLab is source of truth**;
GitHub may be a synchronized mirror for AI agents. Prefer the remote the
target project treats as authoritative.

### 11. Update ClickUp if available

When a ClickUp task is linked and ClickUp access exists:

- Move status toward review / in review (use the list's valid statuses)
- Comment with the PR URL
- Do **not** mark the task complete unless the user asks

If ClickUp is unavailable, skip without failing the workflow.

## Guardrails

Never:

- Expand scope beyond the specification without asking
- Invent API contracts or permissions
- Skip verification when project scripts exist
- Ship a new Prisma model or guarded Nest route in `poc-plattform-kit` without
  registering `{resource}:{action}` — see
  [`engineering/register-permissions`](engineering/register-permissions/SKILL.md)
- Push to `main` / `master` for feature delivery
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

- [`engineering/git-conventions`](engineering/git-conventions/SKILL.md)
- [`engineering/code-review`](engineering/code-review/SKILL.md)
- [`engineering/register-permissions`](engineering/register-permissions/SKILL.md) — catalog OpenFGA permissions when adding tables/routes in poc-plattform-kit
- [`operations/task-driven-development`](operations/task-driven-development/SKILL.md)
- [`design/product-design`](design/product-design/SKILL.md) — upstream design stage
- `product/draft-technical-tickets` — upstream ticket stage (format owner; do not duplicate)
