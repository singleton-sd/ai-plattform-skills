---
name: Draft Technical Tickets
description: >-
  Draft precise parent/child engineering issues from a Design Contract, product
  brief, or feature request by reconciling docs with the live repository. Use
  when the user asks to draft technical tickets, /ticket, turn design into host
  issues (GitHub or GitLab), or hand off an approved Design Contract.
tags: [product, planning, tickets, github, gitlab, engineering, workflow]
audience: [product-managers, engineers, tech-leads]
status: stable
---

# Draft Technical Tickets

Draft precise **engineering issues** that another coding agent can implement without guessing.

Default destination is the **project host** (GitHub Issues or GitLab Issues) per
[`config/tracker-profiles/`](config/tracker-profiles/README.md) and consumer
`.skills/profile`. ClickUp is only for product features or tracking tickets when
the user explicitly asks (`operations/create-tracking-ticket`).

Read [`references/project-context.md`](references/project-context.md) when present
as optional project hints — prefer the live repo `AGENTS.md` and docs over stale
summaries. Use [`references/ticket-template.md`](references/ticket-template.md)
for structure.

## Inputs

Accept any of:

- Approved Design Contract from [`design/product-design`](design/product-design/SKILL.md)
- Feature description / PRD
- ClickUp URL or task id (product context)
- Target repository (path or remote)

If the target repository is unclear, ask once before inspecting code.

## Workflow

1. Understand the requested outcome, user-visible behaviour, constraints, and non-goals.
2. Inspect product docs (ClickUp or repo) relevant to the request. Treat documented architecture decisions as authoritative unless the repository clearly shows they are obsolete.
3. Inspect the live repository. Read `AGENTS.md`, nearby implementation, tests, schemas, clients, and configuration.
4. Reconcile documentation with code. State material conflicts; do not silently invent behaviour.
5. Decide whether the work fits one focused implementation issue. If it spans independently deliverable layers, draft a parent + ordered children.
6. Ask only questions whose answers materially change scope, architecture, security, data compatibility, or acceptance criteria.
7. Draft parent/child **host issues** (GitHub or GitLab). Optionally note `Product feature: <ClickUp URL>`.
8. Return drafts for approval. Do not create ClickUp or host issues unless the user explicitly asks.

## Repository inspection

Use `gh` or `glab` (and local checkout) for the target host. When a local checkout is available, read its `AGENTS.md`.

Cite concrete repository paths only after verifying them.

Inspect the narrowest relevant implementation surface, then trace adjacent contracts and consumers.

Check for cross-cutting effects on authentication, permissions, tenancy, auditing, notifications, subscriptions, reporting, support, and contacts.

Check whether API changes require Swagger/OpenAPI export and regenerated API client artifacts.

Check whether persistence changes require Prisma schema work, migrations, seed updates, compatibility, and rollback considerations.

Check whether async behaviour requires Azure Service Bus contracts, idempotency, retries, dead-letter handling, and observability.

Check whether UI work must use the project design tokens and existing components.

## Ticket decomposition

Create a parent feature when two or more child tickets can be delivered or reviewed independently. Typical boundaries include:

- architecture or discovery spike
- database/schema and migration
- API/domain implementation
- messaging or integration work
- web/PWA implementation
- permissions and tenant isolation
- automated tests and operational readiness when substantial

Avoid artificial splitting. Keep tightly coupled code and its ordinary tests in the same child ticket. Describe dependencies and recommended order in the parent.

## Writing rules

Write for an AI coding agent with access to the repository but no hidden conversation context.

Use direct, technical language and testable statements.

Explain the outcome and constraints; do not prescribe speculative file edits as facts.

Distinguish verified facts, requirements, assumptions, and open questions.

Use Given/When/Then acceptance criteria where it improves precision.

Include negative cases, authorization boundaries, tenant isolation, error handling, compatibility, and observability when relevant.

Require tests that match the affected layer. Name commands only when verified in the repository.

Keep acceptance criteria focused on observable outcomes, not vague completion claims.

Mark exclusions explicitly to prevent scope creep.

Do not include estimates, assignees, statuses, or priorities unless the user asks or the source material defines them.

Never claim a ClickUp or host issue was created from a draft unless you actually created it.

## Final quality check

Before returning a draft, confirm that:

- every child ticket has one coherent deliverable
- the objective and current/required behaviour are unambiguous
- affected areas are verified or labelled as likely
- acceptance criteria cover success and meaningful failure paths
- tests and validation commands are actionable
- dependencies, rollout concerns, risks, and open questions are visible
- no child ticket depends on unstated context from another draft

## Relation to other skills

| Skill | Role |
|-------|------|
| [`design/product-design`](design/product-design/SKILL.md) | Upstream UI design; produces Design Contract |
| [`product/backlog-refinement`](product/backlog-refinement/SKILL.md) | Lightweight story refinement — not a substitute for repo-reconciled technical tickets |
| [`product/prd-generator`](product/prd-generator/SKILL.md) | Optional PRD input |
| [`engineering/implement-feature`](engineering/implement-feature/SKILL.md) | Downstream implementation after tickets exist |

This skill owns ticket format, acceptance criteria shape, parent/child decomposition, and engineering documentation for the AI product workflow. Sibling skills must not invent a second ticket template.
