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
| [`engineering/git-conventions`](engineering/git-conventions/SKILL.md) | Apply commit format, branch naming, and ticket linking conventions |
| [`engineering/refactoring`](engineering/refactoring/SKILL.md) | Identify and apply targeted refactoring improvements |
| [`engineering/repo-init`](engineering/repo-init/SKILL.md) | Initialize a repo with husky, commitlint, and release-it |
| [`engineering/test-generation`](engineering/test-generation/SKILL.md) | Generate comprehensive, meaningful tests |

### Design
| Skill | Description |
|-------|-------------|
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
| [`product/backlog-refinement`](product/backlog-refinement/SKILL.md) | Refine raw backlog items into actionable stories |

### Writing
| Skill | Description |
|-------|-------------|
| [`writing/summarization`](writing/summarization/SKILL.md) | Distill documents, threads, or transcripts into clear summaries |
| [`writing/translation`](writing/translation/SKILL.md) | Translate content while preserving tone and intent |
| [`writing/tone-adjustment`](writing/tone-adjustment/SKILL.md) | Rewrite content to match a target tone |

### Documents
| Skill | Description |
|-------|-------------|
| [`documents/pdf-to-markdown`](documents/pdf-to-markdown/SKILL.md) | Convert PDFs to audit-ready Markdown with `@opendataloader/pdf` (Node.js) for AI analysis |

### Operations
| Skill | Description |
|-------|-------------|
| [`operations/task-management`](operations/task-management/SKILL.md) | Create and manage tasks through a defined status workflow |
| [`operations/task-driven-development`](operations/task-driven-development/SKILL.md) | Work through project-management tasks one at a time with scoped staging and commit messages |
| [`operations/skill-authoring-workflow`](operations/skill-authoring-workflow/SKILL.md) | Create or update shared skills with task tracking and commit discipline |

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
