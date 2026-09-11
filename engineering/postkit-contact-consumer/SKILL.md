---
name: PostKit Contact Consumer
description: >-
  Onboard a new PostKit marketing or contact-form consumer by updating every
  required config surface (App Config origins and host profiles, Function App
  platform CORS, optional Forward Email domain, publicBaseUrl, preview header,
  smoke tests). Use when adding a brochure/marketing site that posts to PostKit
  POST /contact, extending InkAds-style integrations, or diagnosing contact
  CORS / 500 failures after a new origin is introduced.
tags: [ops, postkit, email, cors, contact, onboarding, azure]
audience: [engineers, agents]
status: stable
---

# PostKit Contact Consumer

Use this skill when adding or repairing a **public marketing/contact** consumer
of PostKit `POST /contact`. Do **not** use it for authenticated
`POST /emails/send` tenant onboarding (that is PostKit
`docs/onboarding/tenant-onboarding.md`).

## Source of truth

1. Read the consumer checklist in the **post-kit** repo:
   [`docs/onboarding/contact-consumer.md`](https://github.com/singleton-sd/post-kit/blob/main/docs/onboarding/contact-consumer.md)
   (path in clone: `docs/onboarding/contact-consumer.md`).
2. Reference consumer: `docs/integrations/inkads-marketing.md`.
3. Forward Email / DNS: follow [`engineering/forward-email`](../forward-email/SKILL.md)
   and post-kit `docs/email-forward-email.md`.
4. Skills are **not** authored inside post-kit — change this skill here, then
   wire `pnpm sync:skills` in post-kit to install `postkit-contact-consumer`.

## Config surfaces (every one)

When onboarding host `example.poc.singletonsd.com` (adjust names):

| # | Surface | Where | Example |
| --- | --- | --- | --- |
| 1 | Hostname allowlist | App Config `app:email:origins` (+ `infra/appconfig-seed.json`) | `*.poc.singletonsd.com,localhost:4321` |
| 2 | Host profile | App Config `app:email:profilesByHost` | `fromAddress` / `fromName` / `contactInboxAddress` keyed by host |
| 3 | Platform CORS | `infra/function-app.bicep` `siteConfig.cors.allowedOrigins` (+ live Function App) | Exact `https://example.poc.singletonsd.com` — **no globs** |
| 4 | Sending domain | `packages/post-kit-email/config/email-domains.json` + `pnpm email:provision` | Required when `fromAddress` uses a **new** `mail.*` subdomain |
| 5 | Public API URL | App Config `app:api:publicBaseUrl` | Consumer build-time base for `/contact` |
| 6 | Preview header | Consumer client | `X-PostKit-Contact-Preview: true` on same-host PR previews |
| 7 | Smoke tests | curl / browser | `OPTIONS` ACAO, `POST` 202, `GET /health` |

### Dual allowlist rule (non-negotiable)

Linux Consumption intercepts `OPTIONS` before function code. Updating only
`app:email:origins` does **not** fix browser preflight. You must also set
**exact** origins on Function App platform CORS (`supportCredentials: false`).
Keep platform CORS and App Config ORIGINS in sync.

### Contact 500 after CORS works

If preflight is fine but `POST /contact` returns 500 with
`We could not send your message`, check Forward Email: missing sending domain
on the account returns provider **400 Domain does not exist** (permanent →
HTTP 500). Provision the domain before blaming App Config secrets.

Never print `FORWARD_EMAIL_TOKEN` / Key Vault secret values.

## Procedure

1. Confirm the consumer Origin host and desired inbox / from identity.
2. Update App Config seed + live keys for origins and `profilesByHost`.
3. Add exact origins to bicep CORS; apply live if needed
   (`az functionapp cors add` or infra deploy).
4. If the from-domain is new: add `email-domains.json` entry →
   `pnpm email:provision -- --domain <mail-domain>` (AWS Route53 from
   pc-provision). See `engineering/forward-email`.
5. Point the consumer at `app:api:publicBaseUrl`; implement preview header.
6. Smoke: OPTIONS + POST from the new Origin; record correlation id (no secrets).
7. Update post-kit integration docs if this is a named PoC consumer.

## Out of scope

- Custom API hostname / DNS for `postkit.singletonsd.com` (separate post-kit issue).
- Entra / MCP / template publish tenant onboarding.
- Authoring skill files inside the post-kit git tree.
