---
name: Idea to Delivery
description: Turn a refined product or engineering idea into an Epic, implementation-ready delivery slices, dependencies, parallel lanes, and explicit human-operation gates.
tags: [product, planning, agile, agents, workflow]
audience: [product-managers, engineers, tech-leads, all]
status: stable
---

# Idea to Delivery

Use this skill when an idea has been refined enough to become executable project work.

## Hierarchy

- Tiny isolated change: one implementation task.
- Medium feature: one Epic/initiative plus roughly 2–5 independently deliverable tasks.
- Large/cross-cutting feature: discovery/design first, then an Epic plus delivery slices and human gates.

Default rule: **one independently mergeable PR = one implementation task**. Do not split by technical layer when the slices cannot be meaningfully delivered or tested independently.

## Epic contract

An Epic describes the outcome and coordination boundary. Include goal, context, chosen architecture/design reference, scope, non-goals, success criteria, child slices, human gates, dependency graph, parallel lanes, rollout/preview strategy, and completion rule.

## Implementation task contract

Each agent-ready task should include:

1. Goal
2. Context
3. Scope
4. Testable acceptance criteria
5. Technical direction / relevant repository paths when known
6. Out of scope
7. Dependencies by ticket title
8. Preview/seed scenarios for user-facing work or reproducible bugs
9. Automated test expectations
10. Human test expectations
11. Parent Epic/initiative reference

Do not make a task agent-ready while material product/architecture questions remain unresolved.

## Classification

Keep workflow queues separate from architecture/domain classification. Prefer structured fields when the project supports them. Use each project's vocabulary; the values below are common examples, not a global enum.

- **Area:** project-defined technical/product surface (examples: Web App, API, Marketing, Infrastructure, Developer Experience, Cross-cutting)
- **Pillar:** project-defined domain capability (examples: Tenant, Permissions, Notifications, Platform) or None
- **Work Type:** Feature | Bug | Technical Debt | Discovery | Infrastructure | Documentation | Human Action
- **Execution:** AI | Human | AI + Human

Use tags only for exceptional overlapping attributes such as security, UX, breaking changes, cost, needs-decision, or preview-required.

## Discovery-to-delivery flow

1. Inspect existing work and architecture to avoid duplicates and contradictions.
2. Identify unresolved decisions; keep discovery separate while they remain material.
3. Document architecture/design decisions in the project's source of truth.
4. Define the Epic outcome.
5. Slice into independently mergeable/testable implementation tasks.
6. Represent true manual gates as explicit human-operation tasks.
7. Wire dependencies.
8. Produce parallel execution lanes.
9. Mark only dependency-safe, fully refined implementation tasks ready for agents.
10. Produce an agent kickoff prompt that points to the Epic, dependencies, repository rules, and one-task/one-PR convention.

## Parallel plan

Finish planning with a compact execution map:

```text
Epic: <title>

Lane A — foundation
1. <task>
2. <task>

Lane B — independent work
1. <task>

Human gates
- <manual task> — required before/after <task>

Join
- <integration task> waits on required lanes/gates
```

Planning is not implementation: do not claim execution work merely because you created or refined it.
