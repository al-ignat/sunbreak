---
status: pending
priority: p3
issue_id: "017"
tags: [code-review, quality, testing]
dependencies: []
---

# E2E test navigation repetition — extract to beforeEach

## Problem Statement

Every popup test repeats `page.goto(...)` + `Loading...` wait (5 occurrences). Every dashboard test repeats `page.goto(...)` (9 occurrences). A `beforeEach` would reduce boilerplate.

## Findings

- **Source:** kieran-typescript-reviewer, architecture-strategist, code-simplicity-reviewer
- **Files:** `tests/e2e/popup.spec.ts`, `tests/e2e/dashboard.spec.ts`

## Proposed Solutions

Extract repeated navigation to `test.beforeEach` within each describe block. ~15 lines saved.

Note: Multiple reviewers noted this is acceptable for E2E tests where self-containment is valued. Low priority.

## Acceptance Criteria

- [ ] Popup tests use beforeEach for navigation
- [ ] Dashboard tests use beforeEach for navigation
- [ ] All E2E tests still pass
