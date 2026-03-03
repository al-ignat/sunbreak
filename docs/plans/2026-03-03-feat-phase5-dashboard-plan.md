---
title: "feat: Build Phase 5 personal dashboard with stats, settings, and activity log"
type: feat
status: completed
date: 2026-03-03
origin: docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md
---

# feat: Build Phase 5 Personal Dashboard with Stats, Settings, and Activity Log

## Overview

Build the personal dashboard layer: expand the storage wrapper, replace the placeholder popup with a stats-rich quick view, and create a full dashboard extension page with overview charts, activity log, detection settings, custom keyword management, and AI tool report cards. All data stays in `chrome.storage.local`. No network requests.

Phase 5 turns raw event data (logged by Phase 4's overlay) into actionable insight. It is the personal value proposition — the reason a user keeps the extension installed after the first week.

(see brainstorm: `docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md` — "Local-only storage: Only metadata stored (counts, categories, timestamps). Never prompt content." and "Design philosophy: Grammarly, not CrowdStrike. Employee-first.")

## Problem Statement / Motivation

Phases 1–4 built the interception and redaction pipeline. The overlay warns users and logs events to `chrome.storage.local`, but there is no way for the user to:

1. See their usage stats ("How often does my extension catch something?")
2. Review flagged events ("What happened last Tuesday?")
3. Toggle detection categories ("I don't need IP address detection")
4. Manage custom keywords ("Add 'Project Nightingale' to my watch list")
5. Understand the AI tools' privacy postures ("Does ChatGPT train on my data?")

The popup is a placeholder with hardcoded text. The storage layer is minimal (only `logFlaggedEvent` and `logCleanPrompt`). The dashboard page doesn't exist.

## Proposed Solution

Three implementation steps matching the founding guide's session structure (Sessions 11–12):

### Step 1: Storage Expansion + Background Init + Orchestrator Bridge

Expand `src/storage/` to cover the full `StoredData` interface from the SPEC. Add default initialization in the background service worker. Bridge `detectionSettings` to the orchestrator so toggles actually affect classification.

### Step 2: Extension Popup UI

Replace the placeholder popup with a functional quick view: weekly stats summary, last 5 flagged events, detection category toggles, and a link to the full dashboard.

### Step 3: Full Dashboard Page

Create a new WXT entrypoint for the dashboard (`src/entrypoints/dashboard/`). Horizontal tab navigation with 5 sections: Overview (hand-rolled SVG bar charts), Activity Log (filterable table), Detection Settings, Custom Keywords (CRUD + import/export), and AI Tool Report Cards.

## Technical Considerations

### Storage Schema Expansion

The existing `DailyStats` needs a `byTool` field for per-tool breakdowns. Two new types are needed: `ExtensionSettings` and `DetectionSettings`. The keyword schema stays as `string[]` (simpler, no migration needed).

The existing `logCleanPrompt()` and `incrementDailyStat()` must accept a `tool` parameter. The orchestrator already has `adapterName` at both call sites (`src/content/orchestrator.ts:104,118`), so this is a small wiring change.

**Updated `DailyStats`:**
```typescript
interface DailyStats {
  readonly totalInteractions: number;
  readonly flaggedCount: number;
  readonly redactedCount: number;
  readonly sentAnywayCount: number;
  readonly cancelledCount: number;
  readonly editedCount: number;
  readonly byTool: Record<string, number>;  // NEW: { chatgpt: 23, claude: 15 }
}
```

**New types:**
```typescript
interface ExtensionSettings {
  readonly enabled: boolean;
  readonly interventionMode: 'warn' | 'log-only';
}

type DetectionSettings = Record<FindingType, boolean>;  // all true by default
```

**Full `StoredData` interface (for reference, not exposed directly):**
```typescript
interface StoredData {
  dailyStats: Record<string, DailyStats>;     // YYYY-MM-DD keyed
  flaggedEvents: FlaggedEvent[];               // max 1000, FIFO
  keywords: string[];                          // plain strings
  detectionSettings: DetectionSettings;        // per-category toggles
  settings: ExtensionSettings;                 // global on/off + mode
}
```

### 90-Day Stat Pruning

Daily stats older than 90 days must be auto-pruned. Runs on `chrome.runtime.onStartup` (browser launch) and `chrome.runtime.onInstalled` (install/update) inside the background service worker. This avoids adding latency to prompt handling.

```typescript
function pruneOldStats(maxAgeDays = 90): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  // Remove all keys < cutoffKey from dailyStats
}
```

### Orchestrator Bridge for Detection Settings

The orchestrator currently passes no `enabledDetectors` to `classify()` (`src/content/orchestrator.ts:109`), meaning all detectors always run. Phase 5 adds:

1. Fetch `detectionSettings` from storage at orchestrator init (alongside keywords)
2. Listen for `detectionSettings` changes via `chrome.storage.onChanged`
3. Convert `Record<FindingType, boolean>` → `Set<FindingType>` (only true entries)
4. Pass as `enabledDetectors` to `classify()`

The classifier engine already supports this via `ClassifyOptions.enabledDetectors` (`src/classifier/types.ts:54`).

### Orchestrator Bridge for Extension Settings

The orchestrator needs to respect `settings.enabled` and `settings.interventionMode`:

- `enabled: false` → skip classification entirely, return `'release'` immediately
- `interventionMode: 'log-only'` → classify and log events, but skip the overlay — always return `'release'`

### Popup Architecture

The popup (400px × up to 500px) reads storage once on mount, computes aggregates, renders. It auto-closes when the user clicks away, so live updates are unnecessary.

**Compliance rate formula:** `(totalInteractions - sentAnywayCount) / totalInteractions * 100`. This measures "percentage of prompts where the user did not knowingly send flagged content." Shows "—" when `totalInteractions` is 0.

**"This week"** = rolling 7 days from today (inclusive). Simpler than calendar weeks, no locale sensitivity.

### Dashboard Architecture

A separate WXT entrypoint at `src/entrypoints/dashboard/`. Renders as `chrome-extension://[id]/dashboard.html`. Horizontal tab navigation (Preact conditional rendering, no router needed). Listens to `chrome.storage.onChanged` for live updates since the tab stays open.

**Charts:** Hand-rolled SVG. Simple bar charts with `<rect>` and `<text>` elements. Two views: "Last 7 Days" and "Last 30 Days." Y-axis: interaction count. X-axis: date labels. Stacked bars for flagged vs. clean. Zero dependencies.

**Activity Log:** Render all rows (max 1000). Filter by date range (preset buttons: "Last 7 days", "Last 30 days", "All time") and by AI tool (dropdown). No pagination needed — 1000 metadata-only rows are lightweight.

**Keywords:** CRUD with `string[]`. Import via `FileReader` API (client-side, no network). Export via blob URL + invisible anchor click (no `downloads` permission needed). Union merge on import — skip case-insensitive duplicates, show count. Max 500 keywords, max 100 chars each.

**Report Cards:** Static hardcoded content. Curated information about ChatGPT, Claude, and Gemini data policies. Read-only, no interaction beyond scrolling. Content must be researched and written as part of implementation.

### Empty States

First-install experience when all data is zero:
- Popup: "No activity yet. Start using AI tools and your stats will appear here."
- Dashboard charts: "No data yet" placeholder instead of flat-zero bars
- Activity log: "No flagged events yet."
- Keywords: "No custom keywords. Add words or phrases you want to monitor."

## System-Wide Impact

- **Interaction graph:** Popup and dashboard read from `chrome.storage.local`. Content script writes via storage wrapper. Background script initializes defaults and prunes on startup. `chrome.storage.onChanged` propagates changes from dashboard toggles → content script orchestrator.
- **Error propagation:** All storage operations are fire-and-forget (errors caught silently per existing convention). Popup/dashboard show stale data if storage fails — acceptable for v1.
- **State lifecycle risks:** `incrementDailyStat` has a read-modify-write race under rapid submission. LOW severity — users rarely submit two prompts within 50ms. Acceptable for v1.
- **API surface parity:** Detection toggles in popup and dashboard must write to the same `detectionSettings` key. Both must show the same state.
- **Integration test scenarios:** (1) Toggle email detection OFF in popup → submit prompt with email on ChatGPT → no overlay should appear. (2) Submit prompt → check popup shows updated count. (3) Add keyword in dashboard → submit prompt with that keyword → overlay appears.

## Acceptance Criteria

### Functional — Storage

- [x] `DailyStats` includes `byTool: Record<string, number>` field — `src/storage/types.ts`
- [x] `ExtensionSettings` type defined — `src/storage/types.ts`
- [x] `DetectionSettings` type defined — `src/storage/types.ts`
- [x] `logCleanPrompt(tool)` accepts and stores tool parameter — `src/storage/events.ts`
- [x] `incrementDailyStat(action, tool)` increments `byTool` counter — `src/storage/events.ts`
- [x] Storage wrapper functions: `getWeeklyStats()`, `getFlaggedEvents(filter)`, `getDetectionSettings()`, `setDetectionSettings()`, `getKeywords()`, `addKeyword()`, `removeKeyword()`, `importKeywords()`, `exportKeywords()`, `getExtensionSettings()`, `setExtensionSettings()`, `pruneOldStats()` — `src/storage/dashboard.ts`
- [x] Background script initializes default `detectionSettings` (all true), `settings` ({ enabled: true, interventionMode: 'warn' }), and empty `keywords` on install — `src/entrypoints/background.ts`
- [x] Background script runs `pruneOldStats(90)` on startup and install — `src/entrypoints/background.ts`
- [x] Flagged events capped at 1000 (FIFO) — already implemented, verify preserved

### Functional — Orchestrator Bridge

- [x] Orchestrator fetches `detectionSettings` on init, listens for changes — `src/content/orchestrator.ts`
- [x] Orchestrator converts `DetectionSettings` → `Set<FindingType>` and passes to `classify()` as `enabledDetectors`
- [x] Orchestrator fetches `settings` on init, listens for changes
- [x] When `settings.enabled === false`, orchestrator returns `'release'` without classifying
- [x] When `settings.interventionMode === 'log-only'`, orchestrator classifies and logs but skips overlay
- [x] `logCleanPrompt()` calls updated to pass `adapterName` — `src/content/orchestrator.ts:118`

### Functional — Popup

- [x] Popup width updated to 400px (from 320px) — `src/entrypoints/popup/index.html`
- [x] Header: "Secure BYOAI" + settings gear icon (navigates to dashboard settings tab)
- [x] Stats summary: "This week: N AI interactions, N flagged, N redacted. Compliance rate: X%"
- [x] Recent activity: last 5 flagged events showing date, tool icon, categories, action taken
- [x] Quick settings: ON/OFF toggle per detection category, writes to `detectionSettings`
- [x] "View full dashboard" link opens dashboard page in new tab
- [x] Empty state shown on first install (no data yet)
- [x] Reads storage once on mount (no live updates needed)

### Functional — Dashboard

- [x] New WXT entrypoint: `src/entrypoints/dashboard/` — `index.html`, `main.tsx`, `App.tsx`
- [x] Horizontal tab navigation: Overview | Activity Log | Settings | Keywords | Report Cards
- [x] **Overview tab:** Hand-rolled SVG bar charts, toggle between "Last 7 Days" / "Last 30 Days", stacked bars (flagged vs. clean), per-tool breakdown
- [x] **Activity Log tab:** Scrollable table of flagged events, columns: Date/time, Tool, Categories, Action. Filter by preset date range (7d / 30d / All) and by tool (dropdown)
- [x] **Settings tab:** ON/OFF toggle per detection category with description. Extension enabled/disabled toggle. Intervention mode toggle (warn / log-only)
- [x] **Keywords tab:** Add keyword input + button, keyword list with delete buttons, import from .txt file (union merge, skip duplicates), export as .txt file (blob URL download). Max 500 keywords, max 100 chars each. Validation: reject empty, reject duplicates
- [x] **Report Cards tab:** Static curated content for ChatGPT, Claude, Gemini — data retention, training usage, privacy modes. Note: "Information current as of [date]. Check provider websites for latest policies."
- [x] Dashboard listens to `chrome.storage.onChanged` for live updates
- [x] Empty states for all sections

### Non-Functional

- [x] All `chrome.storage` calls go through `src/storage/` — no direct calls in UI components
- [x] No `any` types. No `require()`. Named exports only (except Preact default exports)
- [x] Zero network requests from dashboard/popup (verify with DevTools)
- [x] Popup renders within 100ms of opening
- [x] Dashboard tab loads within 200ms
- [x] SVG charts render without jank
- [x] WCAG AA: keyboard navigable, focus indicators, sufficient contrast, screen-reader-friendly chart alternatives (visually hidden data table alongside SVG)

### Testing

- [x] Unit tests for all new storage wrapper functions — `tests/unit/storage/dashboard.test.ts`
- [x] Unit tests for `pruneOldStats` — handles empty stats, prunes correctly, preserves recent
- [x] Unit tests for updated `incrementDailyStat` — verifies `byTool` field is populated
- [x] Unit tests for `logCleanPrompt(tool)` — verifies tool parameter flows through
- [x] Unit tests for popup component — renders stats, toggles fire, empty state shown
- [x] Unit tests for dashboard tabs — each tab renders, navigation works
- [x] Unit tests for SVG chart component — renders bars from data, handles empty data
- [x] Unit tests for activity log — filters work, renders events correctly
- [x] Unit tests for keyword CRUD — add, remove, import (dedup), export, validation
- [x] Unit tests for orchestrator bridge — detectionSettings toggle disables detectors, enabled toggle skips classification, log-only mode skips overlay
- [x] Existing Phase 3 and Phase 4 test suites still pass (no regressions)

## File Structure

```
src/
  storage/
    types.ts              # MODIFIED: add ExtensionSettings, DetectionSettings, expand DailyStats
    events.ts             # MODIFIED: logCleanPrompt(tool), incrementDailyStat(action, tool)
    dashboard.ts          # NEW: full storage wrapper (get/set for all StoredData fields)
  content/
    orchestrator.ts       # MODIFIED: bridge detectionSettings + settings to classify/overlay
  entrypoints/
    background.ts         # MODIFIED: init defaults on install, prune on startup
    popup/
      index.html          # MODIFIED: width 400px
      App.tsx             # REWRITTEN: stats + recent activity + toggles + dashboard link
      main.tsx            # UNCHANGED
    dashboard/            # NEW: WXT entrypoint
      index.html          # Dashboard page HTML
      main.tsx            # Renders App into #app
      App.tsx             # Tab container, storage listener
  ui/
    dashboard/            # NEW: shared dashboard components
      StatsCard.tsx       # Weekly stats summary (reused in popup and dashboard)
      BarChart.tsx        # Hand-rolled SVG bar chart
      ActivityLog.tsx     # Flagged events table with filters
      DetectionToggles.tsx # ON/OFF toggles for detection categories
      KeywordManager.tsx  # CRUD + import/export for custom keywords
      ReportCards.tsx     # Static AI tool policy content
      TabNav.tsx          # Horizontal tab navigation
tests/
  unit/
    storage/
      dashboard.test.ts   # NEW: all storage wrapper functions
    ui/
      dashboard/
        BarChart.test.tsx  # NEW: chart rendering
        ActivityLog.test.tsx # NEW: filtering, rendering
        KeywordManager.test.tsx # NEW: CRUD, import/export, validation
    content/
      orchestrator.test.ts # MODIFIED: add tests for settings bridge
```

## Design Decisions

### D1: Popup reads once, dashboard listens live

The popup auto-closes when the user clicks away — live updates add complexity for no benefit. The dashboard tab stays open, so it listens to `chrome.storage.onChanged` to reflect real-time activity without requiring a refresh.

### D2: Hand-rolled SVG charts

Zero dependencies. The extension's philosophy is lightweight (~3KB Preact is the only runtime dependency). Simple bar charts with `<rect>` and `<text>` elements are straightforward to build and test. A hidden `<table>` provides the same data for screen readers (WCAG AA).

### D3: Keywords stay as `string[]`

The SPEC suggests showing "when each keyword was added," but adding metadata objects requires: a schema migration, updating the orchestrator's keyword cache, updating the keyword matcher to extract `.value`, and adding backward compatibility. The added complexity is not worth it for v1. Plain strings work with all existing code paths.

### D4: Preset date filters, not a date picker

Building a custom date picker component is a non-trivial UI task. Preset buttons ("Last 7 days", "Last 30 days", "All time") cover the common use cases and are trivial to implement. A custom range picker can be added in Phase 6 polish if needed.

### D5: Detection toggles write to storage, orchestrator reads

Toggles in the popup and dashboard both write to the single `detectionSettings` key in `chrome.storage.local`. The orchestrator reads this key and converts it to `enabledDetectors: Set<FindingType>`. This keeps the UI components decoupled from the content script — they never communicate directly.

### D6: Blob URL export (no downloads permission)

Using `URL.createObjectURL()` with an invisible `<a download="...">` avoids adding the `downloads` permission to the manifest. Users click Export → browser's native download dialog appears → file saves. No permission prompt, no manifest change.

### D7: `interventionMode: 'log-only'` in orchestrator

When the user switches to log-only mode, the orchestrator still runs classification and logs events (for stats), but skips the overlay. This lets power users monitor their behavior without being interrupted, while still building up their dashboard data.

## Dependencies & Risks

### Dependencies

- Phase 4 overlay + orchestrator (completed): overlay controller, storage events layer
- Phase 3 classification engine (completed): `classify()`, `ClassifyOptions.enabledDetectors`
- WXT entrypoint system: auto-discovers `src/entrypoints/dashboard/` as a new page
- `chrome.storage.local` API: well-supported, stable

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `chrome.storage.local` quota (5MB default) | Stats accumulate beyond quota | 90-day pruning + 1000 event cap. At ~200B/day + ~500B/event, worst case is ~36KB for stats + ~500KB for events. Well under 5MB. |
| `incrementDailyStat` race condition under rapid submission | Stats miss a count | LOW severity — rare in practice. Acceptable for v1. Could add a write queue in Phase 6. |
| AI tools update privacy policies, report cards become stale | User sees outdated info | Report cards include "current as of [date]" disclaimer. Updated in extension releases. |
| Popup 400px width may feel cramped for stats + toggles | Poor readability | Use compact typography and collapsible toggle section. Test at 400px early. |
| Dashboard tab accumulates `onChanged` listeners if opened multiple times | Memory leak | Cleanup listener on unmount in Preact's `useEffect` cleanup. |

## Success Metrics

- Popup loads and renders stats within 100ms of click
- Dashboard page loads within 200ms
- Detection toggles take effect on next prompt submission (<1s propagation)
- Keyword add/remove reflects immediately in the dashboard list and in classification
- 90-day pruning runs on every browser launch without user-visible impact
- All three AI tools still work correctly with the expanded storage and orchestrator changes
- Chart rendering is smooth with 30 days of data (no jank)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md](docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md) — Key decisions carried forward: "Local-only storage: metadata only", "Zero UI when clean", "Grammarly-like UX"

### Internal References

- Full dashboard spec: `docs/founding/founding-SPEC.md` Section 4 (lines 302-391)
- Phase plan checklist: `docs/founding/founding-PLAN.md` Phase 5 (lines 42-49)
- Session prompts: `docs/founding/founding-03-implementation-guide.md` Sessions 11-12 (line 520-524)
- Phase 4 plan (overlay UI): `docs/plans/2026-03-03-feat-phase4-overlay-ui-plan.md`
- Existing storage types: `src/storage/types.ts`
- Existing storage events: `src/storage/events.ts`
- Current popup: `src/entrypoints/popup/App.tsx`
- Orchestrator: `src/content/orchestrator.ts`
- Classifier options: `src/classifier/types.ts:50-55` (`ClassifyOptions.enabledDetectors`)
- Background script: `src/entrypoints/background.ts`

### External References

- WXT entrypoints docs: https://wxt.dev/guide/essentials/entrypoints.html
- `chrome.storage.local` API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Preact docs: https://preactjs.com/

### Related Work

- Phase 1 PR: scaffolding
- Phase 2 PR: #2 (DOM observation)
- Phase 3 PR: #3 (classification engine)
- Phase 4: overlay UI (latest on main)
