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

### GitHub

AI agents often use the [GitHub mirror](https://github.com/singleton-sd/ai-plattform-skills)
for PRs and repo access. **GitLab remains the source of truth** for this
platform; keep mirrors synchronized and prefer GitLab when they diverge.

## Agent skill adapters

Canonical skills live under `<category>/<skill-name>/SKILL.md`. Codex, Claude Code,
and Cursor discover skills from flat adapter folders that link back to those sources:

```
.agents/skills/<skill-name>/   →  <category>/<skill-name>/
.claude/skills/<skill-name>/   →  <category>/<skill-name>/
.cursor/skills/<skill-name>/   →  <category>/<skill-name>/
```

Regenerate adapters after adding or renaming a skill:

```bash
npm run link:skills
```

Adapters are also rebuilt automatically on `npm install` via the `prepare` hook.
The adapter folders are gitignored — only the canonical skill files are committed.

When authoring skills, use repo-root-relative paths (for example
`config/clickup-defaults.json`, not `../../config/clickup-defaults.json`) so
links still resolve when a tool reads the skill through an adapter folder.

Skill names must be globally unique across categories because adapter folders
use the flat `<skill-name>` form.

## Adding an integration

If you connect a new MCP server that's useful for the team, add it here with:
- The `claude mcp add` command
- A one-line description of what it provides
