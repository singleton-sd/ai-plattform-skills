---
name: Backlog Refinement
description: Refine raw ideas and backlog items into decision-complete, actionable work and decide whether they need discovery, an Epic, implementation slices, or human gates.
tags: [product, planning, agile, writing]
audience: [product-managers, engineers, tech-leads]
status: stable
---

# Backlog Refinement

Use this skill to turn a rough idea, transcript, feature request, bug, or existing ticket into work that can be executed without hidden product decisions.

For multi-ticket feature planning, also apply `idea-to-delivery`.

## First decide the shape

- Tiny isolated change: one implementation task.
- Medium feature: Epic/initiative + roughly 2–5 implementation tasks.
- Large/cross-cutting or materially uncertain work: discovery/design first, then Epic + implementation slices.
- Manual requirement: explicit human-operation task rather than an implementation task an agent cannot finish.

Default slicing rule: one independently mergeable PR is usually one implementation task.

## Refined item format

```text
Title: <concise action-oriented title>

Area: <project-defined technical/product surface>
Pillar: <project-defined domain capability or None>
Work Type: Feature | Bug | Technical Debt | Discovery | Infrastructure | Documentation | Human Action
Execution: AI | Human | AI + Human
Parent Epic: <title/link or None>

Goal:
<observable outcome>

User story (optional):
As a [persona], I want [action] so that [outcome].

Context:
<why this matters>

Scope:
- <included work>

Acceptance criteria:
- [ ] <specific testable condition>

Technical direction:
- <constraints, patterns, likely repo paths when known>

Preview / seed scenarios:
- <how user-facing behavior or a bug is demonstrated when applicable>

Testing:
- <automated expectations>
- <human validation expectations>

Out of scope:
- <true non-goals>

Dependencies:
- <ticket titles / external gates>

Open questions:
- <must be empty before agent-ready unless explicitly safe for implementer choice>

Sizing hint: XS | S | M | L | XL
```

For bugs also include Steps to reproduce, Expected behavior and Actual behavior.

## Agent-ready gate

Only mark work ready for an implementation agent when:

- acceptance criteria are testable;
- material product/architecture decisions are resolved;
- dependencies are complete or explicitly safe to run in parallel;
- the task is independently deliverable;
- relevant technical constraints and likely paths/patterns are known when applicable;
- preview/seed expectations are defined for user-facing changes or reproducible bugs;
- any required manual setup is represented as an explicit human-operation task;
- no duplicate/equivalent ticket already owns the work.

If those conditions are not true, keep/refine the item in discovery/backlog instead of handing ambiguity to an implementation agent.

## Architecture/design

For architecture or cross-cutting plans, write the decision into the project's architecture/design source of truth before or with implementation ticket creation. Link implementation tasks back to that decision.

## Follow-ups

Every real follow-up discovered during refinement must be explicit:

- search existing work first to avoid duplicates;
- route unresolved product work to ClickUp (product/tracking);
- route implementation-ready work to **host issues** (GitHub or GitLab per `engineeringHost`);
- route manual work to human operations;
- wire dependencies;
- leave newly planned work unclaimed.

See [`config/tracker-profiles/`](config/tracker-profiles/README.md).

## Multi-ticket output

For medium/large features finish with the Epic outcome, child task titles, human gates, dependency graph, parallel lanes, join/integration work, and the exact tasks safe to make agent-ready now.

Use ticket titles as the primary human label; IDs are secondary references for links, branches and dependency wiring.
