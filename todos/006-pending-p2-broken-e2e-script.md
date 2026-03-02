---
status: complete
priority: p2
issue_id: "006"
tags: [code-review, quality]
dependencies: []
---

# `npm run test:e2e` script will fail — Playwright not installed

## Problem Statement

`package.json` has `"test:e2e": "playwright test"` but `@playwright/test` is not in devDependencies and there is no `playwright.config.ts`. Running the script fails. Having a broken npm script in a scaffold suggests a capability that doesn't exist.

## Findings

- **Source:** Architecture strategist
- **File:** `package.json`
- **Evidence:** `"test:e2e": "playwright test"` — Playwright not in dependencies

## Proposed Solutions

### Option A: Remove the script until E2E is set up (Recommended)
- Remove `"test:e2e"` from package.json
- Re-add when Playwright is actually installed in a future phase
- **Pros:** No broken scripts, no false promises
- **Cons:** Must remember to add back
- **Effort:** Small
- **Risk:** None

### Option B: Add Playwright as dev dependency now
- Install `@playwright/test` and create minimal config
- **Pros:** Script works
- **Cons:** Adds heavy dependency for no current use
- **Effort:** Medium
- **Risk:** Low

## Acceptance Criteria

- [ ] All npm scripts in package.json work when invoked
- [ ] No broken scripts that fail on invocation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | |
