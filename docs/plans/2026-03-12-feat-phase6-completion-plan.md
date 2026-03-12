---
title: "feat: Phase 6 completion — capability flags, cross-tool live testing, stability"
type: feat
status: active
date: 2026-03-12
---

# feat: Phase 6 Completion

## Overview

Three workstreams to finish Phase 6 and reach v1 readiness:

- **6a** — Adapter capability flags: declare what each adapter can reliably do
- **6b** — Cross-tool live testing: validate the full flow on ChatGPT, Claude, Gemini
- **6c** — 30-minute stability test: long-running verification per host

The workstreams are sequential: 6a defines the flags, 6b populates them with reality, 6c proves stability.

## Problem Statement

Phases 1-5 built and unit-tested every component (681 tests). The send-button anchor feature added per-site button discovery. But:

- **All adapters are treated identically.** `setParagraphText()` uses innerHTML which may silently fail on ProseMirror/Quill. There is no way to express "this adapter cannot reliably write text back."
- **No live validation.** Selectors, setText sync, and send-button click have never been tested on live AI tools.
- **No stability data.** Widget re-attachment, observer cleanup, and memory behavior over 30 minutes are unverified.

The Grammarly review (`docs/research/2026-03-12-grammarly-final-review.md`) identified capability flags as Priority 1 and the biggest correctness concern.

## Proposed Solution

### 6a: Adapter Capability Flags

Add a `capabilities` object to `SiteAdapter` with boolean flags that the orchestrator and widget controller read to branch behavior.

**Flags:**

| Flag | Type | Default | Purpose |
|------|------|---------|---------|
| `reliableSetText` | `boolean` | `true` | Can setText safely sync with the editor framework? |
| `sendButtonAnchor` | `boolean` | `true` | Can the adapter reliably locate a send/action button? |
| `pageContextBridge` | `boolean` | `false` | Will the adapter eventually need main-world script injection? |

**Design decisions:**

- **Nested `capabilities` object**, not top-level booleans. Keeps the adapter interface clean as flags grow.
- **Merge `supportsComposerActionAnchor` into `sendButtonAnchor`.** The code already conflates send button and composer action button via `findBestComposerButton()`. One flag is sufficient.
- **`pageContextBridge` is declarative-only this phase.** No bridge implementation. The flag documents which adapters will eventually need it. Implementation is post-v1 (see `docs/roadmap.md`).
- **`widgetAnchor` stays separate.** It is positioning config (`{ gapX: number }`), not a capability flag.

**Behavior when `reliableSetText` is `false`:**

- Widget operates in **detection-only mode**: finds PII, shows the panel, but no Fix/FixAll buttons.
- `handleFix()` and `handleFixAll()` become no-ops (guard on capability flag).
- MaskingMap is still created — clipboard restore works for text the user manually redacted.
- Toast still shows when submission is blocked, but only offers "Send Anyway" (no "Fix All" option).

**Implementation:**

1. Add `AdapterCapabilities` type to `src/types/adapter.ts`
2. Add `readonly capabilities?: AdapterCapabilities` to `SiteAdapter`
3. Set initial values in all three adapters (all `true` for now — 6b updates these)
4. Read `reliableSetText` in widget-controller to conditionally render Fix buttons
5. Read `reliableSetText` in orchestrator to skip masking flow when false
6. Add `handleFix` try/catch with user feedback on failure
7. Unit tests for detection-only mode (widget without Fix/FixAll)

### 6b: Cross-Tool Live Testing

Manual live testing on all three AI tools with a structured protocol.

**Test matrix (per host):**

| Test | What to verify | Pass criteria |
|------|---------------|---------------|
| T1: Selector validity | `findInput()` returns a connected element | Non-null, `isConnected === true` |
| T2: getText accuracy | `getText(input)` matches visible text | Exact match |
| T3: setText sync | After `setParagraphText()`, `getText()` returns redacted text | Match |
| T4: setText framework sync | After setText + submit, Network tab shows redacted text | Redacted text in request payload |
| T5: Send button found | `findSendButton()` returns the correct button | Visual match |
| T6: Button click works | `sendButton.click()` triggers submission | Message appears in chat |
| T7: Widget positioning | Widget appears to the left of send button | Visual check |
| T8: SPA navigation | Navigate to new chat, widget re-attaches | Widget appears on new input |
| T9: Widget visibility | Widget hidden when no findings, visible when PII typed | Correct show/hide |
| T10: Toast flow | Type PII, press Enter, toast appears, "Send Anyway" releases | Full flow completes |

**setText verification method:**

1. Type text containing an email address
2. Open DevTools Network tab, filter to the AI tool's API endpoint
3. Click Fix in the Sunbreak widget
4. Verify `getText()` returns the redacted text (console check)
5. Click Send
6. Inspect the request payload in Network tab
7. If payload contains the original email, `reliableSetText = false` for that host

**Button states to test (ChatGPT):**

- Empty prompt: speech button visible, send hidden
- Non-empty prompt: send button visible
- Generating response: stop button visible
- Verify the scoring system picks the right button in each state

**Recording results:**

Create `docs/testing/2026-03-XX-live-testing-results.md` with pass/fail per host per test. Update adapter `capabilities` flags to match results.

### 6c: 30-Minute Stability Test

Structured protocol per host, run after 6b passes.

**Protocol (30 minutes per host):**

| Minutes | Actions | What to check |
|---------|---------|--------------|
| 0-5 | Type and submit 5 prompts: 2 with PII (email, SSN), 3 clean | Detection works, clean prompts pass through, widget shows/hides correctly |
| 5-10 | Navigate between 3 different conversations | Widget unmounts and remounts, findings state clears, no stale findings |
| 10-15 | Leave tab idle, check DevTools Memory tab | Heap snapshot baseline. No growing detached DOM nodes |
| 15-20 | Resize browser window. Scroll. Open/close widget panel 5 times | Widget repositions correctly, no visual glitches, panel opens/closes cleanly |
| 20-25 | Rapid input: paste 500-char text with PII, clear, paste again, repeat 5x | Scanner debounce works, no duplicate findings, widget updates correctly |
| 25-30 | Navigate to new conversation, submit prompt with PII, verify full flow | Re-attachment works after extended session. Take final memory snapshot |

**Pass criteria:**

- Zero JavaScript errors in console
- Heap growth < 5 MB over 30 minutes (extension contribution)
- No detached DOM nodes accumulating (check via DevTools > Memory > Heap snapshot > "Detached" filter)
- Widget position correct after every re-attachment
- No stale findings from previous conversations

**Observer leak check:**

- After 5+ mount/unmount cycles, verify `ResizeObserver` and `MutationObserver` counts are stable (not growing)
- The `prevUnmount` closure chain in `widget-controller.ts:501-506` should not grow — each mount replaces the previous unmount cleanly

## Technical Approach

### Architecture: Capability flag integration

```
SiteAdapter
  ├── capabilities.reliableSetText ──→ orchestrator (skip masking flow)
  │                                  └→ widget-controller (hide Fix/FixAll)
  ├── capabilities.sendButtonAnchor ──→ widget-controller (anchor strategy)
  └── capabilities.pageContextBridge ──→ (declarative only, no runtime effect)
```

The orchestrator is the integration point. It already receives the adapter and creates the widget controller. The capability flags flow through:

1. `createOrchestrator()` reads `adapter.capabilities?.reliableSetText`
2. Passes a `maskingEnabled` flag (or omits `maskingMap`) to `createWidgetController()`
3. Widget controller conditionally renders Fix/FixAll buttons based on this flag

### Implementation Phases

#### Phase A: Capability Flag Infrastructure (6a)

**Task A1: Define AdapterCapabilities type**

File: `src/types/adapter.ts`

```typescript
export interface AdapterCapabilities {
  /** Can setText safely sync with the editor framework (ProseMirror/Quill)? */
  readonly reliableSetText: boolean;
  /** Can the adapter reliably locate a send/action button for widget anchoring? */
  readonly sendButtonAnchor: boolean;
  /** Will this adapter eventually need page-world script injection? Declarative only. */
  readonly pageContextBridge: boolean;
}
```

Add to `SiteAdapter`:
```typescript
readonly capabilities?: AdapterCapabilities;
```

Default behavior when `capabilities` is undefined: all capabilities assumed `true` (backward compatible).

**Task A2: Set initial capabilities in adapters**

All three adapters start with all flags `true`. 6b updates based on live testing.

Files: `chatgpt.ts`, `claude.ts`, `gemini.ts`

```typescript
capabilities: {
  reliableSetText: true,
  sendButtonAnchor: true,
  pageContextBridge: false,
},
```

**Task A3: Wire capability flags into widget-controller**

File: `src/ui/widget/widget-controller.ts`

- Add `maskingAllowed` parameter (derived from `adapter.capabilities?.reliableSetText !== false`)
- Guard `handleFix()` and `handleFixAll()` with `if (!maskingAllowed) return`
- Pass `maskingAllowed` to Widget component to conditionally render Fix/FixAll buttons
- Wrap `adapter.setText()` in try/catch — on failure, log error and do not mark finding as fixed

**Task A4: Wire capability flags into orchestrator**

File: `src/content/orchestrator.ts`

- Read `adapter.capabilities?.reliableSetText`
- When `false`: still create `maskingMap` (for clipboard restore) but widget controller gets `maskingAllowed: false`

**Task A5: Widget detection-only mode**

File: `src/ui/widget/Widget.tsx` (and related)

- When `maskingAllowed` is false:
  - Finding cards show PII type and value but no Fix button
  - Panel header shows no "Fix All" button
  - Badge still shows active finding count
  - Toast shows "Send Anyway" only (no "Fix All & Send")

**Task A6: Unit tests for capability flags**

Files: `tests/unit/content/orchestrator.test.ts`, `tests/unit/ui/widget/widget-controller.test.ts`

Test cases:
- Adapter with `reliableSetText: false` — Fix/FixAll are no-ops
- Adapter with `reliableSetText: false` — widget renders in detection-only mode
- Adapter with `reliableSetText: true` — existing behavior unchanged
- Adapter with no `capabilities` — defaults to all-true (backward compatible)
- `handleFix()` with setText that throws — finding stays active, user gets feedback

**Task A7: Update mock adapters in tests**

File: `tests/unit/content/orchestrator.test.ts` (and others using `createMockAdapter`)

Add `capabilities` to `createMockAdapter()`:
```typescript
capabilities: {
  reliableSetText: true,
  sendButtonAnchor: true,
  pageContextBridge: false,
},
```

#### Phase B: Cross-Tool Live Testing (6b)

**Task B1: Prepare test environment**

- Build extension: `npm run build`
- Load `.output/chrome-mv3/` in Chrome with DevTools Network tab open
- Log in to ChatGPT, Claude, and Gemini in separate tabs

**Task B2: Run test matrix on ChatGPT**

Execute all 10 tests (T1-T10) from the test matrix above. Record results.

Pay special attention to:
- ChatGPT button scoring: test all three button states (empty/non-empty/generating)
- setText + ProseMirror sync: does `getText()` return redacted text after `setParagraphText()`?
- Network payload: does the submitted text match what's visible in the editor?

**Task B3: Run test matrix on Claude**

Execute T1-T10. Record results.

- Claude uses ProseMirror with a simpler button structure
- Test fieldset-first root traversal for button discovery
- Verify `aria-label="Send message"` still matches (case-sensitive)

**Task B4: Run test matrix on Gemini**

Execute T1-T10. Record results.

- Gemini uses Quill (`.ql-editor`) — different editor framework
- Check for Trusted Types CSP violations in console
- Verify `rich-textarea` shadow DOM selector still works
- Test `.send-button` class selector

**Task B5: Update capability flags based on results**

For each host where a test fails:
- T3/T4 fail → `reliableSetText: false`
- T5 fail → `sendButtonAnchor: false`
- Update the adapter file with the real values

**Task B6: Fix broken selectors**

If T1/T5 fail because selectors changed, update the selector arrays in the affected adapter.

**Task B7: Document results**

Create `docs/testing/2026-03-XX-live-testing-results.md` with:
- Pass/fail per host per test
- Screenshots of any failures
- Updated selector values
- Capability flag decisions with justification

#### Phase C: 30-Minute Stability Test (6c)

**Task C1: Run stability test on ChatGPT**

Follow the 30-minute protocol. Take heap snapshots at minutes 0, 15, and 30.

**Task C2: Run stability test on Claude**

Same protocol.

**Task C3: Run stability test on Gemini**

Same protocol.

**Task C4: Investigate failures**

For each failure found:
- If observer leak: fix cleanup in `widget-controller.ts` or `observer.ts`
- If anchor drift: improve `updatePosition()` or `updateSendButtonTracking()`
- If stale findings: fix `clearIfNavigatedFromConversation()` in observer
- If memory growth: identify detached DOM nodes, fix cleanup

**Task C5: Document stability results**

Append to the testing results document:
- Heap growth per host
- Observer count after 5+ mount/unmount cycles
- Any failures and fixes applied

## System-Wide Impact

### Interaction Graph

`adapter.capabilities.reliableSetText` → read by `createOrchestrator()` → passed to `createWidgetController()` as `maskingAllowed` → controls whether `handleFix()` / `handleFixAll()` execute → controls whether `adapter.setText()` is called → controls masking map population → affects clipboard restore flow.

When `reliableSetText` flips to `false`, the chain stops at `handleFix()` — it becomes a no-op. Detection, warning, and logging continue unchanged. MaskingMap is created but empty (unless user manually redacts).

### Error Propagation

`handleFix()` calls `adapter.setText()` which calls `setParagraphText()`. Currently no error handling. Adding try/catch:
- On throw: finding stays `active`, masking map is not populated, user sees a toast: "Could not redact text on this site"
- On success: finding transitions to `fixed`, token stored in masking map

### State Lifecycle Risks

- `handleFix()` currently modifies DOM (`setText`), then updates state (`maskingMap.set`, `findingsState.fix`). If `setText` throws mid-way, DOM may be partially modified but state is clean. This is acceptable — the partial DOM change is visible to the user, and they can undo via the editor.
- `capabilities` flags are read-only on the adapter — no runtime mutation risk.

### Integration Test Scenarios

1. **setText fails on live tool:** Type PII → Fix → setText throws → finding stays active → user can still Send Anyway
2. **Adapter returns wrong button:** findSendButton returns speech button → widget anchors to wrong element → visually obvious, but no data loss
3. **SPA navigation during toast:** Toast showing → user navigates → unmount resolves toast as timeout → no hanging promise

## Acceptance Criteria

### 6a: Capability Flags

- [ ] `AdapterCapabilities` interface defined in `src/types/adapter.ts`
- [ ] All three adapters declare `capabilities` with initial values
- [ ] Widget controller reads `reliableSetText` and conditionally renders Fix/FixAll
- [ ] `handleFix()` wrapped in try/catch with user feedback on failure
- [ ] Unit tests for detection-only mode (no Fix buttons)
- [ ] Unit tests for backward compatibility (no `capabilities` → defaults to all-true)
- [ ] Adapter with `reliableSetText: false` — Fix is no-op, masking map unaffected

### 6b: Cross-Tool Live Testing

- [ ] T1-T10 executed on ChatGPT — results documented
- [ ] T1-T10 executed on Claude — results documented
- [ ] T1-T10 executed on Gemini — results documented
- [ ] Capability flags updated to match live results
- [ ] Broken selectors fixed (if any)
- [ ] Results documented in `docs/testing/`

### 6c: 30-Minute Stability Test

- [ ] ChatGPT: 30-minute protocol completed, heap growth < 5 MB
- [ ] Claude: 30-minute protocol completed, heap growth < 5 MB
- [ ] Gemini: 30-minute protocol completed, heap growth < 5 MB
- [ ] Observer count stable after 5+ mount/unmount cycles
- [ ] No stale findings after navigation
- [ ] All failures investigated and fixed

### Quality Gates

- [ ] All existing unit tests pass (`npm run test`)
- [ ] ESLint clean (`npm run lint`)
- [ ] No new `any` types
- [ ] Try/catch on all `adapter.setText()` calls

## Success Metrics

- Every adapter's capabilities match observed reality (no silent failures)
- Full PII detection → warning → send-anyway flow works on all three hosts
- Widget stays correctly positioned for 30 minutes on each host
- No memory leaks, no observer leaks, no stale state

## Dependencies & Prerequisites

- Send-button anchor feature complete (current branch `feat/send-button-anchor`)
- Access to ChatGPT, Claude, and Gemini (login required for 6b and 6c)
- Chrome DevTools for Network tab inspection and Memory profiling

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| `setText()` fails on all three hosts | **CRITICAL** — masking feature unusable | Set `reliableSetText: false`, ship detection-only. Research `execCommand('insertText')` as Phase 7 alternative. |
| Selectors changed since last check | **HIGH** — adapter returns null | Update selectors. Add resilient fallback chains. |
| Gemini Trusted Types blocks DOM manipulation | **MEDIUM** — Gemini adapter degraded | `textContent` and `createElement` are safe sinks. Only script injection is blocked. Set `pageContextBridge: true` for future work. |
| 30-minute test reveals observer leak | **MEDIUM** — memory growth over time | Fix cleanup in `stopObserving()`. Verify `prevUnmount` chain doesn't accumulate. |
| ChatGPT button scoring picks wrong button | **LOW** — widget mispositioned | Tune score values. Add new selector categories if needed. |

## Sources & References

### Internal References

- Roadmap: `docs/roadmap.md` (Phase 6 definition)
- Phase 6 original plan: `docs/plans/2026-03-03-feat-phase6-integration-polish-plan.md`
- Send-button anchor plan: `docs/plans/2026-03-11-send-button-anchor-plan.md`
- Widget lifecycle model: `docs/plans/2026-03-12-grammarly-style-widget-model-for-sunbreak.md`
- Grammarly review: `docs/research/2026-03-12-grammarly-final-review.md` (capability flags = Priority 1)
- DOM pitfalls: `docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md`
- Adapter interface: `src/types/adapter.ts:5-33`
- Orchestrator: `src/content/orchestrator.ts`
- Widget controller: `src/ui/widget/widget-controller.ts`
- ChatGPT adapter (button scoring): `src/content/sites/chatgpt.ts:51-82`
- Claude adapter: `src/content/sites/claude.ts`
- Gemini adapter: `src/content/sites/gemini.ts`
- setParagraphText: `src/content/sites/dom-utils.ts`
- Observer (health check): `src/content/observer.ts`
