# Integrations

MCP servers and AI tool connections for use with this skills repo.

## MCP Servers

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) lets AI assistants connect to external tools and services. The servers below are recommended for developers working in this repo.

### Google Stitch

Used by [`design/product-design`](design/product-design/SKILL.md) to generate and iterate UI designs. Configure the Stitch MCP in your agent (Cursor / Claude Code / Codex) — do not store API keys inside skills.

### ClickUp

Official MCP server provided by ClickUp.

**Claude Code**

```bash
claude mcp add --transport http clickup https://mcp.clickup.com/mcp
```

Then run `/mcp` in Claude Code to authenticate via OAuth.

**Cursor**

Add to your `~/.cursor/mcp.json` (or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "clickup": {
      "url": "https://mcp.clickup.com/mcp"
    }
  }
}
```

Reload Cursor, open **Settings → MCP**, start the ClickUp server, and complete the OAuth flow in your browser.

**Default task destinations** for this skills repo (IDs and URLs) live in
[`config/clickup-defaults.json`](config/clickup-defaults.json). Use the
**Skills Product Backlog** list when creating tasks for skill changes unless the
user specifies another destination.

### GitLab

**Source of truth** for this skills repo:
[`gitlab.com/singleton-sd/ai-plattform/skills`](https://gitlab.com/singleton-sd/ai-plattform/skills).

Open merge requests against GitLab `master`. Prefer GitLab when GitHub diverges.

```bash
npx skills add https://gitlab.com/singleton-sd/ai-plattform/skills --all
```

### GitHub

[GitHub](https://github.com/singleton-sd/ai-plattform-skills) is a synchronized
public mirror so skills.sh and Claude Code marketplace can install with
`owner/repo` shorthand:

```bash
npx skills add singleton-sd/ai-plattform-skills --all
claude plugin marketplace add singleton-sd/ai-plattform-skills
```

Do not merge feature work on GitHub first. Merge on GitLab, then sync the mirror.

## Agent skill adapters

Canonical skills live under `<category>/<skill-name>/SKILL.md`. Agents discover
a flat view through generated adapters:

```
.agents/skills/<skill-name>/              →  <category>/<skill-name>/   (Codex, Antigravity CLI workspace, Gemini, Copilot)
.claude/skills/<skill-name>/              →  <category>/<skill-name>/   (Claude Code)
.cursor/skills/<skill-name>/              →  <category>/<skill-name>/   (Cursor)
.github/skills/<skill-name>/              →  <category>/<skill-name>/   (VS Code Copilot)
.kiro/skills/<skill-name>/                →  <category>/<skill-name>/   (Kiro CLI workspace)
~/.kiro/skills/<skill-name>/              →  <category>/<skill-name>/   (Kiro CLI global)
~/.gemini/config/skills/<skill-name>/       →  <category>/<skill-name>/   (Antigravity CLI global)
```

Claude Code and `npx skills add` also read committed
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), which lists
every canonical skill path so category folders do not need `--full-depth`.

Regenerate adapters **and** the marketplace catalog after adding or renaming a skill:

```bash
npm run link:skills
```

`npm install` / `prepare` rebuilds repo-local adapters only (no global home links).
Global home links (`~/.kiro/skills`, `~/.gemini/config/skills`) run only via
`npm run link:skills` (`--catalog`), not `prepare`.

Global adapter directories are tracked in
`~/.config/singleton-sd/skills-global-adapters.json`; only repo-owned links are
removed when skills are renamed or dropped.

Adapter folders are gitignored — commit the canonical skill files plus
`.claude-plugin/` catalog updates.

When authoring skills, use repo-root-relative paths (for example
`config/clickup-defaults.json`, not `../../config/clickup-defaults.json`) so
links still resolve when a tool reads the skill through an adapter folder.

Skill names must be globally unique across categories because adapter folders
use the flat `<skill-name>` form.

Nested worktrees inside a checkout (for example `.worktrees/` under `main`)
break adapter junctions, especially on Windows. See
[`engineering/isolated-worktree`](engineering/isolated-worktree/SKILL.md).

## Tracker profiles (engineering host)

App repos declare `.skills/profile` with `engineeringHost`: `github` or `gitlab`.
See [`config/tracker-profiles/`](config/tracker-profiles/README.md).

- GitHub-hosted project → GitHub Issues + PR
- GitLab-hosted project → GitLab Issues + MR
- ClickUp → product features and optional tracking only

## Consumer repo install (multi-agent)

Consumer app repos should **not** hardcode a local skills checkout path. Install from the GitHub mirror so cloud agents work:

```bash
npx skills add singleton-sd/ai-plattform-skills \
  --skill backend --skill task-driven-development \
  -a cursor -a claude-code -a grok -a codex \
  --copy -y
```

Project folders written by the Skills CLI:

| Agent | Project path |
|-------|----------------|
| Cursor / Codex | `.agents/skills/` |
| Claude Code | `.claude/skills/` |
| Grok | `.grok/skills/` |

Prefer a committed `.skills/manifest.json` + install script in the consumer repo (pin for cloud; refresh on demand).

## Adding an integration

If you connect a new MCP server that's useful for the team, add it here with:
- The `claude mcp add` command
- A one-line description of what it provides
