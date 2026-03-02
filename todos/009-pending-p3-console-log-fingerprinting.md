---
status: complete
priority: p3
issue_id: "009"
tags: [code-review, security]
dependencies: []
---

# console.log reveals extension presence on host pages

## Problem Statement

`content.ts` logs "BYOAI loaded" and `background.ts` logs "Secure BYOAI installed" to the console. Any page JavaScript can detect the extension's presence via console output. For a security tool, this is an information leak — though low severity since content script console is isolated world in MV3.

## Findings

- **Source:** Security sentinel
- **Files:** `src/entrypoints/content.ts`, `src/entrypoints/background.ts`

## Proposed Solutions

### Option A: Gate behind debug flag (Phase 2+)
- Only log when a debug setting is enabled in storage
- **Effort:** Small (after storage wrapper exists)
- **Risk:** None

### Option B: Remove before production
- Remove console.log calls when real functionality replaces them
- **Effort:** Trivial
- **Risk:** None

## Acceptance Criteria

- [ ] Production builds do not leak extension presence via console

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | Will be naturally resolved when Phase 2 replaces stub code |
