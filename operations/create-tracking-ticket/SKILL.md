---
name: Create Tracking Ticket
description: >-
  Create a ClickUp tracking ticket when the user requests work that has no
  product feature ticket and no engineering issue yet. Use when the user asks
  to track ad-hoc work in ClickUp for visibility, then optionally file a host
  engineering issue (GitHub or GitLab) from that tracking ticket.
tags: [operations, clickup, tracking, workflow]
audience: [engineers, tech-leads, product-managers]
status: stable
---

# Create Tracking Ticket

Use when the user wants **ClickUp visibility** for work that is not yet (or
may never become) a formal product feature, and may or may not need an
engineering issue on the project host.

## Ownership

| System | Role here |
|--------|-----------|
| **ClickUp** | Optional tracking ticket (this skill) |
| **GitHub / GitLab Issues** | Engineering work — only create if the user wants implementation tracking on the host |

Do **not** use ClickUp Delivery / claim tokens for engineering execution.
Read [`config/tracker-profiles/README.md`](config/tracker-profiles/README.md)
and the consumer `.skills/profile` when present.

## When to use

- User asks to "create a ClickUp ticket" / "track this" without an existing feature.
- User describes ad-hoc ops/chore work and wants a ClickUp breadcrumb.
- User has no ClickUp product feature and no host issue yet.

## When not to use

- Engineering-ready work with clear acceptance criteria → file a **host issue**
  (`task-management` / `draft-technical-tickets`) instead of or in addition to tracking.
- User already has a ClickUp **product feature** → refine that; do not duplicate.
- Skills-repo skill authoring → use `operations/skill-authoring-workflow` and
  the Skills Product Backlog list in [`config/clickup-defaults.json`](config/clickup-defaults.json).

## Workflow

1. Confirm destination list from consumer `.skills/profile.clickup.trackingList`
   (or ask once). Fall back to Ideas & Discovery style lists for product-ish
   tracking — never invent a new engineering Delivery claim flow.
2. Draft a short ClickUp task:
   - Action-first, sentence-case title
   - Goal, scope, non-goals, next step (host issue? human only?)
3. Create the task only when the user asks to create it (or explicitly says to proceed).
4. If the user also wants engineering execution:
   - File a GitHub or GitLab issue per `engineeringHost`
   - Put `Tracking: <ClickUp URL>` on the issue body (read-only link; no sync automation)
5. Report both URLs in the chat summary.

## Rules

- Never put secrets in ClickUp.
- Never set engineering claim/handoff state in ClickUp.
- Prefer host issues for agent-ready implementation work.
