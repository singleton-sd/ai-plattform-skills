---
name: Route 53 Subdomains
description: >-
  Create, update, or delete Route 53 DNS records (project subdomains) using
  least-privilege AWS credentials from Azure Key Vault. Use when an agent
  needs a subdomain, CNAME/A/TXT record, hosted zone ID, or DNS for
  singletonsd.com and related domains. Load company.secrets.env into the shell,
  use resolve-route53-zone on PATH — never admin AWS or hardcoded zone IDs.
tags: [engineering, aws, route53, dns, infrastructure]
audience: [engineers, agents]
status: stable
---

# Route 53 subdomains (agents)

## Credentials

Bootstrap writes Key Vault secrets to `~/.config/pc-provision/company.secrets.env`. That file is **not** loaded automatically — export it into the **current shell** before any `aws` or `resolve-route53-zone` call:

```bash
SECRETS_FILE="${HOME}/.config/pc-provision/company.secrets.env"
if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "Missing ${SECRETS_FILE} — stop and use Human handoff below." >&2
  exit 2
fi
set -a
# shellcheck source=/dev/null
source "$SECRETS_FILE"
set +a
for v in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  val="${!v:-}"
  if [[ -z "$val" || "$val" == REPLACE_ME ]]; then
    echo "${v} missing or REPLACE_ME — stop and use Human handoff below." >&2
    exit 2
  fi
done
```

Rules:

- Never use root/admin AWS for routine DNS.
- Never run `create-aws-route53-user.sh` from agent work.

### Human handoff (missing file or `REPLACE_ME`)

**Stop.** Do not run provisioning commands yourself. Tell a human:

> Route 53 agent credentials are not ready in Key Vault / `company.secrets.env`.
>
> Human: clone [pc-provision](https://gitlab.com/singleton-sd/engineering/pc-provision), then from **Git Bash or WSL** with admin AWS (`aws login`) and `az login`:
>
> ```bash
> unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
> ./infra/create-aws-route53-user.sh
> ```
>
> Re-run pc-provision bootstrap (or Key Vault pull) so agents get real values, then retry DNS work.

## Resolve hosted zone ID

After loading credentials (even though zone lookup does not need AWS keys for the map path, keep one consistent shell session):

```bash
resolve-route53-zone <fqdn-or-apex>
```

Order: `~/.config/pc-provision/route53.zones.map` (synced at bootstrap) → `route53:ListHostedZonesByName`.

## Change a record

Load credentials first (see above), then:

```bash
ZONE_ID="$(resolve-route53-zone preview.example.singletonsd.com)"
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch file://change.json
```

Wait for `aws route53 get-change` → `INSYNC` before declaring success.

- Prefer UPSERT for create/update; DELETE must match exact current RDATA.
- One owner per FQDN — do not parallel-edit the same name.

## Admin / smoke (humans only)

- Provision or rotate keys: pc-provision `./infra/create-aws-route53-user.sh`
- Smoke test (throwaway IAM user, no KV): pc-provision `./scripts/test-aws-route53-user.sh`

## Platform

Bash + AWS CLI. Works on Linux, macOS, WSL, Git Bash after pc-provision bootstrap.

## Installing this skill

Run **in the project repo** where agents need DNS (not inside pc-provision), from a shell with Node/npx — **WSL `singleton-sd` or Git Bash** is fine:

```bash
cd ~/src/your-project   # example
npx skills add https://gitlab.com/singleton-sd/ai-plattform/skills --skill route53-subdomains
```

That links the skill into the project's agent skill paths (e.g. `.cursor/skills`). Use WSL if Cursor opens the project via Remote-WSL; use Windows/Git Bash if the workspace root is on the Windows filesystem.
