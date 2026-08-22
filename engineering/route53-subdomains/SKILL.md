---
name: Route 53 Subdomains
description: >-
  Create, update, or delete Route 53 DNS records (project subdomains) using
  least-privilege AWS credentials from Azure Key Vault. Use when an agent
  needs a subdomain, CNAME/A/TXT record, hosted zone ID, or DNS for
  singletonsd.com and related domains. Use resolve-route53-zone on PATH and
  company.secrets.env — never admin AWS or hardcoded zone IDs.
tags: [engineering, aws, route53, dns, infrastructure]
audience: [engineers, agents]
status: stable
---

# Route 53 subdomains (agents)

## Credentials

1. Ensure workstation bootstrap pulled Key Vault secrets (`~/.config/pc-provision/company.secrets.env`).
2. Use env vars (never commit values):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
3. Never use root/admin AWS for routine DNS. Never run `create-aws-route53-user.sh` from agent work.

If secrets are missing or `REPLACE_ME`, stop and ask a human to provision via [pc-provision](https://gitlab.com/singleton-sd/engineering/pc-provision):

```bash
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
./infra/create-aws-route53-user.sh
```

## Resolve hosted zone ID

Zone IDs are **not** secrets. Always resolve:

```bash
resolve-route53-zone <fqdn-or-apex>
```

Order: `~/.config/pc-provision/route53.zones.map` (synced at bootstrap) → `route53:ListHostedZonesByName`.

## Change a record

```bash
ZONE_ID="$(resolve-route53-zone preview.example.singletonsd.com)"
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch file://change.json
```

Wait for `aws route53 get-change` → `INSYNC` before declaring success.

- Prefer UPSERT for create/update; DELETE must match exact current RDATA.
- One owner per FQDN — do not parallel-edit the same name.

## Admin / smoke (humans)

- Provision or rotate keys: pc-provision `create-aws-route53-user.sh`
- Smoke test (throwaway IAM user, no KV): pc-provision `scripts/test-aws-route53-user.sh`

## Platform

Bash + AWS CLI. Works on Linux, macOS, WSL, Git Bash after pc-provision bootstrap.
