# ASIC Reference — Forms, Portals, Naming, Placeholders

## ASIC Connect

| Portal | URL |
|--------|-----|
| ASIC Connect (business names and companies) | https://connectonline.asic.gov.au/ |

Log in with your ASIC agent credentials or company/BN holder credentials. The agent does **not** automate this portal.

## Forms and transactions

| Change | Business name | Company |
|--------|---------------|---------|
| Address | Change business name address | Form 484 — registered office / principal place |
| Director appointment | N/A | Form 484 / Form 362 |
| Director resignation | N/A | Form 484 — cessation of officeholder |
| Share change | N/A | Form 484 + share register update |
| Contact / detail update | Change business name details | Form 484 |

## File naming

Configured in `asic-defaults.local.json` → `naming`. Date format: `YY-MM-DD`.

| Artifact | Pattern | Example |
|----------|---------|---------|
| Lodged receipt PDF | `{date}-{entity-slug}-{change-type}.pdf` | `26-06-25-your-business-name-address-change.pdf` |
| Consent form | `{date}-{entity-slug}-{change-type}-consent.docx` | `26-06-25-your-business-name-address-change-consent.docx` |
| Signed consent | Same as consent + `-signed` before extension | `...-consent-signed.docx` |

**Change-type slugs:**

| `change_type` key | Slug |
|-------------------|------|
| `address_change` | `address-change` |
| `director_appointment` | `director-appointment` |
| `director_resignation` | `director-resignation` |
| `share_change` | `share-change` |
| `detail_update` | `detail-update` |

## OneDrive folder layout

Under `onedriveRoot` from your local config (see `asic-defaults.local.json`):

```text
ASIC/
├── templates/     # Source .docx templates (do not overwrite)
├── lodged/        # ASIC receipt PDFs
├── consents/      # Generated and signed consent forms
└── working/       # pdf-to-markdown workspace (/documents tree)
```

Create these folders if missing. Place templates in `templates/` using filenames from `asic-defaults.local.json` → `templates`.

## Template files

| Change type | Template filename |
|-------------|-------------------|
| `address_change` | `consent-address-change.docx` |
| `director_appointment` | `consent-director-appointment.docx` |
| `director_resignation` | `consent-director-resignation.docx` |
| `share_change` | `consent-share-change.docx` |
| `detail_update` | `consent-detail-update.docx` |

Templates should use consistent placeholder syntax. Default: `{{PLACEHOLDER}}`. If a template uses `[PLACEHOLDER]` or `<<PLACEHOLDER>>`, inspect unpacked XML and adapt find-replace.

## Placeholder dictionary

Replace all placeholders in the consent template before saving. Use empty string or "N/A" only when a field truly does not apply.

### Common (all change types)

| Placeholder | Source |
|-------------|--------|
| `{{ENTITY_NAME}}` | Entity `displayName` |
| `{{ENTITY_TYPE}}` | `business name` or `company` |
| `{{ACN}}` | Company ACN (companies only) |
| `{{ABN}}` | ABN if applicable |
| `{{ACN_OR_ABN}}` | ACN for company; ABN or "N/A" for business name |
| `{{CHANGE_DESCRIPTION}}` | Human-readable summary of the change |
| `{{EFFECTIVE_DATE}}` | Change effective date (`DD/MM/YYYY`) |
| `{{ASIC_TRANSACTION_REF}}` | From receipt PDF |
| `{{DATE_SUBMITTED}}` | Lodgement date from receipt |
| `{{DATE_SIGNED}}` | Today's date or receipt declaration date |
| `{{SIGNATORY_NAME}}` | Person signing consent; default `defaultSignatory` |
| `{{SIGNATORY_EMAIL}}` | Default `defaultEmail` |

### Address change

| Placeholder | Source |
|-------------|--------|
| `{{OLD_ADDRESS}}` | Full formatted previous address |
| `{{NEW_ADDRESS}}` | Full formatted new address |
| `{{OLD_STREET}}` | Previous street number + name |
| `{{NEW_STREET}}` | New street number + name |
| `{{OLD_SUBURB}}` | Previous suburb |
| `{{NEW_SUBURB}}` | New suburb |
| `{{OLD_STATE}}` | Previous state |
| `{{NEW_STATE}}` | New state |
| `{{OLD_POSTCODE}}` | Previous postcode |
| `{{NEW_POSTCODE}}` | New postcode |

**Address format example:** `123 Example Street, Suburb STATE 3000`

### Director changes

| Placeholder | Source |
|-------------|--------|
| `{{DIRECTOR_NAME}}` | Full name of director |
| `{{DIRECTOR_ADDRESS}}` | Residential address |
| `{{APPOINTMENT_DATE}}` | Appointment effective date |
| `{{CESSATION_DATE}}` | Resignation / cessation date |

### Share changes

| Placeholder | Source |
|-------------|--------|
| `{{SHARE_CLASS}}` | e.g. Ordinary |
| `{{SHARE_COUNT}}` | Number of shares |
| `{{HOLDER_NAME}}` | Shareholder / member name |

### Detail updates

| Placeholder | Source |
|-------------|--------|
| `{{OLD_VALUE}}` | Previous value |
| `{{NEW_VALUE}}` | New value |

## Docx fill procedure

1. Copy template to a working file (never edit the template in place).
2. Unpack: `python scripts/office/unpack.py template.docx unpacked/`
3. Search `unpacked/word/document.xml` for placeholder strings.
4. Replace placeholders in XML (and headers/footers if present).
5. Repack and validate per docx skill.
6. Save output to `consents/` with the naming pattern above.

## Entity registry

Maintained in `config/asic-defaults.local.json` (gitignored — not in the repo). Copy from [`config/asic-defaults.example.json`](../../config/asic-defaults.example.json) to set up. Update when:

- Company ACN is obtained
- Default signatory or contact details change
- A new entity is added

## Legal reliance

- ASIC receipt PDFs are the authoritative record of lodgement.
- Generated consent forms are drafts until reviewed and signed.
- Parsed Markdown from pdf-to-markdown is for search/AI analysis only — not for compliance decisions.
