#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process';

const CLICKUP_MCP_URL = 'https://mcp.clickup.com/mcp';
const CLICKUP_MCP_NAME = 'clickup';

function claudeAvailable() {
  const result = spawnSync('claude', ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

function mcpAlreadyAdded() {
  try {
    const result = spawnSync('claude', ['mcp', 'list'], { encoding: 'utf8' });
    return result.stdout?.includes(CLICKUP_MCP_NAME);
  } catch {
    return false;
  }
}

if (!claudeAvailable()) {
  // Not a Claude Code environment — skip silently
  process.exit(0);
}

if (mcpAlreadyAdded()) {
  console.log('[singleton-sd/skills] ClickUp MCP server already configured.');
  process.exit(0);
}

console.log('[singleton-sd/skills] Adding ClickUp MCP server...');

try {
  execSync(
    `claude mcp add --transport http ${CLICKUP_MCP_NAME} ${CLICKUP_MCP_URL}`,
    { stdio: 'inherit' }
  );
  console.log('');
  console.log('[singleton-sd/skills] ClickUp MCP server added.');
  console.log('  → Run /mcp inside Claude Code to authenticate with your ClickUp workspace.');
} catch {
  console.warn('[singleton-sd/skills] Could not add ClickUp MCP server automatically.');
  console.warn(`  → Run manually: claude mcp add --transport http ${CLICKUP_MCP_NAME} ${CLICKUP_MCP_URL}`);
}
