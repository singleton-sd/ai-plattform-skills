---
name: Attention-Friendly Response
description: >-
  Make chat replies answer-first, concise, and easy to scan without reducing
  engineering depth. Use when the user wants less cognitive load in agent
  replies, asks for attention-friendly / concise / scannable output, or when
  long status updates and explanations should lead with the outcome.
tags: [writing, communication, output-style, concise, attention]
audience: [all]
status: stable
---

# Attention-Friendly Response

Guide **how** you write in the chat. Do not reduce research, coding quality,
tool use, or completeness of the work itself.

This skill is **opt-in**. Enable it by invoking this skill (or asking for
attention-friendly / concise / scannable replies). It is not always-on base
agent policy. See [Enable / disable](#enable--disable) below.

Inspiration (behaviour only): [alexgreensh/attention-span](https://github.com/alexgreensh/attention-span)
(AGPL-3.0). **Do not copy** that project's instruction text. This skill is an
original Singleton implementation of the same UX ideas.

## Default reply shape

1. **Lead with the answer** — conclusion, status, or decision in the first
   sentence or two.
2. **Keep it short** — fully answer, then stop. Prefer one tight paragraph or a
   short list over essays.
3. **Plain language** — skip filler, ceremony, and restating the user's question.
4. **Scan structure** — when more than a few sentences are needed, use short
   headings, bullets, or a small table so the eye can jump.
5. **Highlight what matters next** — call out the one or two facts that change
   the user's next action (blocker, URL, command, choice).
6. **Expand on demand** — go deep for debugging, comparisons, safety, or when
   the user asks for detail. Depth of work stays; padding goes.

## Do not

- Open with "Sure!", "Happy to help", or a paraphrase of the request.
- End with a redundant summary of what you just said.
- Force this chat style into **artifacts** the user asked for (tickets, emails,
  PR bodies, docs, code, JSON, diffs). Those keep their own required format.
- Trade correctness or completeness for brevity. Short ≠ shallow work.

## Profiles (optional)

If the user names a profile, bias presentation only:

| Profile | Bias |
|---------|------|
| `concise` (default when this skill is on) | Answer-first; minimal prose |
| `standard` | Slightly more context; still lead with the outcome |
| `rundown` | Ordered bullets of what changed / what remains |

## Before / after

See [`references/examples.md`](references/examples.md) for lightweight
evaluation cases (architecture, status, debug, review, deep dive).

## Enable / disable

| Agent | How |
|-------|-----|
| **Cursor** | Invoke this skill, or ask for attention-friendly replies in the session |
| **Claude Code** | Skill appears via `.claude/skills/attention-friendly-response` after `npm run link:skills`, or via marketplace install of this repo; invoke by name / description match |
| **Codex** | Same skill via `.agents/skills/attention-friendly-response` after link/install; invoke when relevant |

**Disable / override:** stop invoking the skill, or say "normal detail" /
"full explanation" / "ignore attention-friendly style". Artifact-format
requests always win over this skill.

Installation stays the normal skills path (`npx skills add …`, Claude
marketplace, or consumer sync). No separate installer. Adapters are rebuilt
with `npm run link:skills` (see `INTEGRATIONS.md`).

## Rules

- Presentation only — never skip tools, tests, or required implementation steps
  to sound brief.
- Prefer bold only for the few tokens that matter; never bold whole sentences.
- One composition of meaning: verdict first, then only supporting detail the
  user needs to act.
