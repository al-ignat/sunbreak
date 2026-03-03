---
title: "Phase 5 Dashboard Code Review: 14 Findings Fixed"
date: "2026-03-03"
category: "code-quality"
tags:
  - code-review
  - dashboard
  - preact
  - typescript
  - chrome-storage
  - race-conditions
  - deduplication
severity: "medium"
components:
  - src/content/orchestrator.ts
  - src/entrypoints/background.ts
  - src/entrypoints/dashboard/App.tsx
  - src/entrypoints/popup/App.tsx
  - src/storage/events.ts
  - src/storage/dashboard.ts
  - src/ui/dashboard/
  - src/ui/format.ts
symptoms: |
  Multi-category findings across 15 files: duplicated functions and UI components,
  inconsistent display logic, race conditions in chrome.storage writes, mixed
  async patterns, missing test coverage for key orchestrator behavior, no file
  size validation on imports, and blanket data refresh on any storage change.
root_cause: |
  Large feature PR (Phase 5, 29 files, +3172 lines) accumulated quality debt
  across multiple independent concerns. No shared component library was
  established before building 4 dashboard tabs that needed similar UI. Storage
  write pattern was fire-and-forget without serialization.
resolution: |
  6-agent parallel code review identified 14 findings (0 P1, 8 P2, 6 P3).
  All fixed in single refactor commit. Tests expanded from 338 to 355.
time_to_resolve: "~2 hours (review + fix + test)"
prevention: |
  Extract shared modules before duplicating. Serialize all chrome.storage writes.
  Use async/await consistently. Add tests for settings-dependent behavior paths.
---

# Phase 5 Dashboard Code Review: 14 Findings Fixed

## Problem Statement

PR #5 (`feat/dashboard`) added the full Phase 5 dashboard to the Sunbreak Chrome Extension: storage layer expansion, orchestrator bridge, popup UI, and a 5-tab dashboard page. A 6-agent parallel code review identified 14 findings across architecture, code quality, performance, and testing.

## Investigation

Review agents used:
- **kieran-typescript-reviewer** — type safety, modern patterns
- **security-sentinel** — security audit
- **code-simplicity-reviewer** — YAGNI, simplification
- **architecture-strategist** — structural patterns
- **agent-native-reviewer** — agent accessibility
- **learnings-researcher** — past solutions lookup

## Solution

### Architecture Fixes

**Orchestrator storage consolidation (Fix #1, #3, #6)**

`toEnabledDetectors` was duplicated in both `orchestrator.ts` and `dashboard.ts`. Three separate fetch functions loaded settings independently without default merging.

Fixed by importing from `dashboard.ts` and collapsing into a single `fetchAllSettings()`:

```typescript
async function fetchAllSettings(): Promise<void> {
  const [kw, ds, es] = await Promise.all([
    getKeywords(),
    getDetectionSettings(),  // already merges with DEFAULT_DETECTION_SETTINGS
    getExtensionSettings(),
  ]);
  cachedKeywords = [...kw];
  cachedDetectionSettings = ds;
  cachedExtensionSettings = es;
}
```

**Async/await standardization (Fix #4)**

`background.ts` mixed callback-style `chrome.storage.local.get(keys, callback)` with async code. Rewrote to consistent async/await with `initializeDefaults()`.

**Selective onChanged listener (Fix #9)**

Dashboard reloaded ALL data on any storage change. Changed to inspect `Object.keys(changes)` and only refresh affected data:

```typescript
const listener = (changes: Record<string, chrome.storage.StorageChange>): void => {
  const keys = Object.keys(changes);
  if (keys.includes('dailyStats') || keys.includes('flaggedEvents')) {
    void refreshStats(); void refreshEvents();
  }
  if (keys.includes('detectionSettings') || keys.includes('settings')) {
    void refreshSettings();
  }
  if (keys.includes('keywords')) { void refreshKeywords(); }
};
```

### Code Quality Fixes

**Shared format helpers (Fix #5)**

`toolLabel`, `toolColor`, `actionLabel`, `actionColor` were duplicated across 3 files with an inconsistency: `actionLabel('sent-anyway')` returned `'Sent'` in popup but `'Sent Anyway'` in ActivityLog.

Created `src/ui/format.ts` with Record-based lookups. Single source of truth.

**Shared ToggleButton and styles (Fix #10, #11)**

Duplicate `PeriodButton` and `FilterButton` components across BarChart and ActivityLog. Duplicate style constants across 4 files.

Extracted `src/ui/dashboard/ToggleButton.tsx` and `src/ui/dashboard/styles.ts`.

**SettingsPanel async handlers (Fix #12)**

Handlers used implicit void-returning pattern. Changed to proper `async function handleX(): Promise<void>` with `await`.

**File size guard (Fix #8)**

`KeywordManager.tsx` could read arbitrarily large files via `file.text()`. Added `MAX_IMPORT_SIZE = 512_000` check before reading.

### Concurrency Fix

**Write serialization queue (Fix #13)**

The most impactful fix. `logFlaggedEvent` and `incrementDailyStat` in `events.ts` did read-modify-write on `chrome.storage.local` without serialization. Concurrent calls (e.g., rapid prompt submissions) could clobber each other.

Added a serial write queue:

```typescript
let writeQueue: Promise<void> = Promise.resolve();

function enqueue(fn: () => Promise<void>): void {
  writeQueue = writeQueue.then(fn).catch(() => {
    // Storage errors must not crash the extension
  });
}

export function logFlaggedEvent(event: FlaggedEvent): void {
  enqueue(async () => {
    const data = await chrome.storage.local.get('flaggedEvents');
    const events = (data['flaggedEvents'] as FlaggedEvent[] | undefined) ?? [];
    events.push(event);
    await chrome.storage.local.set({ flaggedEvents: events });
    await doIncrementDailyStat(event.action, event.tool);
  });
}
```

### Testing Fixes

**Orchestrator tests (Fix #7)**

Added 17 new tests covering: extension disabled releases without classification, log-only mode logs but skips overlay, disabled detection categories are respected.

Key pattern for testing cached settings: mock `getExtensionSettings`/`getDetectionSettings` from dashboard, flush microtasks with `await new Promise(r => setTimeout(r, 0))` after `createOrchestrator()` so `fetchAllSettings` resolves.

**Test automation helpers (Fix #14)**

Added `clearFlaggedEvents()` and `resetToDefaults()` to `dashboard.ts`.

## Prevention Strategies

### Before Implementation

1. **Extract shared modules first** — before building multiple consumers of the same logic, create the shared module. Three files needing `toolLabel` = shared `format.ts` from day one.
2. **Define storage access patterns** — all writes through a serialized queue. All reads through typed getter functions. No direct `chrome.storage.local` calls in feature code.
3. **List must-test behaviors** — for every settings-dependent code path, add a test. "Extension disabled should release" is as important as "email detected should show overlay."

### During Implementation

- Search for existing functions before writing new ones (`grep -r "function toEnabledDetectors"`)
- Use exhaustive TypeScript switches with `assertNever` for action/state labels
- Validate all external input (file sizes, import data) before processing
- Keep `onChanged` listeners granular — inspect which keys changed

### Code Review Checklist

- [ ] No duplicated functions across files
- [ ] Display strings derived from single source of truth
- [ ] All chrome.storage writes go through serialized queue
- [ ] No callback-style async code (use async/await)
- [ ] Settings-dependent behavior paths have tests
- [ ] File/data imports have size and format validation
- [ ] Storage listeners are selective, not blanket

## Related Documents

- `docs/plans/2026-03-03-feat-phase5-dashboard-plan.md` — Phase 5 plan (lines 151-154 acknowledged race condition risk as "LOW severity, acceptable for v1")
- `docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md` — DRY principle lesson: "Extract duplicated DOM logic immediately"
- `docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md` — Preact component testing patterns
- `CLAUDE.md` lines 81-88 — "No direct chrome.storage calls outside src/storage/"
