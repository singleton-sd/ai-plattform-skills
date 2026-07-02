---
name: ASIC Company Changes
description: Guides ASIC lodgements for business names and companies, archives receipt PDFs, and fills consent-form docx templates from OneDrive. Use when the user mentions ASIC, address change, director change, Form 484, business name update, or consent forms for company compliance.
tags: [compliance, asic, onedrive, docx, australia]
audience: [all]
status: draft
---

# ASIC Company Changes

End-to-end workflow for Singleton SD ASIC changes: pre-lodgement checklist, manual ASIC Connect lodgement, receipt archiving, and consent-form generation from OneDrive templates.

**Not legal advice.** ASIC receipt PDFs are authoritative. Review all generated consent forms before signing.

## When to use

- User needs an ASIC change (address, directors, shares, or detail update)
- User mentions ASIC Connect, Form 484, business name lodgement, or consent forms
- User has lodged a change and needs receipt archived + consent form filled

## Prerequisites

1. Read [`config/asic-defaults.local.json`](../../config/asic-defaults.local.json) for OneDrive paths, entities, and template map.
   - This file is **local only** (gitignored). If missing, copy [`config/asic-defaults.example.json`](../../config/asic-defaults.example.json) to `asic-defaults.local.json` and fill in your values.
2. Confirm local OneDrive sync is available at `onedriveRoot`.
3. For consent forms: read the **docx** skill (`~/.claude/skills/docx/SKILL.md`) before editing templates.
4. For receipt archiving: read [`documents/pdf-to-markdown/SKILL.md`](../../documents/pdf-to-markdown/SKILL.md).

If `onedriveRoot` or subfolders do not exist, ask the user to confirm paths or create the folder structure before proceeding.

## Required inputs

Confirm before starting. Ask only what the change type needs (see [change-types.md](change-types.md)).

| Input | Rule |
|-------|------|
| `entity` | Key from `asic-defaults.local.json` → `entities` |
| `change_type` | `address_change`, `director_appointment`, `director_resignation`, `share_change`, or `detail_update` |
| Change-specific fields | Per change-type checklist in [change-types.md](change-types.md) |
| `receipt_pdf_path` | Required for post-lodgement steps; absolute path to ASIC receipt PDF |

## Workflow

```text
Task progress:
- [ ] Classify entity + change type
- [ ] Load asic-defaults.local.json and verify OneDrive paths
- [ ] Gather required fields from user
- [ ] Output pre-lodgement ASIC Connect checklist
- [ ] User lodges manually via ASIC Connect
- [ ] Archive receipt PDF (pdf-to-markdown)
- [ ] Fill consent docx from OneDrive template
- [ ] Save outputs to OneDrive folders
- [ ] Report completion summary
```

### Step 1 — Classify

1. Determine **entity type**: `business_name` or `company` (from entity config).
2. Determine **change type** and map to ASIC form / portal action (see [change-types.md](change-types.md)).
3. Resolve paths:

```text
{onedriveRoot}/{folders.templates}/{templates[change_type]}
{onedriveRoot}/{folders.lodged}/
{onedriveRoot}/{folders.consents}/
{onedriveRoot}/{folders.working}/
```

Fail clearly if the consent template file is missing; tell the user which file to add under `templates/`.

### Step 2 — Gather fields

Use the checklist for the selected change type in [change-types.md](change-types.md). Pre-fill defaults from the entity config (`defaultSignatory`, `defaultEmail`, etc.) and confirm with the user.

Build these derived values:

| Derived value | Rule |
|---------------|------|
| `entity-slug` | From entity config `slug` |
| `change-type-slug` | Kebab-case of change type (e.g. `address-change`) |
| `date` | Lodgement date as `YY-MM-DD` (e.g. `26-06-25`) |
| `asic_transaction_ref` | From receipt PDF after lodgement |

### Step 3 — Pre-lodgement checklist

Output a copy-paste checklist for the user. **Do not automate ASIC Connect.**

Include:

- Portal: [ASIC Connect](https://connectonline.asic.gov.au/)
- Entity name and type
- Form or transaction name (from [reference.md](reference.md))
- All field values gathered in Step 2
- Declarations the user must tick (Electronic Lodgement Protocol, accuracy declaration, authority)
- Reminder to download/save the receipt PDF when complete

Pause until the user confirms lodgement is done and provides `receipt_pdf_path`.

### Step 4 — Archive receipt PDF

1. Copy receipt PDF to OneDrive `lodged/`:

```text
{date}-{entity-slug}-{change-type-slug}.pdf
```

Example: `26-06-25-your-business-name-address-change.pdf`

2. Run **pdf-to-markdown** on the receipt:

```bash
pdf-to-markdown \
  --pdf "{receipt_pdf_path}" \
  --workspace "{onedriveRoot}/{folders.working}" \
  --mode local \
  --operator "cursor-agent" \
  --document-category legal \
  --confidentiality internal-confidential
```

Use `engineering` as `workspace_root` only if the user prefers a dev copy alongside OneDrive.

3. Extract `asic_transaction_ref` from the parsed Markdown (look for "Transaction reference").

### Step 5 — Fill consent form

1. Open template: `{onedriveRoot}/{folders.templates}/{templates[change_type]}`
2. Follow the **docx** skill:
   - Unpack template
   - Replace placeholders (see [reference.md](reference.md) → Placeholder dictionary)
   - Validate and repack
3. Save to OneDrive `consents/`:

```text
{date}-{entity-slug}-{change-type-slug}-consent.docx
```

If the template uses different placeholder syntax (e.g. `[ENTITY_NAME]` instead of `{{ENTITY_NAME}}`), inspect the unpacked XML first and document any new placeholders in the session summary.

### Step 6 — Report completion

Use this template:

```text
ASIC change completed

Entity: {displayName} ({entity type})
Change: {change_type}
ASIC transaction ref: {asic_transaction_ref}
Lodged PDF: {onedriveRoot}/{folders.lodged}/{date}-{entity-slug}-{change-type-slug}.pdf
Consent form: {onedriveRoot}/{folders.consents}/{date}-{entity-slug}-{change-type-slug}-consent.docx
Markdown archive: {markdown_path from pdf-to-markdown}

Legal reliance: The ASIC receipt PDF is authoritative. Review the consent form before signing.

Next steps:
- [ ] Sign consent form
- [ ] Save signed copy to OneDrive consents/ (suffix: -signed)
- [ ] Update entity config if ACN/ABN or default address changed
```

## Decision guide

| User says… | Entity type | Change type |
|------------|-------------|-------------|
| Change business address | `business_name` (from local config) | `address_change` |
| Update email / phone on business name | `business_name` | `detail_update` |
| Change registered office | `company` | `address_change` |
| Appoint / resign director | `company` | `director_appointment` / `director_resignation` |
| Issue / transfer shares | `company` | `share_change` |
| Update company details | `company` | `detail_update` |

For ambiguous requests, ask one clarifying question: entity (business name vs company) and change type.

## Troubleshooting

| Problem | Action |
|---------|--------|
| OneDrive path not found | Confirm `onedriveRoot` in `asic-defaults.local.json`; check sync status |
| Template missing | List expected path; ask user to add template to `templates/` |
| Placeholder not replaced | Unpack docx; search `word/document.xml` for actual placeholder text |
| pdf-to-markdown fails | See [pdf-to-markdown/SKILL.md](../../documents/pdf-to-markdown/SKILL.md) troubleshooting |
| Company ACN unknown | Ask user; update `asic-defaults.local.json` for the company entity |

## Additional resources

- Per-change-type field checklists: [change-types.md](change-types.md)
- ASIC forms, portal links, naming, placeholders: [reference.md](reference.md)
- Config (local): [`config/asic-defaults.local.json`](../../config/asic-defaults.local.json) (gitignored)
- Config (example): [`config/asic-defaults.example.json`](../../config/asic-defaults.example.json)
