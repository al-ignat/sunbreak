---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, quality, typescript]
dependencies: ["001"]
---

# ESLint does not lint test files

## Problem Statement

The ESLint `files` glob is `src/**/*.{ts,tsx}`, which excludes everything in `tests/`. Test files should be linted too — especially for `no-explicit-any` which tends to creep into test code first. This contradicts the project's strict typing philosophy.

## Findings

- **Source:** TypeScript reviewer + Architecture strategist (both flagged independently)
- **File:** `eslint.config.js`, line 6
- **Evidence:** `files: ['src/**/*.{ts,tsx}']` excludes `tests/`

## Proposed Solutions

### Option A: Widen the glob (Recommended)
- Change to `files: ['{src,tests}/**/*.{ts,tsx}']`
- **Pros:** Simple one-line fix, all code gets linted
- **Cons:** None
- **Effort:** Small
- **Risk:** Low — may surface new lint warnings in test setup

### Option B: Add separate test config block
- Add a second config object targeting `tests/**/*.{ts,tsx}` with potentially relaxed rules
- **Pros:** Can customize rules for test files separately
- **Cons:** More config to maintain
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] `tests/**/*.{ts,tsx}` files are linted
- [ ] `npm run lint` passes (update lint script if needed: `eslint src/ tests/`)
- [ ] No `any` types in test files go undetected

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | Two reviewers flagged independently |
