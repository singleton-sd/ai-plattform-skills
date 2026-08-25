---
name: claude-design-export
description: >-
  Export a folder of Claude Design Components (*.dc.html) into AI-readable
  Markdown specs and PNG screenshots — pages, header/footer chrome, and
  logo/icon lockups. Use when the user points at a Claude Design folder, asks
  to export mockups for AI, or needs deterministic MD+PNG pairs from .dc.html.
tags: [design, claude, omelette, export, markdown, png, mockups]
audience: [designers, engineers, product-managers]
status: draft
---

# Claude Design export

Turn a Claude Design / Omelette folder into **one Markdown spec + one PNG per
discovered screen**, plus logo/icon lockup crops when present.

Do not screenshot by improvising a one-off Chrome command. Run the published CLI.

## When to use

- User points at a Claude Design folder of `*.dc.html` files
- User wants deterministic Markdown + PNG pairs for AI implementation
- Header/footer chrome or logo lockup crops are needed alongside pages

## Required inputs

| Input | Rule |
| --- | --- |
| `design_dir` | Folder that contains `*.dc.html` (and usually `support.js`, `_ds/`) |
| `out_dir` | Destination; default `<design_dir>/ai-export` |

Ask only if the folder is missing.

## Prerequisites

- Node.js 20.19+
- Google Chrome (or Chromium) for PNG capture — on WSL2 the CLI can drive **Windows Chrome** over CDP
- Install [`@singleton-sd/ai-plattform-tools-claude-design-export`](https://gitlab.com/singleton-sd/ai-plattform/tools/claude-design-export/-/packages) (once per machine or project)

### Install from GitLab npm registry (recommended)

The package is **public** — no GitLab token required. Point the `@singleton-sd` scope at the project registry (once per machine or project), in `.npmrc`:

```ini
@singleton-sd:registry=https://gitlab.com/api/v4/projects/singleton-sd%2Fai-plattform%2Ftools%2Fclaude-design-export/packages/npm/
```

Then install:

```bash
npm install @singleton-sd/ai-plattform-tools-claude-design-export@0.2.1
```

**One-off run** (no install; `.npmrc` scope line still required):

```bash
npx @singleton-sd/ai-plattform-tools-claude-design-export@0.2.1 \
  --in "/path/to/design-folder" \
  --out "/path/to/ai-export"
```

After install, the CLI binary is `claude-design-export` (from `node_modules/.bin`).

### Install from source (development)

Standalone checkout:

```bash
git clone git@gitlab.com:singleton-sd/ai-plattform/tools/claude-design-export.git
cd claude-design-export
yarn install
node claude-design-export.mjs --in "$DESIGN_DIR" --out "$OUT_DIR"
```

ai-plattform workspace checkout (repo at `tools/claude-design-export/`):

```bash
cd tools/claude-design-export
yarn install
node claude-design-export.mjs --in "$DESIGN_DIR" --out "$OUT_DIR"
```

## Workflow

```text
Claude Design export:
- [ ] 1. Confirm design_dir
- [ ] 2. Install `@singleton-sd/ai-plattform-tools-claude-design-export@0.2.1` if not present
- [ ] 3. Run the CLI
- [ ] 4. Check manifest.json (every page has md + png)
- [ ] 5. Enrich MD from PNG (visual notes only — never invent copy)
- [ ] 6. Report out_dir
```

### 1–3. Export

Always use the published CLI or source checkout (do not hand-roll Chrome commands):

```bash
claude-design-export \
  --in "$DESIGN_DIR" \
  --out "$OUT_DIR"
```

If the package is not on PATH, use:

```bash
npx @singleton-sd/ai-plattform-tools-claude-design-export@0.2.1 \
  --in "$DESIGN_DIR" \
  --out "$OUT_DIR"
```

`--skip-png` if you only need Markdown. `--skip-md` if you only need screenshots.
On Windows PowerShell, use quoted paths.

### 4. Manifest gate

Open `$OUT_DIR/manifest.json`. Fail the run if any entry is missing `png` (unless
`--skip-png`) or `md` (unless `--skip-md`). Re-run rather than hand-fixing names.

### 5. Enrich Markdown

The CLI writes a **deterministic skeleton** (copy, headings, CTAs, slots, chrome).
Then, for each PNG:

- Add layout / visual hierarchy the HTML does not state
- Keep every heading and sentence that appears on the screen
- Do not invent product claims, prices, or CTAs
- Logo canvases: keep lockup IDs (`3a`, `3b`, …) matching cropped PNGs

Template: [reference.md](reference.md)

### 6. Downstream (optional)

If the user wants GitHub issues or `docs/design-reference/` in an app repo,
copy kebab-case pairs there and link `main` raw PNG + blob MD. Do not put
Design Component runtime files (`support.js`, `_ds/`) in the app repo unless asked.

## Classification (do not override)

The CLI labels each `*.dc.html`:

| Kind | Typical files | PNG |
| --- | --- | --- |
| `page` | Home, FAQ, … (`dc-import` Header/Footer) | Full page, 1440px |
| `chrome` | Header, Footer | Cropped to the chrome node |
| `brand` | Logo / icon canvases | Full canvas + per-lockup crops |

## Browser

Screenshots need a real Chrome. On WSL2 the CLI talks to **Windows Chrome**
over CDP. Details: [reference.md](reference.md).

## Related

- Tool package: [`@singleton-sd/ai-plattform-tools-claude-design-export`](https://gitlab.com/singleton-sd/ai-plattform/tools/claude-design-export/-/packages)
- Tool repo: [`claude-design-export`](https://gitlab.com/singleton-sd/ai-plattform/tools/claude-design-export)
- Agent install notes: [`agents/consume.md`](https://gitlab.com/singleton-sd/ai-plattform/tools/claude-design-export/-/blob/master/agents/consume.md)
