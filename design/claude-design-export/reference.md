# Claude Design export — reference

## CLI

```bash
node claude-design-export.mjs --in DIR --out DIR [--width 1440] [--skip-png] [--skip-md]
```

Writes:

```
out/
  INDEX.md
  manifest.json
  home.md
  home.png
  header.md
  header.png
  inkads-logo.md
  inkads-logo.png
  inkads-logo/3a.png   # lockup crops when .dv-opt[id] exists
```

Slugs are kebab-case of the `.dc.html` basename (`How-It-Works.dc.html` → `how-it-works`).

## Markdown skeleton (CLI)

YAML frontmatter plus reading-order body:

```yaml
---
page: Home
kind: page          # page | chrome | brand
source: Home.dc.html
slug: home
chrome: [Header, Footer]
image_slots:
  - { id: hero-display, placeholder: "..." }
---
```

Body rules:

- `#` = page title (H1 or filename)
- `##` = each H2 / major block
- Preserve CTAs as `Label → href`
- List `image-slot` id + placeholder
- Brand canvases: one subsection per lockup id + label + note

Agent enrichment may add **Visual** bullets (grid, type size, color) under a
section. Never replace extracted copy.

## Screenshot rules

1. Serve `design_dir` over HTTP (not `file://`) so `dc-import` sibling fetch works.
2. Wait for React boot (`header` / `footer` / `.dv-turn` as applicable).
3. Override DC `html,body{height:100%}` to `height:auto` before `fullPage`.
4. Wait for `document.fonts.ready` and in-document `<img>` decode.
5. Chrome: `CHROME_PATH`, else Linux Chrome, else WSL
   `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`.
6. Windows Chrome user-data-dir must be a **Windows** temp path (`%TEMP%`),
   not `/tmp`.
7. WSL mirrored networking: Chrome can use `http://127.0.0.1:<port>`.

## Classification heuristics

- `brand` — filename matches `/logo|icon|lockup|monogram/i` **or**
  `meta name="design_doc_mode" content="canvas"`
- `chrome` — basename is Header/Footer **or** a single `<header>`/`<footer>`
  without `dc-import` of other screens
- `page` — everything else (usually `dc-import name="Header"`)

## What not to export

Skip `support.js`, `image-slot.js`, `_ds/`, `node_modules/`. Those are runtime,
not screens.
