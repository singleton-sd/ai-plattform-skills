# ASIC Change Types — Field Checklists

Use the checklist matching **entity type** + **change type**. Ask only for fields not already known from config or conversation.

Date format for ASIC forms: `DD/MM/YYYY` unless the portal shows otherwise.

---

## address_change

### Business name entity

**ASIC Connect:** Change business name details → Change business name address

| Field | Required | Notes |
|-------|----------|-------|
| Address for service — effective date | Yes | |
| Address for service — street number | Yes | |
| Address for service — street name | Yes | |
| Address for service — suburb | Yes | |
| Address for service — state | Yes | |
| Address for service — postcode | Yes | |
| Principal place of business — effective date | Yes | Often same as service address |
| Principal place — full address | Yes | Same fields as service address |
| Lodging party name | Yes | Default: entity `defaultSignatory` |
| Lodging party email | Yes | Default: entity `defaultEmail` |

**Declarations:** Electronic Lodgement Protocol; information complete and accurate; authority as registration holder or authorised agent.

**Consent placeholders:** `OLD_ADDRESS`, `NEW_ADDRESS`, `EFFECTIVE_DATE`, `CHANGE_DESCRIPTION` (= "change of business name address").

### Company entity

**ASIC Connect:** Form 484 — Change to company details

| Field | Required | Notes |
|-------|----------|-------|
| ACN | Yes | From entity config or user |
| Registered office — effective date | Yes | |
| Registered office — full address | Yes | |
| Principal place of business — effective date | Yes | |
| Principal place — full address | Yes | May be same as registered office |
| Signatory name | Yes | Director or authorised agent |

**Consent placeholders:** `OLD_ADDRESS`, `NEW_ADDRESS`, `EFFECTIVE_DATE`, `CHANGE_DESCRIPTION` (= "change of registered office and principal place of business").

---

## director_appointment

**Entity:** Company only. Not applicable to business names.

**ASIC Connect:** Form 484 / Form 362 (appointment of director or alternate director)

| Field | Required | Notes |
|-------|----------|-------|
| ACN | Yes | |
| Director full name | Yes | |
| Director date of birth | Yes | |
| Director residential address | Yes | |
| Appointment effective date | Yes | |
| Director consent obtained | Yes | Consent form required before lodgement |

**Pre-lodgement:** Prepare and obtain signed director consent before lodging.

**Consent placeholders:** `DIRECTOR_NAME`, `DIRECTOR_ADDRESS`, `APPOINTMENT_DATE`, `CHANGE_DESCRIPTION`.

---

## director_resignation

**Entity:** Company only

**ASIC Connect:** Form 484 — Cessation of officeholder

| Field | Required | Notes |
|-------|----------|-------|
| ACN | Yes | |
| Resigning director full name | Yes | |
| Cessation date | Yes | |
| Reason | Yes | Usually "Resignation" |

**Consent placeholders:** `DIRECTOR_NAME`, `CESSATION_DATE`, `CHANGE_DESCRIPTION` (= "resignation as director").

---

## share_change

**Entity:** Company only

**ASIC Connect:** Form 484 (change to share structure) and update internal share register

| Field | Required | Notes |
|-------|----------|-------|
| ACN | Yes | |
| Change description | Yes | e.g. issue new shares, transfer between members |
| Share class | Yes | |
| Number of shares | Yes | |
| Holder name(s) | Yes | |
| Effective date | Yes | |
| Consideration (if transfer) | If applicable | |

**Pre-lodgement:** Confirm constitution allows the change; prepare member/shareholder consent if required.

**Consent placeholders:** `SHARE_CLASS`, `SHARE_COUNT`, `HOLDER_NAME`, `EFFECTIVE_DATE`, `CHANGE_DESCRIPTION`.

---

## detail_update

### Business name entity

**ASIC Connect:** Change business name details (contact details)

| Field | Required | Notes |
|-------|----------|-------|
| Email address | If changing | Include effective date per field |
| SMS / mobile | If changing | Include effective date |
| Lodging party details | Yes | Name, email |

**Consent placeholders:** `CHANGE_DESCRIPTION`, `OLD_VALUE`, `NEW_VALUE`, `EFFECTIVE_DATE`.

### Company entity

**ASIC Connect:** Form 484 — other company detail changes

| Field | Required | Notes |
|-------|----------|-------|
| ACN | Yes | |
| Field being changed | Yes | e.g. company email, principal activity |
| Old value | Yes | |
| New value | Yes | |
| Effective date | Yes | |

**Consent placeholders:** `CHANGE_DESCRIPTION`, `OLD_VALUE`, `NEW_VALUE`, `EFFECTIVE_DATE`.

---

## Post-lodgement fields (all change types)

Collect from ASIC receipt PDF after lodgement:

| Field | Source |
|-------|--------|
| `asic_transaction_ref` | Receipt header ("Transaction reference") |
| `date_submitted` | Receipt lodgement details |
| `date_signed` | Declaration section |

These populate consent placeholders `ASIC_TRANSACTION_REF`, `DATE_SUBMITTED`, `DATE_SIGNED`.
