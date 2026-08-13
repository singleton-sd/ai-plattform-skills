---
name: Register Permissions
description: >-
  Register OpenFGA {resource}:{action} catalog entries when adding a Prisma
  model or guarded Nest route in poc-plattform-kit. Use whenever an agent
  implements a new pillar feature, controller action, or table that needs
  PermissionsGuard / OpenFGA — before the PR ships. Done means
  `pnpm permissions:check` is green and the manifest matches the route.
tags: [engineering, backend, permissions, openfga, nestjs, prisma]
audience: [engineers]
status: stable
---

# Register Permissions

When implementing a **new Prisma model** or **guarded Nest route** in
[`singleton-sd/poc-plattform-kit`](https://github.com/singleton-sd/poc-plattform-kit),
register the matching `{resource}:{action}` in the permissions catalog. Do not
ship the route until the drift check is green.

Canonical project checklist (commands, artifacts, deploy):
[docs/permissions.md](https://github.com/singleton-sd/poc-plattform-kit/blob/main/docs/permissions.md).

AuthZ stays in the Permissions pillar (`Check(subject, action, resource)` →
OpenFGA). Coarse Entra roles (`@Roles`) stay in SingleSignOn. Do not embed
AuthZ rules in Contact/Tenant/etc.

## When this skill applies

Run it if **any** of these is true in `poc-plattform-kit`:

- New Prisma model / table that will be a guarded resource
- New or changed Nest controller method that `PermissionsGuard` should authorize
- New HTTP `METHOD` + Nest `route.path` that is not already in
  `infra/openfga/permissions.manifest.json`

Skip when the change is docs-only, CI-only, or a public unauthenticated route
that is intentionally not in the catalog.

## Register

Dry-run first, then apply (from the kit repo root):

```bash
pnpm permissions:register -- --method PATCH --path /contacts/:id \
  --action update --resourceType contact --resourceIdParam id
pnpm permissions:register -- --apply --method PATCH --path /contacts/:id \
  --action update --resourceType contact --resourceIdParam id
```

`--path` must match Nest `route.path` (not the global `/api` prefix).
`--resourceIdParam` is the path param OpenFGA uses as the object id.

This updates both copies of `permissions.manifest.json`, appends a `define`
(or new `type`) in `infra/openfga/model.fga`, and best-effort patches
`infra/openfga/model.json`. Do not hand-edit a private `mapPermission` in
`PermissionsGuard`.

## Done

1. `pnpm permissions:check` exits 0 (CI `ci-api.yml` runs the same check).
2. Manifest has an entry for the guarded `METHOD` + Nest `route.path`.
3. `action` exists on `resourceType` in `model.fga`.
4. When infra is available, push the model (`infra/deploy-openfga.ps1` — see
   `docs/permissions.md`).

A PR that adds a guarded route without a catalog entry is not done.

## Related

- Project docs: [poc-plattform-kit `docs/permissions.md`](https://github.com/singleton-sd/poc-plattform-kit/blob/main/docs/permissions.md)
- [`engineering/backend`](engineering/backend/SKILL.md) — Nest/Prisma baseline
- [`engineering/implement-feature`](engineering/implement-feature/SKILL.md) — call this skill before opening the PR
