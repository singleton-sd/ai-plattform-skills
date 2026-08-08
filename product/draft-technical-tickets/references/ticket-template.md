# Ticket template

Use this structure for every draft returned in conversation.
Omit a section only when truly not applicable; write `n/a — <reason>` rather than inventing filler.

When creating a parent + children, output the **parent first**, then each **child** in recommended implementation order.

---

## Parent feature (when needed)

```markdown
# [Parent] <concise outcome-oriented title>

**Type:** Feature
**Repo tag:** [repo=<org/repo>]

## Objective
<What capability exists when the parent is done>

## Why
<Product / technical trigger; link Design Contract / ClickUp / Architecture Doc if known>

## Scope
- In: <bullets>
- Out: <bullets>

## Recommended child order
1. <Child title> — <one-line deliverable> — depends on: <none | sibling>
2. ...

## Shared constraints
<Architecture, security, tenancy, compatibility rules that apply to all children>

## Verified facts
- <Fact from repo or ClickUp docs — cite path / doc>

## Assumptions
- <Assumption>: <why conservative>

## Open questions
- <Only questions that change scope, architecture, security, data compatibility, or AC>

## Risks / rollout
- <Migration, feature flag, dual-write, backfill, observability, etc.>
```

---

## Child / single implementation ticket

```markdown
# <Action-oriented title>

**Type:** Feature | Bug | Chore | Spike
**Repo tag:** [repo=<org/repo>]
**Parent:** <parent title or n/a>

## Objective
<One coherent deliverable this ticket alone ships>

## User-visible behaviour
<What users or operators observe; n/a for pure infra with reason>

## Current behaviour
<Verified today — cite paths/symbols — or “not implemented”>

## Required behaviour
<Target behaviour; distinguish requirement vs assumption>

## Non-goals
- <Explicit exclusions>

## Affected areas
| Area | Path / symbol / endpoint | Confidence |
|------|--------------------------|------------|
| <e.g. API> | `<verified path>` | verified \| likely \| unknown |

## Approach constraints
<Must / must-not from Architecture Doc + AGENTS.md. Do not prescribe speculative file edits as facts.>

## Acceptance criteria

### Success
- Given <precondition>, when <action>, then <observable outcome>
- ...

### Failure / boundaries
- Given <authz / validation / tenant / error case>, when <action>, then <observable outcome>
- ...

## Tests and validation
- Automated: <layer-appropriate tests; name repo scripts only if verified>
- Manual / ops: <only if needed>

## Dependencies
- Blocked by: <ticket titles or n/a>
- Unblocks: <ticket titles or n/a>

## Compatibility / migrations
<Prisma, API clients, Service Bus contracts, feature flags — or n/a>

## Observability
<Logs, metrics, traces, alerts — or n/a>

## Assumptions
- ...

## Open questions
- ...
```

---

## Bug variant extras

When **Type** is Bug, also include:

```markdown
## Steps to reproduce
1. ...

## Expected behaviour
...

## Actual behaviour
...
```

---

## ClickUp creation notes (only when user asks to create tasks)

Do **not** create ClickUp tasks from drafts unless explicitly requested.

When asked to create:

1. Prefer ops list from [`project-context.md`](project-context.md) for `poc-plattform-kit`.
2. One ClickUp task per delivery slice (parent + each child as linked parent/subtask or linked tasks per team practice).
3. Put the full template body in the task description (markdown).
4. Include `[repo=…]` in the name or description.
5. Default status `TO DO` (or `READY FOR AI` only if the user says the ticket is approved for agents).
6. Link Architecture Doc / Design Contract URLs in the description when they exist.
7. Still never claim a ticket was created unless the create API call succeeded and you return the URL.
