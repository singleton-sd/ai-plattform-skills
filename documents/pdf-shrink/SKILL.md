---
name: PDF Shrink
description: Shrink PDF files locally from a single file or folder using npm-only Node.js tooling. Use when the user wants to compress or reduce PDF file size with quality-first presets (minimal or optimal), batch-process a directory, or replace originals in place when the result is smaller. Do not use for text extraction (pdf-context), Markdown conversion (pdf-to-markdown), or image resizing (future image-ops).
tags: [documents, pdf, compression, optimize, workflow]
audience: [all]
status: draft
---

# PDF Shrink

Shrink PDFs locally with quality-first presets. Files never leave the machine — no iLovePDF, no vert.sh, no Ghostscript OS installs.

## When to use

- User wants to **reduce PDF file size** (single file or folder)
- User mentions compress, shrink, optimize, or make PDFs smaller
- Scanned statements, photo-heavy PDFs, or large attachments before archive/email
- Pipeline or batch folder processing on Windows or macOS

## When NOT to use

| Need | Use instead |
| ---- | ----------- |
| Rename/classify from PDF text | [`documents/pdf-content-renamer`](../pdf-content-renamer/SKILL.md) |
| Extract text for AI / RAG | [`documents/pdf-to-markdown`](../pdf-to-markdown/SKILL.md) |
| Resize or compress standalone images | future `image-ops` tool (phase 2) |

## Prerequisites

- Node.js 20.19+
- Install [`@singleton-sd/ai-plattform-tools-pdf-shrink`](https://gitlab.com/singleton-sd/ai-plattform/tools/pdf-shrink/-/packages) (once per machine or project)

### Install from GitLab npm registry (recommended)

The package is **public** — no GitLab token required. Point the `@singleton-sd` scope at the project registry (once per machine or project), in `.npmrc`:

```ini
@singleton-sd:registry=https://gitlab.com/api/v4/projects/singleton-sd%2Fai-plattform%2Ftools%2Fpdf-shrink/packages/npm/
```

Then install:

```bash
npm install @singleton-sd/ai-plattform-tools-pdf-shrink
```

**One-off run** (no install; `.npmrc` scope line still required):

```bash
npx @singleton-sd/ai-plattform-tools-pdf-shrink "C:/path/to/document.pdf"
```

After install, the CLI binary is `pdf-shrink` (from `node_modules/.bin`).

### Install from source (development)

```bash
git clone git@gitlab.com:singleton-sd/ai-plattform/tools/pdf-shrink.git
cd pdf-shrink
yarn install
```

When working inside the ai-plattform workspace, the tool repo is at `tools/pdf-shrink/`.

## Presets

| Preset | When to use | Behaviour |
| ------ | ----------- | --------- |
| `minimal` | Contracts, text PDFs, near-lossless | Lossless structural optimization only |
| `optimal` *(default)* | Scanned docs, photo-heavy PDFs | Balanced image recompression when it saves space |

If savings are under 2% or output would be larger, skip and report **already optimal**.

## Workflow

```text
Task progress:
- [ ] Confirm input path (file or folder)
- [ ] Choose preset (minimal or optimal)
- [ ] Decide output mode (sibling .shrunk.pdf, --output-dir, or --in-place)
- [ ] Run pdf-shrink doctor if first use on this machine
- [ ] Run pdf-shrink on input
- [ ] Report per-file before/after sizes and any skips
```

## Commands

```bash
# Check Node + qpdf-compress
pdf-shrink doctor

# Single file — balanced (default)
pdf-shrink "C:/Downloads/large-statement.pdf"

# Near-lossless
pdf-shrink contract.pdf --preset minimal

# Whole folder to separate output directory
pdf-shrink "./scans/" --preset optimal --output-dir "./compressed/"

# Replace original only when smaller
pdf-shrink report.pdf --in-place --preset optimal

# Pipeline-friendly JSON summary
pdf-shrink "./uploads/" --preset optimal --json
```

## Options

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `<path>` | required | PDF file or folder |
| `--preset` | `optimal` | `minimal` or `optimal` |
| `--output-dir` | sibling output | Write `.shrunk.pdf` files here |
| `--in-place` | off | Replace original when smaller |
| `--force` | off | Overwrite existing outputs |
| `--no-recurse` | off | Top-level folder only |
| `--dry-run` | off | Plan without writing |
| `--json` | off | JSON summary on stdout |

## Output conventions

- Default output name: `{original}.shrunk.pdf` beside the source
- `--in-place`: overwrite original only when strictly smaller
- Never overwrite without `--force` or `--in-place`
- Exit codes: `0` success, `1` usage, `2` missing dependency, `3` processing error

## Engine

Uses [`qpdf-compress`](https://www.npmjs.com/package/qpdf-compress) (Apache-2.0) — QPDF + mozjpeg embedded via npm prebuilds. No Ghostscript or qpdf OS installs.

