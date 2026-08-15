#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const CATEGORY_DIRS = [
  'compliance',
  'design',
  'documents',
  'engineering',
  'marketing',
  'operations',
  'product',
  'writing',
];

const ADAPTER_ROOTS = [
  '.agents/skills',
  '.claude/skills',
  '.cursor/skills',
  '.github/skills',
];

const EXCLUDED_DIR_NAMES = new Set([
  '.agents',
  '.claude',
  '.claude-plugin',
  '.cursor',
  '.git',
  '.github',
  '.husky',
  'node_modules',
  'scripts',
  'config',
]);

const writeCatalog = process.argv.includes('--catalog');

function isDirectory(entryPath) {
  try {
    return fs.statSync(entryPath).isDirectory();
  } catch {
    return false;
  }
}

function discoverSkills() {
  const skills = [];

  for (const category of CATEGORY_DIRS) {
    const categoryPath = path.join(repoRoot, category);
    if (!isDirectory(categoryPath)) {
      continue;
    }

    for (const entry of fs.readdirSync(categoryPath, { withFileTypes: true })) {
      if (!entry.isDirectory() || EXCLUDED_DIR_NAMES.has(entry.name)) {
        continue;
      }

      const skillDir = path.join(categoryPath, entry.name);
      const skillFile = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        continue;
      }

      skills.push({
        name: entry.name,
        category,
        source: `${category}/${entry.name}`,
        sourceAbs: skillDir,
      });
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function detectCollisions(skills) {
  const byName = new Map();

  for (const skill of skills) {
    const existing = byName.get(skill.name) ?? [];
    existing.push(skill);
    byName.set(skill.name, existing);
  }

  const collisions = [...byName.entries()].filter(([, items]) => items.length > 1);
  if (collisions.length > 0) {
    const details = collisions
      .map(([name, items]) => `${name}: ${items.map((item) => item.source).join(', ')}`)
      .join('\n');
    throw new Error(
      `Duplicate skill names detected. Adapter links require globally unique names:\n${details}`,
    );
  }
}

function ensureAdapterRoot(adapterRoot) {
  fs.mkdirSync(path.join(repoRoot, adapterRoot), { recursive: true });
}

function removeLink(linkPath) {
  if (!fs.existsSync(linkPath)) {
    return;
  }

  const stats = fs.lstatSync(linkPath);
  if (stats.isSymbolicLink() || stats.isDirectory()) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
}

function createDirectoryLink(targetAbs, linkPath) {
  removeLink(linkPath);

  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(targetAbs, linkPath, linkType);
}

function syncAdapterRoot(adapterRoot, skills) {
  ensureAdapterRoot(adapterRoot);
  const adapterAbs = path.join(repoRoot, adapterRoot);
  const expected = new Set(skills.map((skill) => skill.name));

  for (const entry of fs.readdirSync(adapterAbs, { withFileTypes: true })) {
    if (!expected.has(entry.name)) {
      removeLink(path.join(adapterAbs, entry.name));
    }
  }

  for (const skill of skills) {
    const linkPath = path.join(adapterAbs, skill.name);
    createDirectoryLink(skill.sourceAbs, linkPath);
  }
}

function catalogSkillPaths(skills) {
  return [...skills]
    .sort((a, b) => a.source.localeCompare(b.source))
    .map((skill) => `./${skill.source}`);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarketplaceCatalog(skills) {
  const pluginDir = path.join(repoRoot, '.claude-plugin');
  fs.mkdirSync(pluginDir, { recursive: true });

  const skillPaths = catalogSkillPaths(skills);
  const description =
    'Platform-agnostic SKILL.md library for Cursor, Claude Code, Codex, and Copilot.';

  const plugin = {
    name: 'singleton-sd-skills',
    displayName: 'Singleton SD Skills',
    version: '0.1.0',
    description,
    author: {
      name: 'Singleton SD',
      url: 'https://github.com/singleton-sd',
    },
    homepage: 'https://github.com/singleton-sd/ai-plattform-skills',
    repository: 'https://github.com/singleton-sd/ai-plattform-skills',
    keywords: [
      'agent-skills',
      'claude-code',
      'cursor',
      'codex',
      'github-copilot',
    ],
    strict: false,
    skills: skillPaths,
  };

  const marketplace = {
    name: 'singleton-sd-skills',
    owner: {
      name: 'Singleton SD',
      url: 'https://github.com/singleton-sd',
    },
    metadata: {
      description,
      version: '0.1.0',
    },
    plugins: [
      {
        name: 'singleton-sd-skills',
        description,
        source: './',
        strict: false,
        skills: skillPaths,
      },
    ],
  };

  writeJson(path.join(pluginDir, 'plugin.json'), plugin);
  writeJson(path.join(pluginDir, 'marketplace.json'), marketplace);
}

function main() {
  const skills = discoverSkills();
  detectCollisions(skills);

  for (const adapterRoot of ADAPTER_ROOTS) {
    syncAdapterRoot(adapterRoot, skills);
  }

  if (writeCatalog) {
    writeMarketplaceCatalog(skills);
  }

  const catalogNote = writeCatalog
    ? ' Wrote .claude-plugin marketplace catalog.'
    : '';
  console.log(
    `[singleton-sd/skills] Linked ${skills.length} skills into ${ADAPTER_ROOTS.join(', ')}.${catalogNote}`,
  );
}

main();
