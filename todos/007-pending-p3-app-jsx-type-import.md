---
status: complete
priority: p3
issue_id: "007"
tags: [code-review, typescript]
dependencies: []
---

# App.tsx uses implicit `preact.JSX.Element` namespace

## Problem Statement

`App.tsx` uses `preact.JSX.Element` as return type without importing `preact` as a value or type. This works via the global namespace from JSX config but is implicit.

## Findings

- **Source:** TypeScript reviewer
- **File:** `src/entrypoints/popup/App.tsx`, line 3

## Proposed Solutions

### Option A: Explicit import
```typescript
import type { JSX } from 'preact';
export default function App(): JSX.Element {
```
- **Effort:** Small
- **Risk:** None

### Option B: Let TypeScript infer return type
- Remove return type annotation entirely (ESLint rule is `warn` not `error`)
- **Effort:** Small
- **Risk:** None

## Acceptance Criteria

- [ ] Return type is either explicitly imported or intentionally inferred

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | |
