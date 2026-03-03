---
status: complete
priority: p1
issue_id: "010"
tags: [code-review, quality, architecture]
dependencies: []
---

# Duplicated CSS between WarningBanner.css and overlay-controller.ts inline string

## Problem Statement

The entire WarningBanner.css (~170 lines) is duplicated as a template literal inside `getOverlayStyles()` in overlay-controller.ts. Every CSS change must be applied in two places. The Phase 6 WCAG contrast fix proved this is already a maintenance burden — the fix had to be applied to both locations. This will inevitably drift.

## Findings

- **Source:** kieran-typescript-reviewer, code-simplicity-reviewer (both flagged independently)
- **Files:** `src/ui/overlay/WarningBanner.css`, `src/ui/overlay/overlay-controller.ts` (lines 158-329)
- **Evidence:** The WCAG fix changed `#FF9800` → `#E65100` in both files. Any future CSS change requires dual updates.

## Proposed Solutions

### Option A: Import CSS as string via Vite `?inline`
**Pros:** Single source of truth, keeps .css file for editor support, one-line change
**Cons:** None significant
**Effort:** Small
**Risk:** Low

```typescript
import overlayStyles from './WarningBanner.css?inline';

function getOverlayStyles(): string {
  return overlayStyles;
}
```

### Option B: Delete the .css file, keep only inline string
**Pros:** Eliminates one file entirely
**Cons:** Loses CSS syntax highlighting and editor support
**Effort:** Small
**Risk:** Low

## Acceptance Criteria

- [ ] Only one copy of the overlay CSS exists in the codebase
- [ ] WCAG contrast values (#E65100) are consistent
- [ ] Build succeeds and overlay renders correctly
- [ ] Unit tests pass
