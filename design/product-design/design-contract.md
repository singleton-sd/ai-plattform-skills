# Design Contract

Pass this document unchanged (aside from filling fields) into
`product/draft-technical-tickets`.

```markdown
# Design Contract

## Feature
<name>

## User goal
<what the user must accomplish>

## Routes
- <path> — <purpose>

## Screens
- <screen name> — <purpose>

## Desktop
<layout / key behaviours>

## Tablet
<layout / key behaviours>

## Mobile
<layout / key behaviours>

## Components to reuse
- <component> — <where / why>

## Components to extend
- <component> — <what changes>

## New components
- <component> — <responsibility>

## Loading state
<behaviour>

## Empty state
<behaviour>

## Validation state
<behaviour>

## Error state
<behaviour>

## Success state
<behaviour>

## Permissions
<who can see / act>

## Accessibility
<keyboard, focus, labels, contrast, announcements>

## Interactions
- <interaction> — <result>

## API dependencies
- <endpoint or resource> — <read/write> — <known | assumed | unknown>
  (Only document APIs confirmed in the repo or by the user. Never invent.)

## Implementation notes
<constraints for engineering; no invented backend behaviour>

## Google Stitch project
<url or project id>

## Google Stitch screen references
- <screen name> — <url or id>
```
