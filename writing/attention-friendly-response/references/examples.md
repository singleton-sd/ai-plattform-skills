# Attention-friendly examples

Lightweight before/after cases. Use when validating that the skill improves
scanability without dropping actionable detail.

## 1. Simple architecture recommendation

**Before (hard to act on)**  
Sure — happy to help with the database choice. There are several options worth
considering. PostgreSQL is popular, SQL Server is used in enterprise settings,
and SQLite can work for prototypes. Depending on your constraints around hosting,
team familiarity, and multi-tenant needs, you might lean different ways. Let me
know if you want a deeper comparison.

**After**  
Use **SQL Server** for this NestJS + Prisma stack — it matches the platform
standard and existing skills.

- Postgres only if you have a hard external dependency on it  
- Ask if you want a short trade-off table

## 2. Multi-step implementation status

**Before**  
I've been working through the ticket. First I created a worktree, then I updated
the skill file, then I updated the README, and then I ran the link script. There
were no open merge requests. Next I should probably push and open an MR unless
you want changes first.

**After**  
Skill + README are ready locally; adapters regenerated. **Next:** push and open
GitLab MR `feature/AI-50-…` unless you want edits first.

| Done | Pending |
|------|---------|
| `SKILL.md`, examples, README | Push / MR |
| `npm run link:skills` | Your review |

## 3. Debugging explanation

**Before**  
The error might be caused by several things. It could be an auth problem, or the
list ID could be wrong, or the token might be expired. Looking at the stack
trace, I notice a 401. That usually means authorization failed. You should check
your token and also verify the list permissions.

**After**  
**401 from ClickUp** — the API token is rejected (not a bad list id).

1. Confirm `CLICKUP_API_TOKEN` in this shell  
2. Re-auth if the token was rotated  
3. Retry the same `GET /list/{id}/task` call

## 4. Code-review summary

**Before**  
I reviewed the pull request carefully. Overall it looks pretty good. There are
some nits around naming and a possible null check. The tests seem fine. I think
you should address the null check before merging but the naming is optional.

**After**  
**Blocker:** null-check `claim` before `.length` in `pickReadyTasks` (NPE on
empty custom fields).  

**Nit (optional):** rename `tmp` → `claimToken`. Tests look fine otherwise.

## 5. Request that needs real depth

**Prompt:** Explain why the outbox pattern belongs in the same DB transaction as
the domain write.

**After (still detailed — work/depth preserved; padding removed)**  
**Same transaction** so a crash cannot commit the entity without the outbox row
(or the reverse). Consumers must not see “happened” domain state that never
emitted an event.

Keep the explanation precise: isolation, dual-write failure modes, and how the
relay publishes after commit. Use headings or a short sequence diagram if the
user asks for more — do not pad with a restated question or a closing recap.
