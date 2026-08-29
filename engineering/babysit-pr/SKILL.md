---
name: Babysit PR
description: >-
  Keep a pull request or merge request merge-ready by triaging review feedback,
  resolving clear conflicts, and fixing CI in a loop. Reply on each review
  thread (not as a top-level comment) and leave thread resolution to the
  reviewer or bot unless the repo says otherwise.
tags: [engineering, review, pr, mr, ci, github, gitlab]
audience: [engineers, tech-leads]
status: stable
---

# Babysit PR

Get a change request to a merge-ready state: green CI, no merge conflicts, and
every actionable review thread has an **in-thread** reply.

For full triage templates, host detection, and tracker updates, also read
[`engineering/address-change-request-review`](../address-change-request-review/SKILL.md).

## Workflow

1. **Merge conflicts** — Resolve intelligently, preserving branch intent. If
   intents conflict, abort and ask for clarification. Follow the repo's conflict
   playbook when one exists.
2. **Comments** — Review active **unresolved review threads** (including
   CodeRabbit/Bugbot). Use GraphQL review threads on GitHub; use discussions API
   on GitLab. Read only each comment body and the minimum location needed.
   - **Reply in the review thread**, not as a top-level PR/MR comment. On
     GitHub, use `addPullRequestReviewThreadReply` (GraphQL) or REST
     `in_reply_to` on the original review comment so the response appears under
     the inline finding.
   - **Do not resolve or close threads yourself** unless the repo's `AGENTS.md`
     (or equivalent) explicitly instructs agents to resolve. Push the fix (or a
     brief decline with reason), reply in-thread, and leave resolution to the
     reviewer or bot.
   - Validate bot findings against current code; skip invalid ones with a
     one-line in-thread explanation.
3. **CI** — Fix failures caused by this PR's scope only. Never weaken checks or
   make unrelated changes. If the branch is behind the base branch, merge or
   rebase latest default branch first. Push scoped fixes and re-watch CI until
   mergeable and green.

Stay in an isolated worktree on the feature branch — follow
[`engineering/isolated-worktree`](../isolated-worktree/SKILL.md).

## GitHub — reply in-thread (example)

```bash
gh api graphql -f query='mutation($id:ID!,$body:String!){
  addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$body}){
    comment{url}
  }
}' -f id='<thread-id>' -f body='Fixed in <sha>: <summary>. Leaving this thread open for you to resolve.'
```

List unresolved threads (paginate; filter `isResolved: false` client-side):

```bash
gh api graphql --paginate -f query='query($n:Int!,$endCursor:String){
  repository(owner:"<owner>",name:"<repo>"){
    pullRequest(number:$n){
      reviewThreads(first:50, after:$endCursor){
        pageInfo{ hasNextPage endCursor }
        nodes{ id isResolved path line }
      }
    }
  }
}' -F n=<pr-number>
```

## Guardrails

- Top-level PR comments are **not** a substitute for in-thread replies.
- Do not mark feedback handled in chat only.
- Do not edit the default-branch checkout.

## Related skills

- [`engineering/address-change-request-review`](../address-change-request-review/SKILL.md)
- [`engineering/submit-change-request`](../submit-change-request/SKILL.md)
- [`operations/pr-agent-wake`](operations/pr-agent-wake/SKILL.md)
- [`engineering/isolated-worktree`](../isolated-worktree/SKILL.md)
