---
name: Draft Technical Tickets
description: >-
  Draft precise parent/child engineering tickets from a Design Contract, ClickUp
  brief, or feature request by reconciling ClickUp docs with the live repository.
  Use when the user asks to draft technical tickets, /ticket, turn design into
  ClickUp work, or hand off an approved Design Contract for implementation.
tags: [product, planning, tickets, clickup, engineering, workflow]
audience: [product-managers, engineers, tech-leads]
status: stable
---

# Draft Technical Tickets

Draft precise tickets that another coding agent can implement without guessing.

Read [`references/project-context.md`](references/project-context.md) before drafting.
Use [`references/ticket-template.md`](references/ticket-template.md) for the output structure.

## Inputs

Accept any of:

- Approved Design Contract from [`design/product-design`](design/product-design/SKILL.md)
- Feature description / PRD
- ClickUp URL or task id
- Target repository (path or remote)

If the target repository is unclear, ask once before inspecting code.

## Workflow

1. Understand the requested outcome, user-visible behaviour, constraints, and non-goals.
2. Inspect the ClickUp support documents relevant to the request. Treat documented architecture and product decisions as authoritative unless the repository clearly shows they are obsolete.
3. Inspect the current GitHub repository rather than relying on the project summary alone. Read the root guidance, relevant package guidance, nearby implementation, tests, schemas, generated clients, and configuration.
4. Reconcile documentation with code. State material conflicts or uncertainty; do not silently invent behaviour.
5. Decide whether the work fits one focused implementation ticket. If it spans independently deliverable layers, pillars, migrations, or rollout steps, draft a parent feature and ordered child tickets.
6. Ask only questions whose answers materially change scope, architecture, security, data compatibility, or acceptance criteria. Otherwise make a conservative assumption and label it.
7. Draft the parent and child tickets using the template. Keep child tickets independently implementable, testable, and reviewable.
8. Return drafts in the conversation for approval. Do not write to ClickUp unless the user explicitly asks to create or update tasks.

## Repository inspection

Prefer the connected GitHub tools for `singleton-sd/poc-plattform-kit` when the project is not checked out locally.

When a local checkout is available, read its `AGENTS.md` and follow all applicable scoped instructions.

Cite concrete repository paths, symbols, endpoints, packages, schemas, or workflows only after verifying them.

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

Never claim a ClickUp ticket was created from a draft.

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
