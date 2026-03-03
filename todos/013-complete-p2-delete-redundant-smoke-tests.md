---
status: complete
priority: p2
issue_id: "013"
tags: [code-review, quality, testing]
dependencies: []
---

# Delete redundant smoke.spec.ts — tests duplicated by popup/dashboard specs

## Problem Statement

The 3 smoke tests are strictly weaker duplicates of existing tests:
- "extension service worker loads" — implicitly tested by every E2E test via the `extensionId` fixture
- "popup page loads" — weaker than popup.spec.ts "renders header with extension name"
- "dashboard page loads" — weaker than dashboard.spec.ts "renders header"

## Findings

- **Source:** code-simplicity-reviewer
- **File:** `tests/e2e/smoke.spec.ts` (17 lines)
- **Evidence:** All 3 assertions are subsets of existing popup.spec.ts and dashboard.spec.ts assertions

## Proposed Solutions

Delete `tests/e2e/smoke.spec.ts` entirely. Zero coverage loss.

## Acceptance Criteria

- [ ] `tests/e2e/smoke.spec.ts` deleted
- [ ] All remaining E2E tests still pass
