---
name: PDF Content Renamer
description: Rename PDF files from their contents using safe, date-prefixed filenames and Node.js-based PDF tooling. Use when the user provides one or more PDFs and wants filenames inferred from document text, such as bank statements, driver licences, medical documents, receipts, notices, contracts, or other personal/business records. For small PDFs (typically 1–3 pages), use `pdf-context` first; for large or scanned PDFs, route through `documents/pdf-to-markdown`.
tags: [documents, pdf, filenames, records, workflow]
audience: [all]
status: draft
---

# PDF Content Renamer

Rename PDFs based on evidence found inside the document. Prefer accurate, boring filenames over clever summaries, and preserve enough traceability to explain how each name was chosen.

## Naming Standard

Use this format unless the user specifies another convention:

```text
YY-MM-DD-document-type-issuer-subject-detail.pdf
```

Rules:

- Start every filename with `YY-MM-DD`.
- Use the most relevant date found in the document. If no reliable date is found, use today's date in the user's timezone.
- Use lowercase kebab-case after the date.
- Keep names concise: document type, issuer/provider, subject/account tail, and period or short distinguishing detail.
- Remove unsafe filesystem characters: `< > : " / \ | ? *`, control characters, repeated spaces, and trailing dots.
- Do not overwrite existing files. Add `-v2`, `-v3`, etc. only when needed.
- Preserve the original `.pdf` extension.

Examples:

```text
26-06-30-bank-statement-commbank-everyday-1234.pdf
25-11-14-driver-licence-nsw-jane-smith.pdf
26-02-03-medical-report-sydney-clinic-blood-test.pdf
26-07-03-unknown-document-unclassified.pdf
```

## Date Selection

Pick the date that best identifies the document, not necessarily the first date encountered.

| Document type | Preferred date |
| ------------- | -------------- |
| Bank or credit card statement | Statement period end date, then issue date |
| Driver licence or identity document | Issue date, then expiry date |
| Medical report, invoice, referral, result | Service/visit/specimen/report date, then issue date |
| Insurance, tax, legal, government notice | Notice/issue/effective date |
| Receipt or invoice | Transaction/invoice date |
| Contract or agreement | Signed/effective date |
| Unknown document | Most prominent document date, then today's date |

Convert all dates to `YY-MM-DD`. If the document only gives a month or period, use the period end when clear; otherwise use the first day of the month and mention the uncertainty.

## Workflow

1. Resolve inputs.
   - Accept a single PDF, a folder, or a batch list.
   - Work from absolute paths.
   - For bulk renames, create a manifest with original path, proposed path, inferred date, date evidence, document type, confidence, and notes.

2. Extract enough content.
   - Prefer Node.js tools for all extraction, parsing, manifest generation, and renaming commands.
   - **Default for small PDFs (≤3 pages):** run `pdf-context` first (see below). Parse the JSON stdout for `page_count`, `metadata`, `pages`, `combined_text`, and `likely_scanned`.
   - If `page_count` ≤ 3 and `likely_scanned` is `false`, use that JSON as the evidence source for classification, date selection, and filename proposals.
   - If `page_count` > 3, use the `documents/pdf-to-markdown` skill and its Node.js CLI (`pdf-to-markdown`, `npx @singleton-sd/ai-plattform-tools-pdf-to-markdown`, or `node tools/pdf-to-markdown/convert_pdf.mjs`) instead of loading the whole PDF into context.
   - If `likely_scanned` is `true`, route through the OCR-capable mode documented in `documents/pdf-to-markdown`; do not create ad hoc Python extraction scripts for this renaming skill.
   - Stop once there is enough evidence for a high-confidence name.

### pdf-context CLI (small PDFs)

Install [`@singleton-sd/ai-plattform-tools-pdf-context`](https://gitlab.com/singleton-sd/ai-plattform/tools/pdf-context) or run from source at `tools/pdf-context/`.

Registry scope in `.npmrc` (once per machine or project):

```ini
@singleton-sd:registry=https://gitlab.com/api/v4/projects/singleton-sd%2Fai-plattform%2Ftools%2Fpdf-context/packages/npm/
```

```bash
pdf-context \
  --pdf "C:/path/to/document.pdf" \
  --max-pages 3
```

One-off: `npx @singleton-sd/ai-plattform-tools-pdf-context --pdf "..." --max-pages 3`

From source inside ai-plattform:

```bash
node tools/pdf-context/extract_context.mjs \
  --pdf "C:/path/to/document.pdf" \
  --max-pages 3
```

Use `metadata.creation_date` / `metadata.mod_date` (already `YY-MM-DD`) as date hints, then apply the date selection table above using text evidence from `pages` or `combined_text`.

3. Classify the document.
   - Identify the document type from headings, labels, issuer, and repeated terms.
   - Prefer specific types such as `bank-statement`, `driver-licence`, `medical-report`, `pathology-result`, `invoice`, `receipt`, `insurance-notice`, or `tax-notice`.
   - Use `unknown-document` when evidence is weak.

4. Build the proposed filename.
   - Apply the date rules first.
   - Add issuer/provider when visible.
   - Add a safe identifier only when useful, such as account last four digits, licence state, patient name, claim number, or document reference.
   - Avoid full account numbers, full licence numbers, Medicare numbers, tax file numbers, or other high-risk identifiers.

5. Verify and rename.
   - Present proposed names before renaming unless the user explicitly asked for immediate renaming.
   - Use filesystem-safe move/rename commands and avoid overwrites.
   - After renaming, report the old path, new path, and any low-confidence decisions.

## Confidence Rules

Use high confidence only when the document type and date are both directly supported by text or reliable metadata. Use medium confidence when the type is clear but the best date needed judgment. Use low confidence when the file is scanned poorly, mostly blank, encrypted, or has conflicting document labels.

For low-confidence items:

- Keep `unknown-document` or `unclassified` in the filename.
- Use today's date only when no document date is reliable.
- Do not invent issuers, dates, names, or categories.
- Include a short note explaining what could not be verified.

## Reporting Template

```text
PDF rename proposals

1. {original_filename}
   Proposed: {YY-MM-DD-name.pdf}
   Basis: {document type}, {date source}, {issuer/provider}
   Confidence: {high|medium|low}
   Notes: {only if needed}

Renamed files:
- {old_path} -> {new_path}
```
