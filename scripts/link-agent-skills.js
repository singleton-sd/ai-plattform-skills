#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
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

// Repo-local adapter roots (symlinked under this checkout).
const ADAPTER_ROOTS = [
  '.agents/skills', // Codex, Antigravity CLI workspace, Gemini, Copilot
  '.claude/skills',
  '.cursor/skills',
  '.github/skills',
  '.kiro/skills', // Kiro CLI workspace
];

// Global adapter roots — only written by `npm run link:skills` (--catalog).
const GLOBAL_ADAPTER_ROOTS = [
  path.join(homeDir(), '.kiro', 'skills'), // Kiro CLI global
  path.join(homeDir(), '.gemini', 'config', 'skills'), // Antigravity CLI global
];

const GLOBAL_MANIFEST_PATH = path.join(
  homeDir(),
  '.config',
  'singleton-sd',
  'skills-global-adapters.json',
);

const EXCLUDED_DIR_NAMES = new Set([
  '.agents',
  '.claude',
  '.claude-plugin',
  '.cursor',
  '.git',
  '.github',
  '.husky',
  '.kiro',
  'node_modules',
  'scripts',
  'config',
]);

// --catalog: marketplace catalog + opt-in global home-directory links.
const writeCatalog = process.argv.includes('--catalog');

function homeDir() {
  return process.env.HOME || os.homedir();
}

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

function removeLink(linkPath) {
  let stats;
  try {
    stats = fs.lstatSync(linkPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (stats.isSymbolicLink() || stats.isDirectory()) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
}

function createDirectoryLink(targetAbs, linkPath) {
  let stats;
  try {
    stats = fs.lstatSync(linkPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      stats = null;
    } else {
      throw error;
    }
  }

  if (stats && !stats.isSymbolicLink() && !stats.isDirectory()) {
    throw new Error(
      `Skill link conflict at ${linkPath}: refusing to replace an existing non-link entry.`,
    );
  }

  removeLink(linkPath);

  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(targetAbs, linkPath, linkType);
}

function linkTargetMatches(linkPath, expectedTargetAbs) {
  try {
    return fs.realpathSync(linkPath) === fs.realpathSync(expectedTargetAbs);
  } catch {
    return false;
  }
}

function syncAdapterDirectory(adapterAbs, skills, { pruneUnexpected = true } = {}) {
  fs.mkdirSync(adapterAbs, { recursive: true });
  const expected = new Set(skills.map((skill) => skill.name));

  if (pruneUnexpected) {
    for (const entry of fs.readdirSync(adapterAbs, { withFileTypes: true })) {
      if (!expected.has(entry.name)) {
        removeLink(path.join(adapterAbs, entry.name));
      }
    }
  }

  for (const skill of skills) {
    const linkPath = path.join(adapterAbs, skill.name);
    createDirectoryLink(skill.sourceAbs, linkPath);
  }
}

function syncRepoAdapterRoot(adapterRoot, skills) {
  syncAdapterDirectory(path.join(repoRoot, adapterRoot), skills, {
    pruneUnexpected: true,
  });
}

function readGlobalManifest() {
  try {
    return JSON.parse(fs.readFileSync(GLOBAL_MANIFEST_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function writeGlobalManifest(manifest) {
  fs.mkdirSync(path.dirname(GLOBAL_MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(GLOBAL_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

function isManagedGlobalLink(linkPath, recordedTargetAbs) {
  let stats;
  try {
    stats = fs.lstatSync(linkPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return true;
    }
    throw error;
  }

  if (!stats.isSymbolicLink()) {
    return false;
  }

  // Dangling symlink from a previous checkout — safe to remove when manifest says we own it.
  if (!fs.existsSync(linkPath)) {
    return true;
  }

  return linkTargetMatches(linkPath, recordedTargetAbs);
}

function syncGlobalAdapterRoot(adapterAbs, skills, manifest) {
  fs.mkdirSync(adapterAbs, { recursive: true });

  const adapterKey = adapterAbs;
  const managed = { ...(manifest[adapterKey] ?? {}) };
  const expected = new Map(skills.map((skill) => [skill.name, skill.sourceAbs]));

  for (const [name, recordedTarget] of Object.entries({ ...managed })) {
    if (expected.has(name)) {
      continue;
    }

    const linkPath = path.join(adapterAbs, name);
    if (isManagedGlobalLink(linkPath, recordedTarget)) {
      removeLink(linkPath);
      delete managed[name];
    }
  }

  for (const skill of skills) {
    const linkPath = path.join(adapterAbs, skill.name);

    let stats;
    try {
      stats = fs.lstatSync(linkPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        stats = null;
      } else {
        throw error;
      }
    }

    if (stats && !stats.isSymbolicLink() && !stats.isDirectory()) {
      throw new Error(
        `Skill link conflict at ${linkPath}: refusing to replace an existing non-link entry.`,
      );
    }

    if (stats?.isSymbolicLink()) {
      const recorded = managed[skill.name];
      const ours =
        linkTargetMatches(linkPath, skill.sourceAbs) ||
        (recorded && linkTargetMatches(linkPath, recorded));
      if (!ours) {
        continue;
      }
    }

    createDirectoryLink(skill.sourceAbs, linkPath);
    managed[skill.name] = skill.sourceAbs;
  }

  manifest[adapterKey] = managed;
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
    'Platform-agnostic SKILL.md library for Cursor, Claude Code, Codex, Copilot, Kiro CLI, and Antigravity CLI.';

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
      'kiro-cli',
      'antigravity-cli',
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

function formatAdapterTarget(adapterAbs) {
  const home = homeDir();
  if (adapterAbs.startsWith(`${home}${path.sep}`)) {
    return `~${adapterAbs.slice(home.length)}`;
  }
  return adapterAbs;
}

function formatAdapterTargets(includeGlobal) {
  const targets = [...ADAPTER_ROOTS];
  if (includeGlobal) {
    targets.push(...GLOBAL_ADAPTER_ROOTS.map((root) => formatAdapterTarget(root)));
  }
  return targets.join(', ');
}

function main() {
  const skills = discoverSkills();
  detectCollisions(skills);

  for (const adapterRoot of ADAPTER_ROOTS) {
    syncRepoAdapterRoot(adapterRoot, skills);
  }

  if (writeCatalog) {
    const manifest = readGlobalManifest();
    for (const adapterAbs of GLOBAL_ADAPTER_ROOTS) {
      syncGlobalAdapterRoot(adapterAbs, skills, manifest);
    }
    writeGlobalManifest(manifest);
    writeMarketplaceCatalog(skills);
  }

  const catalogNote = writeCatalog
    ? ' Wrote global skill links and .claude-plugin marketplace catalog.'
    : '';
  console.log(
    `[singleton-sd/skills] Linked ${skills.length} skills into ${formatAdapterTargets(writeCatalog)}.${catalogNote}`,
  );
}

main();
