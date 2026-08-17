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
   - `engineering/isolated-worktree`
   - Any existing skill in the same category
2. Infer requirements from the current conversation when the user has already described the workflow.
3. Clarify only if the skill location, scope, or trigger scenarios are genuinely ambiguous.

## Task Tracking

1. Before creating a task, read [`config/clickup-defaults.json`](config/clickup-defaults.json)
   and default to **`skillsRepositoryTasks`** (Skills Product Backlog) unless the user names another list.
2. Create a ClickUp task there unless the user provides an existing task.
   - List ID: `901614473129` (also recorded in `config/clickup-defaults.json`)
   - Use an action-first, sentence-case name.
   - Include why the skill is needed and acceptance criteria.
3. Use the task **custom ID** in commit messages (for example `AI-36`). If the user supplies a ticket ID, use that — never use ClickUp internal IDs like `86d3mw1pt` in commits.
4. Set the task to the active working status when implementation starts.
   - Prefer `in progress` if the list supports it.
   - Use `in development` when `in progress` is not a valid status.
5. Do not mark the task complete when implementation is merely finished.
   - Mark it complete only when the user asks or when the user says to move to the next task.

## Worktree

Create or update skills from a sibling worktree of this repository, not on
`master` / `main`. Follow
[`engineering/isolated-worktree`](engineering/isolated-worktree/SKILL.md).

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
5. Use repo-root-relative paths in links (for example `config/clickup-defaults.json`,
   not `../../config/clickup-defaults.json`) so skills still resolve when tools read
   them through `.agents/skills/`, `.claude/skills/`, `.cursor/skills/`, or
   `.github/skills/` adapters.
6. Choose a globally unique `<skill-name>` across all categories. Adapter folders use
   the flat skill name only.
7. Capture recent learnings as durable rules, especially:
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

## Agent Adapters and marketplace catalog

After adding or renaming a skill, regenerate adapter links **and** the Claude
marketplace catalog:

```bash
npm run link:skills
```

This rebuilds gitignored adapters
(`.agents/skills/`, `.claude/skills/`, `.cursor/skills/`, `.github/skills/`)
and writes committed `.claude-plugin/marketplace.json` plus
`.claude-plugin/plugin.json`. Stage those catalog files with the skill.

`npm install` / `prepare` only rebuilds adapters (does not rewrite the
committed catalog).

## Validation

Before reporting back:

1. Read the new `SKILL.md` to check the frontmatter and wording.
2. Check lints for the touched files.
3. Ignore pre-existing linter warnings outside the touched lines unless the user asks for cleanup.
4. Check git status in the skills repository explicitly with `git -C`.

Ship from a sibling worktree as a **GitLab merge request** against
`gitlab.com/singleton-sd/ai-plattform/skills`. Do not merge on GitHub first.

## Completion Response

When finished, report:

```text
Created [TICKET-ID]: [task name]

Changed files:
- category/skill-name/SKILL.md
- README.md
- .claude-plugin/marketplace.json
- .claude-plugin/plugin.json

Status:
Task is in progress and ready for review.

Proposed commit message:
feat: TICKET-ID Add [skill summary]
```

Do not say the task is complete unless the ClickUp task was actually moved to a completed status.
