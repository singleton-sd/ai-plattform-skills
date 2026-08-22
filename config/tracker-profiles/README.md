# Tracker profiles

Consumer repos declare how agents should track work via `.skills/profile`
(or infer from `git remote`).

## Host → engineering tracker (locked)

| Project host | Engineering work unit | Merge vehicle |
|--------------|----------------------|---------------|
| **GitHub** (`engineeringHost: "github"`) | GitHub Issue | PR with `Closes #N` |
| **GitLab** (`engineeringHost: "gitlab"`) | GitLab Issue | MR with closing keyword |

ClickUp is **not** the engineering tracker. Use ClickUp only for:

- product features the user describes
- optional **tracking** tickets when there is no feature yet (see `operations/create-tracking-ticket`)

## Files

| File | Purpose |
|------|---------|
| [`github.json`](github.json) | Defaults for GitHub-hosted app repos |
| [`gitlab.json`](gitlab.json) | Defaults for GitLab-hosted app repos |

## Consumer `.skills/profile` example

```json
{
  "engineeringHost": "github",
  "repo": "singleton-sd/poc-plattform-kit",
  "clickup": {
    "productFeaturesList": "901616397764",
    "trackingList": "901616397764"
  }
}
```

If `.skills/profile` is missing, infer `engineeringHost` from `git remote get-url origin`
(`github.com` → `github`, `gitlab.com` → `gitlab`).
