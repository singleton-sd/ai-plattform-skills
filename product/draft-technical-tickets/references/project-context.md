# Project context — poc-plattform-kit

Default target when drafting tickets for Singleton SD platform work.
Re-verify against the live repository and ClickUp Architecture Doc; do not treat this file as fresher than either source.

## Repository

| Item | Value |
|------|-------|
| GitHub | `singleton-sd/poc-plattform-kit` |
| Local (typical) | `C:\00Personal\singleton-sd\poc-plattform-kit` |
| Ticket title tag | Include `[repo=singleton-sd/poc-plattform-kit]` in the task name or description |
| Root agent guidance | `AGENTS.md` (read first when checkout exists) |

## ClickUp (locked)

| Concern | Target |
|---------|--------|
| Ops / tickets list | `list_id=901616287298` (workspace `90161394355`, space PoC) — https://app.clickup.com/90161394355/v/li/901616287298 |
| Architecture Doc | https://app.clickup.com/90161394355/docs/2kz0kcnk-1416 (`document_id=2kz0kcnk-1416`) |
| Docs folder | https://app.clickup.com/90161394355/v/f/901610744236/90165834867 (`folder_id=901610744236`) |

Do **not** create a separate Platform Kit space/list.

### Ops list statuses (implement / review loop)

| Group | Statuses |
|-------|----------|
| Not started | `TO DO` |
| Active | `IN PROGRESS`, `READY FOR AI` |
| Done (handoff) | `READY FOR REVIEW`, `READY FOR HUMAN` |
| Closed | `COMPLETE` |

### Notable custom fields (ops list)

| Field | UUID | Usage |
|-------|------|-------|
| Claim Token | `50a8d70c-e3a6-4bd7-8e3d-7661eaf6e6c7` | Exclusive agent lock |
| Preview URL | `978d43d5-e404-4262-98a2-0193ade4736d` | PR / preview link |
| Token Estimate | `ab22f8d4-df04-435e-849a-9ca6c23489be` | Planning |
| Token Spent | `be7b08e9-b094-4578-bd0a-49f20af85f3c` | Finishing |

Drafting tickets does **not** claim work. Claim Token is for implement/review agents only.

## Architecture snapshot

Pillars (no cross-pillar DB joins or write HTTP): **Tenant**, **SingleSignOn**, **Subscriptions**, **Contact**, **Support**, **Audit**, **Reporting**, **Permissions** (OpenFGA), **Notifications**.

| Layer | Stack / constraint |
|-------|--------------------|
| Messaging | Azure Service Bus (topics = events, queues = jobs) |
| Mutations | Same transaction → entity + local Audit + Outbox when others must be notified |
| DB | Azure SQL + Prisma `sqlserver`; forward-only migrations |
| Web | Next.js PWA SPA + Tailwind + [Singleton SD tokens](https://tokens.design.singletonsd.com/) |
| API | NestJS + Swagger; OpenAPI → `packages/api-client` (Orval) |
| AuthN | Entra via SingleSignOn; Nest guards / roles |
| AuthZ | Permissions pillar / OpenFGA — other pillars call Permissions; do not embed authZ rules in domain pillars |
| Secrets | Azure Key Vault only |
| App config | Azure App Configuration with Key Vault references |
| CI/CD | GitHub Actions OIDC → Azure |

When drafting, check cross-cutting impact on auth, permissions, tenancy, audit, notifications, subscriptions, reporting, support, and contacts.

## Branch / delivery conventions (for ticket notes)

- Feature branches: `feature/<clickup-task-id>-<kebab-title>` in a dedicated git worktree
- Humans merge; agents open PRs and move tickets through READY FOR REVIEW / READY FOR HUMAN
- API contract changes: update Swagger, then `pnpm openapi:export && pnpm openapi:generate` (verify commands in repo)
- UI: token CSS variables + Tailwind only — no hardcoded palette hex

## Other repositories

If the user names a different repo, prefer that repo’s `AGENTS.md` / docs over this file. Keep ClickUp destinations as the user or that repo specifies.
