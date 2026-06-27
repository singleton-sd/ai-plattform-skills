# OpenDataLoader PDF Instructions for Legal and Business Documents

## Purpose

Use these instructions when processing legal, corporate, financial, tenancy, tax, insurance, HR, compliance, contracts, trust, company, or operational business documents with OpenDataLoader PDF.

The goal is not only to extract text. The goal is to create a controlled, traceable, employee-safe document ingestion workflow that can be audited later.

OpenDataLoader PDF is suitable for this workflow because it can generate structured outputs such as Markdown, JSON, HTML, and text, and its JSON output can preserve page references and bounding boxes that help map extracted content back to the original PDF.

## Core Principle

For legal and business documents, the source PDF is the authority.

Generated Markdown, JSON, HTML, text, summaries, chunks, or embeddings are derived artifacts only. They must never replace the original PDF.

Do not treat extracted text as legally authoritative unless it has been reviewed against the source PDF.

## Recommended Approach

This naming and folder convention is the right approach for legal and business documents, provided it is made stricter than a normal RAG or AI pipeline.

The workflow must prioritise:

1. source immutability;
2. deterministic naming;
3. source hash traceability;
4. strict separation between raw extraction, normalized output, reviewed output, and AI-ready chunks;
5. human review for important legal or financial documents;
6. access control and confidentiality;
7. audit logs for employees;
8. no silent overwriting of generated files.

## Folder Structure

Use this folder structure for each document collection or client/project workspace.

```txt
/documents
  /source
  /parsed
    /opendataloader-pdf
  /normalized
  /reviewed
  /chunks
  /qa
  /logs
  /archive
```

### Folder Rules

`/source`

Store the original PDF only. Do not edit files in this folder.

`/parsed/opendataloader-pdf`

Store raw outputs generated directly by OpenDataLoader PDF. These files are immutable and should not be manually edited.

`/normalized`

Store cleaned outputs prepared for internal use, search, or RAG. These may include corrected headings, removed repeated headers/footers, fixed spacing, and normalized tables.

`/reviewed`

Store human-reviewed versions. Use this only when someone has checked the generated output against the original PDF.

`/chunks`

Store chunked JSONL files used for embeddings, semantic search, or RAG.

`/qa`

Store extraction reports, page-level review notes, confidence checks, and warnings.

`/logs`

Store processing logs, command metadata, employee/operator details, and version notes.

`/archive`

Store deprecated outputs that are no longer current but must be retained for audit reasons.

## Required Naming Pattern

Use this pattern for generated files:

```txt
{document_slug}__{source_hash}__{stage-or-tool}__{scope}__v{version}.{ext}
```

For raw OpenDataLoader PDF outputs:

```txt
{document_slug}__{source_hash}__odlpdf-{mode}__{scope}__v{version}.{ext}
```

Examples:

```txt
singleton-trust-deed__sha256-a91f3c2d8__odlpdf-local__full__v001.md
singleton-trust-deed__sha256-a91f3c2d8__odlpdf-local__full__v001.json
singleton-trust-deed__sha256-a91f3c2d8__normalized__full__v001.md
singleton-trust-deed__sha256-a91f3c2d8__reviewed__full__v001.md
singleton-trust-deed__sha256-a91f3c2d8__chunks-semantic__v001.jsonl
singleton-trust-deed__sha256-a91f3c2d8__extraction-report__v001.json
```

## Naming Field Rules

### `document_slug`

Use a lowercase, filesystem-safe slug based on the original document name, matter name, or official document title.

Rules:

```txt
- lowercase only
- replace spaces with hyphens
- remove punctuation except hyphens
- collapse repeated hyphens
- max 80 characters
- do not include confidential personal data unless needed for business identification
```

Good:

```txt
singleton-trust-deed
employment-contract-template
wollert-building-defects-report
2026-q2-bas-statement
```

Avoid:

```txt
output
final
new-document
patricio-tax-secret-file
scan-1
```

### `source_hash`

Use a content hash of the original source PDF.

Preferred format:

```txt
sha256-{first_8_or_12_chars}
```

Example:

```txt
sha256-a91f3c2d8
```

The hash must be calculated from the original source PDF, not from generated outputs.

This prevents confusion when two PDFs have the same name but different contents.

### `stage-or-tool`

Use one of these values.

For raw OpenDataLoader PDF output:

```txt
odlpdf-local
odlpdf-hybrid
odlpdf-ocr
odlpdf-tagged
odlpdf-manual-review
```

For downstream outputs:

```txt
normalized
reviewed
chunks-semantic
chunks-page
chunks-heading
chunks-hybrid
chunks-table-aware
extraction-report
processing-log
redacted
```

### `scope`

Use `full` for the whole document.

For page-specific outputs, use zero-padded page ranges.

```txt
full
page-007
pages-001-010
```

Do not use informal page labels like:

```txt
p7
pg7
pages-1-10
```

### `version`

Use a monotonically increasing version number.

```txt
v001
v002
v003
```

Increment the version when any of the following changes:

```txt
- source PDF changes
- OpenDataLoader PDF version changes
- extraction mode changes
- OCR or hybrid setting changes
- normalization logic changes
- manual correction changes
- chunking strategy changes
- metadata schema changes
```

### `ext`

Use the real file extension.

```txt
.pdf
.md
.json
.html
.txt
.jsonl
.log
```

## Source File Naming

The source PDF should also be renamed into a controlled name before processing.

Pattern:

```txt
{document_slug}__{source_hash}.pdf
```

Example:

```txt
singleton-trust-deed__sha256-a91f3c2d8.pdf
```

If the original file name must be preserved, store it in metadata instead of relying on the filename.

## Metadata File

For each processed document, create a metadata file.

Pattern:

```txt
{document_slug}__{source_hash}__metadata__v001.json
```

Example:

```json
{
  "document_slug": "singleton-trust-deed",
  "original_filename": "21-06-17 Singleton Trust Deed Certified Compressed.pdf",
  "source_file": "singleton-trust-deed__sha256-a91f3c2d8.pdf",
  "source_hash": "sha256-a91f3c2d8",
  "document_category": "legal",
  "confidentiality": "internal-confidential",
  "owner": "Singleton Software Pty Ltd",
  "processed_by": "employee_or_system_name",
  "processed_at": "2026-06-27T00:00:00+10:00",
  "tool": "opendataloader-pdf",
  "tool_version": "record-installed-version-here",
  "mode": "local",
  "pages": 42,
  "review_status": "not-reviewed",
  "legal_reliance": "source-pdf-only"
}
```

## Confidentiality Labels

Every metadata file and QA report must include one of the following confidentiality labels.

```txt
public
internal
internal-confidential
restricted
legal-privileged
personal-information
financial-confidential
```

Use conservative defaults.

For legal, tax, contracts, employment, trust, company, insurance, property settlement, or identity documents, default to:

```txt
internal-confidential
```

For lawyer-client communications or documents prepared for legal advice, use:

```txt
legal-privileged
```

For documents containing passports, licences, TFNs, DOBs, bank details, payslips, medical information, signatures, or tenant identity data, use:

```txt
personal-information
```

## Required Output Set

For legal and business documents, generate these files at minimum:

```txt
/source/{document_slug}__{source_hash}.pdf
/parsed/opendataloader-pdf/{document_slug}__{source_hash}__odlpdf-local__full__v001.md
/parsed/opendataloader-pdf/{document_slug}__{source_hash}__odlpdf-local__full__v001.json
/qa/{document_slug}__{source_hash}__extraction-report__v001.json
/logs/{document_slug}__{source_hash}__processing-log__v001.json
```

For RAG or search use, also generate:

```txt
/normalized/{document_slug}__{source_hash}__normalized__full__v001.md
/chunks/{document_slug}__{source_hash}__chunks-semantic__v001.jsonl
```

For documents that employees will rely on, also generate:

```txt
/reviewed/{document_slug}__{source_hash}__reviewed__full__v001.md
/qa/{document_slug}__{source_hash}__human-review-report__v001.json
```

## Processing Log

Every run must produce a processing log.

Pattern:

```txt
{document_slug}__{source_hash}__processing-log__v{version}.json
```

Suggested fields:

```json
{
  "source_file": "singleton-trust-deed__sha256-a91f3c2d8.pdf",
  "source_hash": "sha256-a91f3c2d8",
  "run_id": "20260627-143000-a91f3c2d8",
  "tool": "opendataloader-pdf",
  "tool_version": "record-installed-version-here",
  "mode": "local",
  "command": "record-command-or-script-name-here",
  "operator": "employee_or_system_name",
  "processed_at": "2026-06-27T14:30:00+10:00",
  "input_pages": 42,
  "output_files": [
    "singleton-trust-deed__sha256-a91f3c2d8__odlpdf-local__full__v001.md",
    "singleton-trust-deed__sha256-a91f3c2d8__odlpdf-local__full__v001.json"
  ],
  "warnings": [],
  "errors": [],
  "review_required": true
}
```

## Extraction Report

Every document must have an extraction report.

Pattern:

```txt
{document_slug}__{source_hash}__extraction-report__v{version}.json
```

Suggested fields:

```json
{
  "source_file": "singleton-trust-deed__sha256-a91f3c2d8.pdf",
  "source_hash": "sha256-a91f3c2d8",
  "document_category": "legal",
  "mode": "local",
  "pages_processed": 42,
  "outputs": ["markdown", "json"],
  "detected_tables": 12,
  "detected_images": 3,
  "detected_signatures": "unknown",
  "detected_scanned_pages": 0,
  "warnings": [],
  "manual_review_required": true,
  "reason_for_review": [
    "legal document",
    "contains obligations or rights"
  ],
  "legal_reliance": "source-pdf-only"
}
```

## Human Review Rules

Human review is required before employees rely on extracted content for decisions involving:

```txt
- legal obligations
- contracts
- trust deeds
- company constitutions
- tax documents
- ASIC documents
- insurance policies or claims
- employment documents
- tenancy agreements
- property settlement documents
- financial statements
- personal information
- signed documents
```

Human review should verify:

```txt
- parties and names
- dates
- amounts
- addresses
- clauses and numbering
- tables
- signatures
- annexures and schedules
- missing pages
- page order
- OCR accuracy on scanned pages
- whether generated headings match the source PDF
```

## Review Status Values

Use one of these values in metadata and QA reports:

```txt
not-reviewed
machine-checked
human-reviewed
human-reviewed-with-corrections
approved-for-internal-search
approved-for-rag
do-not-use
```

Default status after extraction:

```txt
not-reviewed
```

Do not mark a document as `approved-for-rag` unless a human has checked a representative sample and all critical sections.

## Legal Reliance Statement

Every normalized, reviewed, or chunked output for legal/business documents should include or link to this statement:

```txt
This file is a generated derivative of the source PDF. It is provided for search, review, summarisation, and internal workflow purposes only. The source PDF remains the authoritative document. Do not rely on this generated file for legal, financial, tax, employment, property, or compliance decisions without checking the source PDF.
```

## Chunk Naming

Use this pattern for RAG chunks:

```txt
{document_slug}__{source_hash}__chunks-{strategy}__v{version}.jsonl
```

Allowed strategies:

```txt
semantic
page
heading
hybrid
table-aware
clause-aware
```

For legal documents, prefer:

```txt
chunks-clause-aware
```

or:

```txt
chunks-heading
```

Avoid chunking that splits clauses, definitions, schedules, tables, or signatures from their context.

## Chunk Metadata Requirements

Every chunk must include enough metadata to trace back to the source.

Minimum fields:

```json
{
  "chunk_id": "singleton-trust-deed__sha256-a91f3c2d8__chunk-00042",
  "source_file": "singleton-trust-deed__sha256-a91f3c2d8.pdf",
  "source_hash": "sha256-a91f3c2d8",
  "document_slug": "singleton-trust-deed",
  "document_category": "legal",
  "confidentiality": "internal-confidential",
  "page_start": 7,
  "page_end": 8,
  "section_heading": "Appointment and Removal of Trustee",
  "clause_reference": "Clause 12.2",
  "bbox_refs": [],
  "review_status": "not-reviewed",
  "text": "..."
}
```

If bounding boxes are available from JSON output, preserve them in `bbox_refs`.

## Page-Level Artifact Naming

When exporting, reviewing, or debugging individual pages, use:

```txt
{document_slug}__{source_hash}__odlpdf-{mode}__page-{page_number}__v{version}.{ext}
```

Example:

```txt
contract-of-sale__sha256-38ab91e2__odlpdf-local__page-014__v001.json
contract-of-sale__sha256-38ab91e2__odlpdf-local__page-014__v001.md
```

## Scanned Documents and OCR

For scanned PDFs, image-only PDFs, bad scans, handwriting, stamps, signatures, or low-confidence extraction, do not rely only on automatic extraction.

Use one of these modes or statuses:

```txt
odlpdf-ocr
odlpdf-hybrid
manual-review
```

Set:

```txt
manual_review_required: true
```

For scanned legal documents, perform page-by-page review of critical sections.

## Employee Usage Rules

Employees may use generated Markdown, JSON, summaries, and chunks for:

```txt
- search
- navigation
- internal summarisation
- clause discovery
- first-pass document review
- workflow automation
- draft preparation
```

Employees must check the source PDF before:

```txt
- giving advice
- sending client-facing information
- making legal, tax, financial, HR, tenancy, or compliance decisions
- quoting exact obligations
- relying on dates, amounts, signatures, addresses, or party names
```

## Access Control

Generated outputs inherit the confidentiality level of the source PDF.

Do not make extracted text less restricted than the original PDF.

If the original PDF is restricted, then Markdown, JSON, chunks, embeddings, summaries, QA reports, and logs are also restricted.

## Data Minimisation

Do not include unnecessary personal data in filenames.

Bad:

```txt
john-smith-passport-1985-04-12__sha256-abcd1234__odlpdf-local__full__v001.md
```

Better:

```txt
identity-document-client-001__sha256-abcd1234__odlpdf-local__full__v001.md
```

Store sensitive details inside access-controlled metadata only when necessary.

## Redactions

If a redacted copy is needed, create a separate source file and hash it independently.

Pattern:

```txt
{document_slug}__redacted__{source_hash}.pdf
```

Example:

```txt
tenancy-application__redacted__sha256-b82aa190.pdf
```

Do not pretend that redacted and unredacted files are the same source.

## Versioning Rules

Create a new version when anything meaningful changes.

Do not overwrite files.

Bad:

```txt
output.md
parsed.json
final-final.md
```

Good:

```txt
contract-of-sale__sha256-38ab91e2__odlpdf-local__full__v001.md
contract-of-sale__sha256-38ab91e2__odlpdf-local__full__v002.md
contract-of-sale__sha256-38ab91e2__reviewed__full__v001.md
```

## When to Reprocess

Reprocess the document when:

```txt
- the source PDF changes
- a better scan is received
- OpenDataLoader PDF is upgraded
- extraction settings change
- hybrid/OCR mode is enabled after local mode
- errors are found in extracted content
- chunking strategy changes
- legal/business workflow requirements change
```

## Naming Examples

### Trust Deed

```txt
/source/singleton-trust-deed__sha256-a91f3c2d8.pdf
/parsed/opendataloader-pdf/singleton-trust-deed__sha256-a91f3c2d8__odlpdf-local__full__v001.md
/parsed/opendataloader-pdf/singleton-trust-deed__sha256-a91f3c2d8__odlpdf-local__full__v001.json
/normalized/singleton-trust-deed__sha256-a91f3c2d8__normalized__full__v001.md
/reviewed/singleton-trust-deed__sha256-a91f3c2d8__reviewed__full__v001.md
/chunks/singleton-trust-deed__sha256-a91f3c2d8__chunks-clause-aware__v001.jsonl
/qa/singleton-trust-deed__sha256-a91f3c2d8__extraction-report__v001.json
/logs/singleton-trust-deed__sha256-a91f3c2d8__processing-log__v001.json
```

### Employment Contract

```txt
/source/employment-contract-template__sha256-c11092ab.pdf
/parsed/opendataloader-pdf/employment-contract-template__sha256-c11092ab__odlpdf-local__full__v001.md
/parsed/opendataloader-pdf/employment-contract-template__sha256-c11092ab__odlpdf-local__full__v001.json
/chunks/employment-contract-template__sha256-c11092ab__chunks-clause-aware__v001.jsonl
/qa/employment-contract-template__sha256-c11092ab__extraction-report__v001.json
```

### Property Defects Report

```txt
/source/wollert-building-defects-report__sha256-f831cc90.pdf
/parsed/opendataloader-pdf/wollert-building-defects-report__sha256-f831cc90__odlpdf-hybrid__full__v001.md
/parsed/opendataloader-pdf/wollert-building-defects-report__sha256-f831cc90__odlpdf-hybrid__full__v001.json
/normalized/wollert-building-defects-report__sha256-f831cc90__normalized__full__v001.md
/chunks/wollert-building-defects-report__sha256-f831cc90__chunks-page__v001.jsonl
/qa/wollert-building-defects-report__sha256-f831cc90__extraction-report__v001.json
```

## Final Checklist

Before making generated files available to employees, confirm:

```txt
- source PDF is stored in /source
- source hash is included in every generated filename
- raw parser outputs are stored in /parsed/opendataloader-pdf
- raw outputs were not manually edited
- normalized outputs are stored separately
- reviewed outputs are stored separately
- extraction report exists
- processing log exists
- confidentiality label is set
- review status is set
- employees know the source PDF is authoritative
- sensitive personal data is not exposed unnecessarily in filenames
- chunks include source hash, page references, and review status
- legal/business documents are not marked approved until reviewed
```

## Simple Rule

Every generated artifact must answer these questions from the filename or metadata:

```txt
1. Which source document did this come from?
2. Which exact source file version did it come from?
3. Which tool or processing stage created it?
4. Which processing mode was used?
5. Does it cover the full document or specific pages?
6. Which generated version is it?
7. What format is it?
8. What confidentiality level applies?
9. Has a human reviewed it?
10. Can employees rely on it, or must they check the source PDF?
```

