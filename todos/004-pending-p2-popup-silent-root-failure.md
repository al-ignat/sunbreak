---
status: complete
priority: p2
issue_id: "004"
tags: [code-review, quality]
dependencies: []
---

# Popup silently fails when root element is missing

## Problem Statement

`src/entrypoints/popup/main.tsx` checks for the `#app` element and silently does nothing if it's missing. In the popup HTML that we fully control, a missing root is a bug that should fail loudly, not silently.

## Findings

- **Source:** TypeScript reviewer
- **File:** `src/entrypoints/popup/main.tsx`
- **Evidence:** `if (root) { render(<App />, root); }` — silent no-op if root is null

## Proposed Solutions

### Option A: Throw on missing root (Recommended)
```typescript
const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');
render(<App />, root);
```
- **Pros:** Immediate feedback when something is wrong, aligns with explicit error philosophy
- **Cons:** None — this is our own HTML
- **Effort:** Small
- **Risk:** None

## Acceptance Criteria

- [ ] Missing `#app` throws an error instead of silently failing
- [ ] Popup still renders normally when `#app` exists

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | |
