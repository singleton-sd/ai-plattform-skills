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

Do not screenshot by improvising a one-off Chrome command. Run the skill CLI.

## Inputs

| Input | Rule |
| --- | --- |
| `design_dir` | Folder that contains `*.dc.html` (and usually `support.js`, `_ds/`) |
| `out_dir` | Destination; default `<design_dir>/ai-export` |

Ask only if the folder is missing.

## Workflow

```
Claude Design export:
- [ ] 1. Confirm design_dir
- [ ] 2. npm install in this skill's scripts/
- [ ] 3. Run the CLI
- [ ] 4. Check manifest.json (every page has md + png)
- [ ] 5. Enrich MD from PNG (visual notes only — never invent copy)
- [ ] 6. Report out_dir
```

### 1–3. Export

From the skill directory:

```bash
cd design/claude-design-export/scripts
npm install
node claude-design-export.mjs --in "$DESIGN_DIR" --out "$OUT_DIR"
```

`--skip-png` if you only need Markdown. `--skip-md` if you only need screenshots.

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
