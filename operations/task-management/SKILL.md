---
name: Task Management
description: >-
  Create and manage engineering tasks on the project host (GitHub or GitLab
  Issues) and optional ClickUp product/tracking tickets. Use when creating,
  triaging, or updating tickets for implementation or product visibility.
tags: [operations, tasks, project-management, workflow, github, gitlab, clickup]
audience: [engineers, product-managers, designers, all]
status: stable
---

# Task Management

Help create and organise work. **Where the ticket lives depends on what it is.**

## Resolve destinations

1. Read consumer `.skills/profile` and [`config/tracker-profiles/`](config/tracker-profiles/README.md).
2. Infer `engineeringHost` from git remote when profile is missing.

| Kind of work | System | Tool |
|--------------|--------|------|
| Engineering implementation (agent-ready or discovery) | GitHub Issues or GitLab Issues | `gh` / `glab` |
| Product feature the user describes | ClickUp (product list) | ClickUp MCP or REST |
| Ad-hoc tracking with no feature yet | ClickUp (tracking list) | `operations/create-tracking-ticket` |
| Skill changes in this skills repo | ClickUp Skills Product Backlog | [`config/clickup-defaults.json`](config/clickup-defaults.json) |

Never use ClickUp as the engineering claim/handoff system for app repos.

## Engineering issues (GitHub / GitLab)

When creating an engineering issue:

1. **Title** — sentence case, action-first
2. **Body** — goal, scope, out of scope, acceptance criteria, constraints, dependencies (`Depends on` / `Blocks` / `Parent` when used)
3. Leave unassigned / unclaimed unless the user is starting implementation now
4. Optional: `Product feature: <ClickUp URL>` or `Tracking: <ClickUp URL>` as a read-only link

Agent-ready gate: testable acceptance criteria, material decisions resolved, no unresolved blocking dependencies.

## ClickUp product / tracking

- Action-first sentence-case names
- No secrets in descriptions
- Do not invent Delivery claim-token workflows for new engineering work
- Skills-repo work defaults to list `901614473129` (Skills Product Backlog)

## Commit message integration

Reference the **engineering** issue (or skills ClickUp custom id when working in this skills repo):

```
type: #284 Summary in sentence case
type: AI-47 Summary in sentence case
```

One ticket per commit. See `engineering/git-conventions`.

## Common operations

### Create an engineering issue

```bash
# GitHub
gh issue create --title "..." --body "..."

# GitLab
glab issue create --title "..." --description "..."
```

### Create a ClickUp tracking ticket

Follow `operations/create-tracking-ticket`.
