---
status: complete
priority: p3
issue_id: "008"
tags: [code-review, architecture]
dependencies: []
---

# Content script match patterns duplicated in two files

## Problem Statement

The AI tool URL patterns appear in both `wxt.config.ts` (as `host_permissions`) and `src/entrypoints/content.ts` (as `matches`). Adding a new AI tool requires changes in two places. Not blocking for Phase 1 (only 4 domains), but worth addressing when Phase 2 adds site adapters.

## Findings

- **Source:** TypeScript reviewer + Architecture strategist (both flagged)
- **Files:** `wxt.config.ts` lines 12-17, `src/entrypoints/content.ts` lines 2-7

## Proposed Solutions

### Option A: Extract to shared constant (Phase 2)
```typescript
// src/constants.ts
export const AI_TOOL_PATTERNS = [
  '*://chatgpt.com/*',
  '*://chat.openai.com/*',
  '*://claude.ai/*',
  '*://gemini.google.com/*',
] as const;
```
- **Note:** Verify WXT config can import from src/ (runs in Node context)
- **Effort:** Small
- **Risk:** Low

### Option B: Add cross-reference comment
- Comment in both files pointing to the other location
- **Effort:** Trivial
- **Risk:** None

## Acceptance Criteria

- [ ] Single source of truth for AI tool URL patterns, or clear cross-references

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | Defer to Phase 2 |
