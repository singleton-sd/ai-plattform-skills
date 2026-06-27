# Integrations

MCP servers and AI tool connections for use with this skills repo.

## MCP Servers

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) lets AI assistants connect to external tools and services. The servers below are recommended for developers working in this repo.

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

## Adding an integration

If you connect a new MCP server that's useful for the team, add it here with:
- The `claude mcp add` command
- A one-line description of what it provides
