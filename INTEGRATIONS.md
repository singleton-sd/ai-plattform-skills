# Integrations

MCP servers and AI tool connections for use with this skills repo.

## MCP Servers

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) lets AI assistants connect to external tools and services. The servers below are recommended for developers working in this repo.

### ClickUp

Official MCP server provided by ClickUp.

```bash
claude mcp add --transport http clickup https://mcp.clickup.com/mcp
```

Then run `/mcp` in Claude Code to authenticate via OAuth.

## Adding an integration

If you connect a new MCP server that's useful for the team, add it here with:
- The `claude mcp add` command
- A one-line description of what it provides
