---
name: Skill Authoring Workflow
description: Create or update shared project skills with ClickUp task tracking, README registration, validation, scoped staging, and commit-message discipline. Use when the user asks to create a skill, update a SKILL.md file, add a workflow skill, or record a reusable procedure in the skills repository.
tags: [operations, skills, workflow, clickup, git]
audience: [engineers, tech-leads, all]
status: stable
---

# Skill Authoring Workflow

Use this skill when creating or updating a skill in this repository.

## Discovery

1. Read any relevant existing skills first:
   - `operations/task-management`
   - `operations/task-driven-development`
   - `engineering/git-conventions`
   - Any existing skill in the same category
2. Infer requirements from the current conversation when the user has already described the workflow.
3. Clarify only if the skill location, scope, or trigger scenarios are genuinely ambiguous.

## Task Tracking

1. Create a ClickUp task in the Skills Product Backlog unless the user provides an existing task.
   - List ID: `901614473129`
   - Use an action-first, sentence-case name.
   - Include why the skill is needed and acceptance criteria.
2. Use the task custom ID in commit messages.
3. Set the task to the active working status when implementation starts.
   - Prefer `in progress` if the list supports it.
   - Use `in development` when `in progress` is not a valid status.
4. Do not mark the task complete when implementation is merely finished.
   - Mark it complete only when the user asks or when the user says to move to the next task.

## Authoring

1. Create a folder using lowercase kebab-case:
   - `<category>/<skill-name>/SKILL.md`
2. Use concise frontmatter:
   - `name`
   - `description`
   - `tags`
   - `audience`
   - `status`
3. Make the description specific and trigger-oriented.
4. Keep `SKILL.md` focused on reusable procedure, not a transcript of one session.
5. Capture recent learnings as durable rules, especially:
   - Stage only files for the current task.
   - Do not commit unless the user explicitly asks.
   - Do not mark tasks complete until asked or moving on.
   - If a ClickUp status is rejected, discover or try the list's closest valid equivalent.
   - If a signed commit fails because the sandbox cannot reach GPG, retry with normal permissions instead of bypassing signing or hooks.

## README Registration

Update the root `README.md` so the skill is discoverable in the relevant category table.

Use the existing row style:

```markdown
| [`operations/example-skill`](operations/example-skill/SKILL.md) | One-line description |
```

## Validation

Before reporting back:

1. Read the new `SKILL.md` to check the frontmatter and wording.
2. Check lints for the touched files.
3. Ignore pre-existing linter warnings outside the touched lines unless the user asks for cleanup.
4. Check git status in the skills repository explicitly with `git -C`.

## Completion Response

When finished, report:

```text
Created [TICKET-ID]: [task name]

Changed files:
- category/skill-name/SKILL.md
- README.md

Status:
Task is in progress and ready for review.

Proposed commit message:
feat: TICKET-ID Add [skill summary]
```

Do not say the task is complete unless the ClickUp task was actually moved to a completed status.
