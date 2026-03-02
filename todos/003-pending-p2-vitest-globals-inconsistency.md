---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, quality, testing]
dependencies: []
---

# Vitest `globals: true` inconsistent with explicit imports

## Problem Statement

`vitest.config.ts` enables `globals: true` (making `describe`, `it`, `expect` available without imports), but the placeholder test explicitly imports them from `vitest`. This is inconsistent. Additionally, if `globals: true` is kept, `"types": ["vitest/globals"]` must be added to tsconfig, otherwise TypeScript will red-line globals in files that don't import them.

## Findings

- **Source:** TypeScript reviewer + Architecture strategist
- **Files:** `vitest.config.ts`, `tests/unit/placeholder.test.ts`
- **Evidence:** Config has `globals: true`, test file has `import { describe, it, expect } from 'vitest'`

## Proposed Solutions

### Option A: Remove `globals: true`, keep explicit imports (Recommended)
- Remove `globals: true` from vitest.config.ts
- Keep explicit imports in test files
- **Pros:** Better for TypeScript, self-documenting, no extra tsconfig changes needed, aligns with "named exports only" philosophy
- **Cons:** Slightly more boilerplate per test file
- **Effort:** Small
- **Risk:** Low

### Option B: Keep `globals: true`, add types
- Add `"types": ["vitest/globals"]` to tsconfig.json
- Remove explicit imports from test files
- **Pros:** Less boilerplate
- **Cons:** Implicit dependencies, requires tsconfig change
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] Consistent pattern: either all test files import from vitest OR none do
- [ ] TypeScript does not error on test globals
- [ ] `npm run test` passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | |
