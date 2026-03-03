---
status: complete
priority: p2
issue_id: "012"
tags: [code-review, typescript, quality]
dependencies: []
---

# OverlayFinding.type and confidence typed as `string` instead of union types

## Problem Statement

`OverlayFinding` interface in `src/ui/overlay/types.ts` uses bare `string` for `type` and `confidence` fields. The project rule says "No `any`" and the same principle applies — bare `string` is effectively untyped. The classifier already defines `DetectorType` and `Confidence` union types that should be reused.

## Findings

- **Source:** kieran-typescript-reviewer
- **File:** `src/ui/overlay/types.ts` (lines 5-11)
- **Evidence:** `type: string` and `confidence: string` instead of `DetectorType` and `Confidence`

## Proposed Solutions

### Option A: Import types from classifier
**Pros:** Type-safe, catches typos at compile time
**Effort:** Small
**Risk:** Low

```typescript
import type { DetectorType, Confidence } from '../../classifier/types';

export interface OverlayFinding {
  readonly type: DetectorType;
  readonly confidence: Confidence;
  // ...rest unchanged
}
```

## Acceptance Criteria

- [ ] `OverlayFinding.type` uses `DetectorType` union
- [ ] `OverlayFinding.confidence` uses `Confidence` union
- [ ] TypeScript compiles without errors
