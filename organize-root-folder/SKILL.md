---
name: organize-root-folder
description: Organize a user-provided root folder of mixed personal, finance, property, loan, company, insurance, legal, and business documents into clean upload-ready folders. Use when the user asks to organize files, treat a folder as the root, rename documents from their content, create folders/subfolders, prepare a folder for OneDrive browser upload, sort loan/property/company documents, or replicate the document organization workflow from a prior session.
---

# Organize Root Folder

Organize a document root into human-readable, upload-ready folders by inventorying files, extracting enough evidence, proposing safe names, and moving files only when the user has approved or clearly asked to proceed.

## Core Rules

- Treat the user-provided folder as the job root. If the user says "this folder", use the current workspace root.
- Work from absolute paths and stay inside the root unless the user explicitly asks otherwise.
- Preserve original files and extensions. Do not overwrite files; append `-v2`, `-v3`, etc. only when a collision exists.
- Ignore system/control folders such as `.git`, `.agents`, `.codex`, `.claude`, `.cursor`, and generated extraction trees unless the user asks to organize them.
- Keep derived extraction artifacts separate from source documents.
- Prefer cautious, evidence-backed labels over clever summaries.
- Propose before first-time or uncertain rename/move operations.

## Filename Standard

Use this format unless the user gives another convention:

```text
YY-MM-DD Name Type Detail.ext
```

Examples:

```text
26-07-06 Patricio Perpetua Driver License Victoria.pdf
26-05-20 Patricio Perpetua NAB Facility Agreement.pdf
26-05-25 Patricio Perpetua Sachi Legal Post Settlement Letter 11 Arylide Walk.pdf
23-09-21 Budget Direct Home and Contents Insurance PDS.pdf
```

Apply these rules:

- Start every filename with `YY-MM-DD`.
- Use the most relevant document date, not necessarily the first date found.
- If no reliable date is found, use today's date in the user's timezone and mark the item low confidence.
- Use Title Case words separated by spaces after the date.
- Prefer this order after the date: person/entity or provider, document type, useful distinguishing detail.
- Remove unsafe filesystem characters: `< > : " / \ | ? *`, control characters, repeated spaces, and trailing dots.
- Avoid full account numbers, licence numbers, Medicare numbers, tax file numbers, full DOBs, and other high-risk identifiers. Use short safe tails only when useful.

## Date Selection

Choose the date that best identifies the document:

| Document type | Preferred date |
| --- | --- |
| Bank or credit card statement | Statement period end date, then issue date |
| Driver licence or identity document | Issue date, then expiry date |
| Medical report, invoice, referral, result | Service/visit/specimen/report date, then issue date |
| Insurance certificate, policy, or notice | Effective/start/issue date |
| Tax, legal, or government notice | Notice/issue/effective date |
| Receipt or invoice | Transaction/invoice date |
| Contract, agreement, or loan document | Signed/effective/disclosure date |
| Property settlement document | Settlement date, then letter date |
| Unknown document | Most prominent reliable document date, then today's date |

Convert all dates to `YY-MM-DD`. If a document only gives a month or period, use the period end when clear; otherwise use the first day of the month and note the uncertainty.

## Workflow

1. Inventory files recursively under the root.
2. Extract enough content to identify each file. Use specialized tooling by file type when available:
   - PDFs: use lightweight PDF text/context extraction first; route large, scanned, or OCR-heavy files through a PDF-to-Markdown/OCR workflow when needed.
   - DOCX: use DOCX/text extraction tooling when content is needed.
   - Images/scans: use OCR only when required for a reliable name or classification.
3. Use metadata dates as hints, not final truth, unless body text is unavailable.
4. Classify each file by document type, issuer/provider, person/entity, property/address, account/reference tail, and useful distinguishing detail.
5. Stop extraction once there is enough evidence for a high-confidence folder and filename.
6. Design a shallow folder structure around retrieval or upload workflows.
7. Show a proposal table before uncertain or first-time changes. Include original path, proposed path, document type, date evidence, confidence, and notes.
8. Move and rename files after the user approves or clearly asked for execution up front.
9. Finish with the final folder tree, skipped items, low-confidence items, and any empty folders left behind.

## Folder Patterns

For property or home-loan roots, prefer:

```text
Home Loan/
  Loan Application/
  Information Requested/
  Approval And Loan Documents/
  Insurance/
  Settlement/
```

For company or business roots, prefer:

```text
Company/
  Registration And ASIC/
  Director And Identity/
  Banking And Trust Accounts/
  ABRS And ATO/
  Legal And Governance/
```

For mixed personal roots, use practical buckets such as:

```text
Identity/
Banking/
Insurance/
Tax/
Medical/
Property/
Legal/
Receipts/
```

Flatten temporary package folders when their contents belong in clearer categories. Remove empty staging folders only after verifying they are empty.

## Confidence

- High: document type and date are directly supported by content or reliable metadata.
- Medium: type is clear, but date/source required judgment, metadata, filename, or surrounding folder context.
- Low: content is scanned, encoded, password-protected, blank, conflicting, or classification relies mostly on filename.

For low-confidence items, do not invent issuers, dates, names, or categories. Use a cautious folder/name such as `Unknown Document Unclassified` and explain what could not be verified.

## OneDrive Readiness

Before finishing:

- Ensure important files are inside the root folder the user plans to upload.
- Prefer spaces and Title Case filenames for human browsing.
- Avoid overly long folder names copied from email/download packages.
- Keep the hierarchy shallow enough for OneDrive browser upload and normal browsing.
- Leave the final structure clean enough that dragging the root folder into OneDrive preserves the intended organization.
