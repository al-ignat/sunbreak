---
status: complete
priority: p1
issue_id: "011"
tags: [code-review, quality]
dependencies: []
---

# Version mismatch: package.json 0.1.0 vs wxt.config.ts 1.0.0

## Problem Statement

`package.json` says `"version": "0.1.0"` while `wxt.config.ts` manifest declares `version: '1.0.0'`. The Chrome Web Store will show 1.0.0 (correct), but npm tooling and CI scripts reading package.json will see 0.1.0.

## Findings

- **Source:** kieran-typescript-reviewer, architecture-strategist
- **Files:** `package.json` (line 3), `wxt.config.ts` (line 8)
- **Evidence:** Direct version string comparison

## Proposed Solutions

### Option A: Bump package.json to 1.0.0
**Pros:** Simple, immediate fix
**Cons:** Two places to update on future bumps
**Effort:** Trivial
**Risk:** None

### Option B: Have wxt.config.ts read version from package.json
**Pros:** Single source of truth
**Cons:** Adds import dependency
**Effort:** Small
**Risk:** Low

## Acceptance Criteria

- [ ] `package.json` version matches `wxt.config.ts` manifest version
- [ ] Built manifest.json shows correct version
