---
name: PDF to Markdown
description: Converts PDFs to AI-ready Markdown using OpenDataLoader PDF (@opendataloader/pdf) with audit-ready naming, metadata, and logs. Use when the user provides a PDF path, asks to parse/extract/convert a PDF to markdown, or mentions opendataloader-pdf for document ingestion.
tags: [documents, pdf, markdown, opendataloader, rag, legal, nodejs]
audience: [all]
status: draft
---

# PDF to Markdown

Convert a PDF into audit-ready Markdown (and companion JSON/metadata) using [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf) via the Node.js package `@opendataloader/pdf`. The source PDF remains authoritative; generated files are derivatives for search and AI analysis only.

## When to use

- User provides a PDF file path and wants Markdown for AI analysis
- User mentions `opendataloader-pdf`, `@opendataloader/pdf`, PDF parsing, or document ingestion for RAG
- Legal, business, or operational PDFs that need traceable naming and logs

## Required inputs

Confirm these before running. Ask if missing.

| Input            | Rule                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `pdf_path`       | Absolute path to the source PDF (required)                                                   |
| `workspace_root` | Folder that contains or will contain a `/documents` tree; default to the PDF's parent directory or a user-specified project folder |
| `mode`           | `local` (default) for standard digital PDFs; `hybrid` for complex tables or scanned pages    |
| `operator`       | Name for logs; default `cursor-agent`                                                        |

Optional: `--document-category` (default `legal`), `--confidentiality` (default `internal-confidential`), `--document-slug` to override auto slug.

## Prerequisites

- Node.js 20.19+
- Java 11+ (JVM) — required by OpenDataLoader PDF
- Install [`@singleton-sd/ai-plattform-tools-pdf-to-markdown`](https://gitlab.com/singleton-sd/ai-plattform/tools/pdf-to-markdown/-/packages/63017519) (once per machine or project)

### Install from GitLab npm registry (recommended)

The package is **public** — no GitLab token required. Point the `@singleton-sd` scope at the project registry (once per machine or project), in `.npmrc`:

```ini
@singleton-sd:registry=https://gitlab.com/api/v4/projects/singleton-sd%2Fai-plattform%2Ftools%2Fpdf-to-markdown/packages/npm/
```

Then install:

```bash
npm install @singleton-sd/ai-plattform-tools-pdf-to-markdown
```

**One-off run** (no install; `.npmrc` scope line still required):

```bash
npx @singleton-sd/ai-plattform-tools-pdf-to-markdown \
  --pdf "C:/path/to/document.pdf" \
  --workspace "C:/path/to/project" \
  --mode local \
  --operator "cursor-agent"
```

After install, the CLI binary is `pdf-to-markdown` (from `node_modules/.bin`).

### Install from source (development)

```bash
git clone git@gitlab.com:singleton-sd/ai-plattform/tools/pdf-to-markdown.git
cd pdf-to-markdown
npm install
```

When working inside the ai-plattform workspace, the tool repo is at `tools/pdf-to-markdown/`.

| Mode     | Notes                                                                 |
| -------- | --------------------------------------------------------------------- |
| `local`  | `@opendataloader/pdf` only; no extra server                           |
| `hybrid` | Also install and start the hybrid backend (see below)                 |

For **hybrid** mode, install the Python hybrid server package and start it in a separate terminal:

```bash
pip install -U "opendataloader-pdf[hybrid]"
opendataloader-pdf-hybrid --port 5002
```

For scanned PDFs, add `--force-ocr` on the server. See [reference.md](reference.md) for OCR and confidentiality rules.

## Workflow

```text
Task progress:
- [ ] Confirm pdf_path and workspace_root
- [ ] Choose mode (local vs hybrid)
- [ ] Install `@singleton-sd/ai-plattform-tools-pdf-to-markdown` if not present (see Prerequisites)
- [ ] Run convert_pdf.mjs
- [ ] Verify outputs exist (no overwrites)
- [ ] Report paths and review warnings to user
```

### Step 1 — Resolve paths

- Resolve `pdf_path` to an absolute path; fail clearly if the file does not exist.
- Set `workspace_root` to the project folder that owns the `/documents` tree.

### Step 2 — Run the conversion script

Always use the published CLI or bundled script (do not hand-roll commands unless the tool fails):

```bash
pdf-to-markdown \
  --pdf "C:/path/to/document.pdf" \
  --workspace "C:/path/to/project" \
  --mode local \
  --operator "cursor-agent"
```

If the package is not on PATH, use `npx pdf-to-markdown` or `npx @singleton-sd/ai-plattform-tools-pdf-to-markdown`.

When developing from source inside ai-plattform:

```bash
node tools/pdf-to-markdown/convert_pdf.mjs \
  --pdf "C:/path/to/document.pdf" \
  --workspace "C:/path/to/project" \
  --mode local \
  --operator "cursor-agent"
```

On Windows PowerShell, use quoted paths. The script:

1. Creates `/documents` subfolders (`source`, `parsed/opendataloader-pdf`, `qa`, `logs`, etc.)
2. Copies the PDF to `/documents/source/{slug}__{hash}.pdf` (immutable; never overwrites an existing copy)
3. Calls `@opendataloader/pdf` `convert()` and writes versioned outputs under `/documents/parsed/opendataloader-pdf/`
4. Writes metadata, extraction report, and processing log
5. Prints a JSON summary to stdout

Parse the JSON summary for `markdown_path` and related paths.

### Step 3 — Verify

- Confirm `markdown_path` exists and is non-empty
- Confirm filenames include `document_slug` and `source_hash`
- Confirm `review_status` is `not-reviewed`
- Do not edit files under `/parsed/opendataloader-pdf/` manually

### Step 4 — Report to user

Use this completion template:

```text
PDF converted to Markdown

Markdown: {markdown_path}
JSON: {json_path}
Source PDF (archived): {source_pdf}
Hash: {source_hash}
Version: {version}
Review status: not-reviewed

Legal reliance: The source PDF is authoritative. Do not rely on the Markdown for legal, financial, tax, employment, property, or compliance decisions without checking the source PDF.

Optional next steps (not run automatically):
- /normalized/ — cleaned Markdown for RAG
- /chunks/ — clause-aware JSONL chunks
- /reviewed/ — human-verified Markdown
```

## Mode selection

| PDF type                 | `--mode` | Notes                                              |
| ------------------------ | -------- | -------------------------------------------------- |
| Standard digital PDF     | `local`  | Fast; no server                                    |
| Complex or nested tables | `hybrid` | Requires `opendataloader-pdf-hybrid` server        |
| Scanned / image PDF      | `hybrid` | Server with `--force-ocr`                          |
| Non-English scan         | `hybrid` | Server with `--ocr-lang`                           |

Filename mode segment: `odlpdf-local` or `odlpdf-hybrid` (see [reference.md](reference.md)).

## Minimum output set

After a successful run:

```txt
/documents/source/{slug}__{hash}.pdf
/documents/parsed/opendataloader-pdf/{slug}__{hash}__odlpdf-{mode}__full__v{NNN}.md
/documents/parsed/opendataloader-pdf/{slug}__{hash}__odlpdf-{mode}__full__v{NNN}.json
/documents/qa/{slug}__{hash}__extraction-report__v{NNN}.json
/documents/logs/{slug}__{hash}__processing-log__v{NNN}.json
/documents/{slug}__{hash}__metadata__v{NNN}.json
```

Re-runs with the same source and mode increment the version (`v002`, `v003`, …). Files are never silently overwritten.

## Troubleshooting

| Problem                               | Action                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Package not found / 404 on install    | Add the `@singleton-sd` scope registry line to `.npmrc` (see Prerequisites) |
| `@opendataloader/pdf is not installed` | Reinstall: `npm install @singleton-sd/ai-plattform-tools-pdf-to-markdown` |
| Hybrid connection errors              | Start `opendataloader-pdf-hybrid --port 5002`                          |
| JVM / Java errors                     | Install Java 11+ and ensure `java` is on PATH                          |
| Poor extraction on scans              | Re-run with `--mode hybrid` and OCR enabled on the server              |
| Target already exists                 | Script exits safely; use a new version or different mode                 |

## Additional resources

- Tool package: [`@singleton-sd/ai-plattform-tools-pdf-to-markdown`](https://gitlab.com/singleton-sd/ai-plattform/tools/pdf-to-markdown/-/packages/63017519)
- Full legal/business naming, confidentiality, review, and chunking rules: [reference.md](reference.md)
- Node.js quick start: [opendataloader.org/docs/quick-start-nodejs](https://opendataloader.org/docs/quick-start-nodejs)
- Upstream tool docs: [opendataloader-pdf on GitHub](https://github.com/opendataloader-project/opendataloader-pdf)
