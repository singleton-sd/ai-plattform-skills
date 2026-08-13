# Singleton SD — Skills

Platform-agnostic skill library for AI agents. Skills work with any LLM that can follow a markdown prompt — Claude, GPT, Gemini, or your own agents.

Part of the [`singleton-sd/ai-plattform`](https://gitlab.com/singleton-sd/ai-plattform) umbrella.

## Installing a skill

**Via npm:**
```bash
npx skills add @singleton-sd/skills/<category>/<skill-name>
```

**Via GitLab (direct):**
```bash
npx skills add gitlab:singleton-sd/ai-plattform/skills@<category>/<skill-name>
```

**All skills at once:**
```bash
npx skills add @singleton-sd/skills --all
```

## Available skills

### Engineering
| Skill | Description |
|-------|-------------|
| [`engineering/code-review`](engineering/code-review/SKILL.md) | Review code for quality, correctness, and security |
| [`engineering/fix-bugbot`](engineering/fix-bugbot/SKILL.md) | Fix Bugbot PR findings and reply on the review thread |
| [`engineering/form-ux`](engineering/form-ux/SKILL.md) | Implement and audit forms against submission, validation-timing, character-limit, pre-fill, password, and formatting UX rules |
| [`engineering/git-conventions`](engineering/git-conventions/SKILL.md) | Apply commit format, branch naming, and ticket linking conventions |
| [`engineering/implement-feature`](engineering/implement-feature/SKILL.md) | Implement an approved spec (any tracker), verify, and open a PR |
| [`engineering/refactoring`](engineering/refactoring/SKILL.md) | Identify and apply targeted refactoring improvements |
| [`engineering/register-permissions`](engineering/register-permissions/SKILL.md) | Register OpenFGA catalog entries when adding Prisma models or guarded Nest routes in poc-plattform-kit |
| [`engineering/repo-init`](engineering/repo-init/SKILL.md) | Initialize a repo with husky, commitlint, and release-it |
| [`engineering/repo-init-npm-publish`](engineering/repo-init-npm-publish/SKILL.md) | Scaffold publishable npm packages and CLI tools with GitLab, CI, and release setup |
| [`engineering/test-generation`](engineering/test-generation/SKILL.md) | Generate comprehensive, meaningful tests |

### Design
| Skill | Description |
|-------|-------------|
| [`design/product-design`](design/product-design/SKILL.md) | Requirement → Google Stitch → approved Design Contract → ticket handoff |
| [`design/ux-critique`](design/ux-critique/SKILL.md) | Evaluate UI and user flows against usability heuristics |
| [`design/figma-token-review`](design/figma-token-review/SKILL.md) | Audit Figma design tokens for consistency and naming |

### Marketing
| Skill | Description |
|-------|-------------|
| [`marketing/blog-post-generator`](marketing/blog-post-generator/SKILL.md) | Draft structured, on-brand blog posts from a brief |
| [`marketing/seo-analysis`](marketing/seo-analysis/SKILL.md) | Analyze on-page SEO and provide prioritized recommendations |

### Product
| Skill | Description |
|-------|-------------|
| [`product/prd-generator`](product/prd-generator/SKILL.md) | Generate a PRD from a feature idea or brief |
| [`product/backlog-refinement`](product/backlog-refinement/SKILL.md) | Refine ideas into decision-complete work and route discovery, delivery, and human gates |
| [`product/idea-to-delivery`](product/idea-to-delivery/SKILL.md) | Turn a refined idea into an Epic, mergeable delivery slices, dependencies, and human gates |
| [`product/draft-technical-tickets`](product/draft-technical-tickets/SKILL.md) | Draft repo-reconciled parent/child engineering tickets for approval |

### Writing
| Skill | Description |
|-------|-------------|
| [`writing/summarization`](writing/summarization/SKILL.md) | Distill documents, threads, or transcripts into clear summaries |
| [`writing/translation`](writing/translation/SKILL.md) | Translate content while preserving tone and intent |
| [`writing/tone-adjustment`](writing/tone-adjustment/SKILL.md) | Rewrite content to match a target tone |

### Documents
| Skill | Description |
|-------|-------------|
| [`documents/pdf-content-renamer`](documents/pdf-content-renamer/SKILL.md) | Rename PDFs from document content with `YY-MM-DD` date-prefixed filenames via `@singleton-sd/ai-plattform-tools-pdf-context` |
| [`documents/pdf-to-markdown`](documents/pdf-to-markdown/SKILL.md) | Convert PDFs to audit-ready Markdown with `@opendataloader/pdf` (Node.js) for AI analysis |
| [`documents/pdf-shrink`](documents/pdf-shrink/SKILL.md) | Shrink PDFs locally from a file or folder with `minimal`/`optimal` presets via `@singleton-sd/ai-plattform-tools-pdf-shrink` |

### Compliance

Regulatory filing workflows — one folder per body (e.g. `compliance/asic`, `compliance/ato`).

| Skill | Description |
|-------|-------------|
| [`compliance/asic`](compliance/asic/SKILL.md) | Guide ASIC lodgements, archive receipt PDFs, and fill consent-form docx templates from OneDrive |

### Operations
| Skill | Description |
|-------|-------------|
| [`operations/task-management`](operations/task-management/SKILL.md) | Create and manage tasks through a defined status workflow |
| [`operations/task-driven-development`](operations/task-driven-development/SKILL.md) | Work through project-management tasks one at a time with scoped staging and commit messages |
| [`operations/skill-authoring-workflow`](operations/skill-authoring-workflow/SKILL.md) | Create or update shared skills with task tracking and commit discipline |

## AI product workflow

Composable path from idea to pull request. Skills stay single-purpose; orchestrators call them instead of copying logic.

```text
Feature Idea
      │
      ▼
product-design          (design/product-design)
      │
      ▼
Google Stitch → Human Review → Design Contract
      │
      ▼
draft-technical-tickets (product/draft-technical-tickets)
      │
      ▼
ClickUp
      │
      ▼
implement-feature       (engineering/implement-feature)
      │
      ▼
Codex / Cursor / Claude Code → Pull Request
```

| Stage | Skill |
|-------|-------|
| Design → approval → Design Contract | [`design/product-design`](design/product-design/SKILL.md) |
| Tickets, acceptance criteria, ClickUp | [`product/draft-technical-tickets`](product/draft-technical-tickets/SKILL.md) (owns ticket format; do not re-implement here) |
| Spec → branch → verify → PR | [`engineering/implement-feature`](engineering/implement-feature/SKILL.md) |

**Source of truth:** [GitLab](https://gitlab.com/singleton-sd/ai-plattform/skills). [GitHub](https://github.com/singleton-sd/ai-plattform-skills) is a synchronized mirror for AI agents.

### Future workflow compositions

Build these as thin orchestrators that call the stages above (and peers):

| Workflow | Typical stages |
|----------|----------------|
| `feature-from-idea` | product-design → draft-technical-tickets → implement-feature |
| `bug-fix` | diagnose → ticket (optional) → implement-feature |
| `api-first` | backend contract → draft-technical-tickets → implement-feature |
| `greenfield-module` | product-design → draft-technical-tickets → implement-feature |
| `landing-page` | product-design → draft-technical-tickets → implement-feature |
| `design-system-update` | product-design / figma-token-review → draft-technical-tickets → implement-feature |

### Future commands

```text
/design
/ticket
/implement
/implement codex
/implement cursor
/implement claude
```

## Skill format

Each skill lives in its own folder as a `SKILL.md` file:

```
<category>/
└── <skill-name>/
    └── SKILL.md
```

### SKILL.md frontmatter

```yaml
---
name: Skill Name
description: One-line description of what the skill does
tags: [category, action, domain]
audience: [engineers, product-managers, designers, marketers, all]
status: draft | stable | deprecated
---
```

### Skill body

Plain markdown instructions for the AI agent. Write as if briefing a smart colleague who has no prior context on the task.

## Adding a skill

1. Create a folder under the relevant category: `<category>/<skill-name>/`
2. Add a `SKILL.md` with the frontmatter above and instructions in the body
3. Add a row to the table in this README
4. Open a merge request

If the skill doesn't fit an existing category, propose a new one in the MR description.

## Publishing to npm

```bash
npm publish
```

Requires: `npm login --scope=@singleton-sd`

## Resources

- [skills.sh](https://skills.sh/) — public skill registry
- [Skills CLI docs](https://skills.sh/docs) — `npx skills` usage
- [ai-plattform group](https://gitlab.com/singleton-sd/ai-plattform) — umbrella repository
