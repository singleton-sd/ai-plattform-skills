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

Slugs come from the **relative path** under `--in` (nested `a/Home.dc.html` →
`a-home`). Duplicate slugs fail the run.

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
- Blocks emitted in **document order** (H2 → copy → CTAs → image slots)
- Preserve CTAs as `Label → href`
- List `image-slot` id + placeholder
- Brand canvases: lockups (`.dv-opt[id]` matching `\d+[a-z]`) plus paragraphs/links/slots

Agent enrichment may add **Visual** bullets (grid, type size, color) under a
section. Never replace extracted copy.

## Classification heuristics

- `brand` — filename matches `/logo|icon|lockup|monogram/i` **or**
  `meta name="design_doc_mode" content="canvas"`
- `chrome` — basename is Header/Footer, **or** a standalone header-only /
  footer-only document (no `dc-import`, no `h1`/`h2`/`section`)
- `page` — everything else (usually `dc-import name="Header"`)

## Screenshot rules

1. Serve `design_dir` over HTTP on **127.0.0.1** (not `file://`, not `0.0.0.0`)
   so `dc-import` sibling fetch works without exposing the folder on the LAN.
2. Reject path traversal with `path.relative` (no `..`, stay under root).
3. Wait for `#dc-root` plus kind-specific selectors; **fail** on timeout.
4. Override DC `html,body{height:100%}` to `height:auto` before `fullPage`.
5. Wait for `document.fonts.ready` and in-document `<img>` decode.
6. Chrome: `CHROME_PATH`, else Linux Chrome, else WSL
   `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`.
7. Windows Chrome user-data-dir must be a **Windows** temp path (`%TEMP%`),
   not `/tmp`. Clean up the profile on CDP connect failure.
8. WSL mirrored networking: Chrome can use `http://127.0.0.1:<port>`.
9. Missing lockup DOM nodes fail the export (do not silently skip).
10. Null `boundingBox()` falls back to full-page capture for that screen.

## What not to export

Skip `support.js`, `image-slot.js`, `_ds/`, `node_modules/`. Those are runtime,
not screens.
