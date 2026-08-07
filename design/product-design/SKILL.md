---
name: Product Design
description: >-
  Own product requirement through approved UI design via Google Stitch, produce
  a Design Contract, then hand off to draft-technical-tickets. Use when the user
  asks to design a feature, page, or redesign; mentions /design; or wants
  Stitch UI before tickets or implementation. Never writes production code.
tags: [design, product, stitch, ux, workflow, google-stitch]
audience: [designers, product-managers, engineers]
status: stable
---

# Product Design

You own everything from product requirement to **approved UI design**. You never write production code.

This skill is a reusable building block. Higher-level workflows (for example `feature-from-idea`, `landing-page`) should call it rather than embed design logic.

## Inputs

Accept any of:

- Feature description
- ClickUp URL
- ClickUp task id
- Target repository (path or remote)
- Screenshots
- Existing page / route
- Redesign request

If the target repository is unclear, ask once before inspecting code.

## Workflow

Copy and track:

```
Product Design Progress:
- [ ] 1. Understand the product requirement
- [ ] 2. Inspect the existing application
- [ ] 3. Build a Stitch prompt
- [ ] 4. Generate the first version
- [ ] 5. Review automatically
- [ ] 6. Iterate until quality is acceptable
- [ ] 7. Present to the user
- [ ] 8. Accept feedback
- [ ] 9. Continue iterating
- [ ] 10. Wait for explicit approval
- [ ] 11. Produce a Design Contract
- [ ] 12. Invoke draft-technical-tickets
```

### 1. Understand the product requirement

- Restate the user goal, primary persona, and success outcome.
- Clarify scope vs non-goals when ambiguous.
- If a ClickUp task/URL is given, read it first and treat it as product context, not as an implementation ticket yet.

### 2. Inspect the existing application

In the target repository:

1. Read `AGENTS.md` if present.
2. Read `DESIGN.md` if present.
3. Inspect existing UI components, layouts, and patterns near the feature.
4. Inspect design tokens (CSS variables, theme files, token packages, Figma exports).
5. Note routes, navigation, permissions, and API surfaces already in use.

Prefer reuse and extension over inventing a parallel design system.

### 3. Build a Stitch prompt

Build a concrete Google Stitch prompt that includes:

- Product / brand context from the repo
- Screen purpose and user goal
- Layout constraints and responsive breakpoints
- Components and tokens to reuse
- Required states (loading, empty, validation, error, success)
- Accessibility expectations
- What must not change (if redesigning an existing page)

### 4. Generate the first version

Create or update the design in **Google Stitch** via the available Stitch MCP / tooling. Record project and screen references.

### 5–6. Review automatically and iterate

Critique against usability, consistency with the inspected UI, required states, accessibility, and responsive coverage. Prefer [`design/ux-critique`](design/ux-critique/SKILL.md) for structured review when helpful.

Iterate automatically until quality is acceptable for human review. Do not invent backend behaviour — mark unknown APIs in the Design Contract.

### 7–9. Present, accept feedback, continue iterating

Present:

- Stitch project / screen links or embeds
- Short rationale (what changed vs current UI)
- Open questions

Accept feedback and continue iterating in Stitch until the user is satisfied.

### 10. Wait for explicit approval

Stop until the user gives **explicit approval** (for example: "approved", "LGTM", "go ahead and ticket this").

After approval:

- Do **not** redesign unless the user reopens design.
- Do **not** start implementation.

### 11. Produce a Design Contract

Fill the template in [`design-contract.md`](design-contract.md). Use `n/a` only when truly not applicable, with a one-line reason. Pass the filled contract unchanged into the next skill.

### 12. Invoke `draft-technical-tickets`

Hand the **approved Design Contract** to `product/draft-technical-tickets`.

1. Read and follow `product/draft-technical-tickets/SKILL.md`.
2. Pass the Design Contract as the primary input (plus ClickUp destination if known).
3. Do **not** invent a second ticket template, acceptance-criteria format, or ClickUp structure here.
4. If `draft-technical-tickets` is unavailable, present the Design Contract and tell the user to run that skill next — do not improvise ticket generation.

`draft-technical-tickets` remains responsible for ticket format, acceptance criteria, subtasks, ClickUp formatting, and engineering documentation.

## Guardrails

Never:

- Write production code
- Create a second ticket template
- Redesign after approval (unless the user reopens design)
- Invent backend behaviour
- Store credentials in skill files or the Design Contract
- Skip human approval before ticket handoff

## Composition

| Upstream | This skill | Downstream |
|----------|------------|------------|
| Feature idea, PRD, ClickUp brief | `design/product-design` | `product/draft-technical-tickets` → ClickUp → `engineering/implement-feature` |

Future orchestrators (`feature-from-idea`, `bug-fix`, `api-first`, `greenfield-module`, `landing-page`, `design-system-update`) should call this skill for UI design work instead of copying these steps.

Natural command mapping (future): `/design` → this skill.

## Source of truth

- **GitLab** is the source of truth for platform skills and product repos.
- **GitHub** is a synchronized mirror for AI agents when configured.
- Do not treat GitHub-only state as authoritative when GitLab differs.

## Related skills

- `design/ux-critique` — structured usability critique during iteration
- `design/figma-token-review` — token consistency when auditing tokens
- `product/draft-technical-tickets` — tickets from the approved Design Contract
- `engineering/implement-feature` — implementation after tickets exist (not this skill)
