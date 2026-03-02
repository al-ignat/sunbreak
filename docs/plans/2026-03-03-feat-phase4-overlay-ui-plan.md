---
title: "feat: Build Phase 4 overlay UI with warning banner and redaction flow"
type: feat
status: completed
date: 2026-03-03
origin: docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md
---

# feat: Build Phase 4 Overlay UI with Warning Banner and Redaction Flow

## Overview

Build the user-facing warning overlay that appears inside AI tool pages when the classification engine detects sensitive data. The overlay shows what was found, offers one-click redaction, and lets the user decide how to proceed. All UI lives in a closed Shadow DOM via WXT's `createShadowRootUi`. Design philosophy: helpful, not hostile — Grammarly, not CrowdStrike.

Phase 4 connects the classification engine (Phase 3) to the user through a visual intervention layer. This is the first time the extension becomes visible to the user. It must be invisible when clean, helpful when triggered, and never break the host page.

(see brainstorm: `docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md` — "Warning, not blocking: User can always Send Anyway. Respectful, not hostile." and "Zero UI when clean: Extension is invisible when nothing is detected.")

## Problem Statement / Motivation

Phases 1-3 built scaffolding, DOM observation, and a classification engine. Currently, the content script captures prompt text and logs it to console — it does nothing useful for the user. The extension needs a visual intervention layer that:

1. Intercepts submission when sensitive data is detected (currently submission is not blocked)
2. Shows the user what was found in plain language
3. Offers clear actions: redact, edit, send anyway, or cancel
4. Performs redaction by replacing findings with placeholders using existing `adapter.setText()`
5. Logs events (metadata only) for the dashboard in Phase 5

Without this, the extension has no user-facing value.

## Proposed Solution

Three implementation steps matching the founding plan's session structure:

### Step 1: Shadow DOM Container + Warning Banner Component

Create the UI foundation: a Preact warning banner rendered inside WXT's `createShadowRootUi` with closed Shadow DOM and fully isolated styles.

### Step 2: Submission Flow Rewrite + Redaction Logic

Transform the interceptor from "observe-only" (Phase 2) to "block-classify-decide." Wire the full flow: intercept → classify → show overlay → handle user action (redact/edit/send anyway/cancel). Add minimal storage for event logging.

### Step 3: Integration + Polish

Connect all components end-to-end. Test on all three AI tools. Handle edge cases (SPA navigation, rapid submission, context invalidation).

## Technical Considerations

### Architecture: The Flow Change

Phase 2's interceptor is passive — it captures text but doesn't block submission. Phase 4 must make it active:

```
PHASE 2 (current):
  User submits → interceptor captures text → logs to console → submission proceeds

PHASE 4 (target):
  User submits → interceptor blocks submission (preventDefault + stopPropagation)
                → classify(text) → findings?
                  NO  → release submission immediately (zero delay)
                  YES → show overlay → wait for user action:
                    Redact & Send → adapter.setText(redacted) → trigger submit
                    Edit          → close overlay, focus input
                    Send Anyway   → release original submission, log event
                    Cancel        → close overlay, clear pending state
```

Key constraint: blocking must happen in the capture phase (third argument `true` on addEventListener) to fire before the site's own handlers. The current interceptor already uses capture phase — this is confirmed in `src/content/interceptor.ts:62-63`.

### WXT Shadow DOM Integration

Use `createShadowRootUi` with these options:

```typescript
const ui = await createShadowRootUi(ctx, {
  name: 'byoai-overlay',
  position: 'overlay',   // fixed-position overlay
  mode: 'closed',        // closed Shadow DOM per CLAUDE.md
  cssInjectionMode: 'ui',
  isolateEvents: true,    // prevent overlay events from leaking to host
  onMount(container, shadow, shadowHost) {
    // Render Preact WarningBanner into container
    // Return root for cleanup
  },
  onRemove(root) {
    // Unmount Preact
  },
});
```

The `position: 'overlay'` gives us a fixed-position container above the page. WXT handles `z-index` and positioning.

### Preact, Not React

All UI components use Preact (3KB vs React's 40KB+). Import from `preact` and `preact/hooks`. The project already has Preact configured in `wxt.config.ts` and uses it in the popup (`src/entrypoints/popup/App.tsx`).

### Minimal Storage Layer

Phase 4 needs to log events for "Send Anyway" (acknowledgment) and "Redact & Send" (redaction count). Phase 5 builds the full dashboard storage, but Phase 4 needs a thin wrapper to avoid direct `chrome.storage` calls (per CLAUDE.md: "No direct chrome.storage calls outside src/storage/").

Create `src/storage/events.ts` with just `logFlaggedEvent()` and `logCleanPrompt()`. Keep it minimal — Phase 5 expands it.

### Performance Budget

- Classification already runs in <50ms (Phase 3 guarantee)
- Overlay mount/unmount must be <50ms (Preact is fast, Shadow DOM creation is ~5ms)
- Clean prompts: zero delay — `classify()` returns empty findings, submission released immediately
- Total user-perceived delay for clean prompts: <5ms (classify only, no UI)

### Zero-Interference Mode

When `classify()` returns zero findings (or only LOW confidence), the extension does nothing:
- No banner, no badge, no icon change, no console log visible to user
- Submission proceeds with zero delay
- Silent stat logged (metadata only)

This is critical: any friction on clean prompts will cause users to disable the extension.

### v1 Filtering Rule

Per SPEC Section 2.5: only surface HIGH and MEDIUM confidence findings in the overlay. LOW confidence findings are logged to stats but NOT shown to the user. Filter in the content script orchestrator before passing to the overlay.

## File Structure

```
src/
  ui/
    overlay/
      WarningBanner.tsx     # Preact component: banner + findings list + action buttons
      WarningBanner.css     # Isolated styles (injected into Shadow DOM)
      overlay-controller.ts # Mount/unmount/show/hide logic using createShadowRootUi
      types.ts              # OverlayAction, OverlayProps types
  storage/
    events.ts               # Minimal event logging (logFlaggedEvent, logCleanPrompt)
    types.ts                # FlaggedEvent, StoredData types (subset for Phase 4)
  content/
    interceptor.ts          # MODIFIED: block-classify-decide flow (was observe-only)
    orchestrator.ts         # NEW: wires interceptor → classifier → overlay → action
  entrypoints/
    content.ts              # MODIFIED: use orchestrator instead of raw callbacks
```

## Acceptance Criteria

### Functional

- [x] Shadow DOM container injects into ChatGPT, Claude, and Gemini pages without breaking them
- [x] Warning banner appears when HIGH or MEDIUM confidence findings are detected
- [x] Banner shows plain-language summary: "2 email addresses and 1 API key detected"
- [x] Detail section (expandable) lists each finding with truncated values
- [x] "Redact & Send" replaces all findings with `[TYPE_N]` placeholders and submits
- [x] "Edit" closes overlay and returns focus to the input field
- [x] "Send Anyway" proceeds with original text and logs acknowledgment event
- [x] "Cancel" cancels submission entirely
- [x] Escape key = Cancel, Enter key = Redact & Send
- [x] Zero-interference: extension is invisible when no findings (or only LOW confidence)
- [x] Clean prompts pass through with zero perceptible delay
- [x] Overlay animates in (200ms slide-up + fade-in) and out (150ms slide-down + fade-out)
- [x] Events logged to `chrome.storage.local` via storage wrapper (metadata only, never prompt content)
- [x] Works after SPA navigation on all three AI tools
- [x] Multiple rapid submissions while overlay is showing are debounced

### Non-Functional

- [x] All styles isolated inside Shadow DOM — no leakage to/from host page
- [x] Shadow DOM is closed mode
- [x] Overlay renders above everything (`z-index: 2147483647`)
- [x] Classification + overlay mount < 100ms total
- [x] Clean prompt overhead < 5ms
- [x] No `any` types. No `require()`. Named exports only.
- [x] WCAG AA: keyboard navigable, sufficient color contrast, focus management

### Testing

- [x] Unit tests for WarningBanner component (renders findings, button actions)
- [x] Unit tests for overlay-controller (mount, unmount, show, hide)
- [x] Unit tests for modified interceptor (block, release, redact flows)
- [x] Unit tests for orchestrator (classify → overlay → action wiring)
- [x] Unit tests for storage events (logFlaggedEvent, logCleanPrompt)
- [x] Integration: full flow from prompt capture → classify → overlay → redact → submit
- [x] Each pattern detector's test suite remains passing (no regressions)

## Implementation Detail

### Step 1: Shadow DOM Container + Warning Banner Component

**Files to create:**

`src/ui/overlay/types.ts`
```typescript
export type OverlayAction = 'redact' | 'edit' | 'send-anyway' | 'cancel';

export interface OverlayProps {
  readonly findings: ReadonlyArray<{
    readonly type: string;
    readonly label: string;
    readonly value: string;
    readonly placeholder: string;
    readonly confidence: string;
  }>;
  readonly onAction: (action: OverlayAction) => void;
}
```

`src/ui/overlay/WarningBanner.tsx` — Preact component:
- Summary line with icon: "2 email addresses and 1 API key detected"
  - Group findings by type, use plural/singular labels
- Expandable detail section: each finding with truncated value (first 4 + last 4 chars for sensitive items like API keys, full value for emails)
- Four action buttons in a row:
  1. "Redact & Send" — primary, filled amber (`#FF9800`) button
  2. "Edit" — secondary, outlined button
  3. "Send Anyway" — tertiary, text-only button
  4. "Cancel" — tertiary, text-only button
- Visual design per SPEC Section 3.2:
  - Background: soft amber (`#FFF8E1`), left border accent orange (`#FF9800`)
  - Text: dark gray (`#333333`), 14px, system font stack
  - Rounded corners (8px), subtle drop shadow
  - Max width: 600px, centered horizontally
  - Position: near bottom of viewport, above chat input area

`src/ui/overlay/WarningBanner.css` — all styles scoped inside Shadow DOM:
- Animation: 200ms slide-up + fade-in on show, 150ms slide-down + fade-out on hide
- Focus styles for keyboard navigation (WCAG AA)
- Responsive: works on different viewport widths

`src/ui/overlay/overlay-controller.ts`:
- `createOverlay(ctx)` — calls `createShadowRootUi`, returns control object
- `showOverlay(findings, onAction)` — renders WarningBanner with findings, returns Promise that resolves with user action
- `hideOverlay()` — unmounts banner with exit animation
- `destroyOverlay()` — full cleanup
- Uses WXT's `createShadowRootUi` with `position: 'overlay'`, `mode: 'closed'`

**Tests:**
- `tests/unit/ui/overlay/WarningBanner.test.tsx` — renders with findings, clicks fire correct actions, keyboard shortcuts work, summary text is correct, detail section expands/collapses
- `tests/unit/ui/overlay/overlay-controller.test.ts` — mount/unmount lifecycle, show/hide animations

### Step 2: Submission Flow Rewrite + Redaction Logic

**Files to modify:**

`src/content/interceptor.ts` — Transform from observe-only to block-and-decide:
- `attachSubmissionInterceptor` gains a new callback shape:
  ```typescript
  // Phase 4: callback returns a Promise<InterceptAction>
  // InterceptAction = 'release' | 'block'
  // When 'block': preventDefault + stopPropagation on the event
  // When 'release': do nothing, let the event through
  ```
- On Enter keydown or send button click:
  1. Call `e.preventDefault()` and `e.stopPropagation()` immediately
  2. Extract text via `adapter.getText(input)`
  3. Call the orchestrator callback with text
  4. Orchestrator decides: classify, show overlay if needed, handle action
  5. If "release" (clean prompt or Send Anyway): programmatically trigger submission
  6. If "redact": `adapter.setText(input, redactedText)`, then programmatically trigger submission

**Programmatic submission after blocking:**
- After blocking the original event, we need to re-trigger submission
- For Enter key: dispatch a new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) on the input
- For button click: call `sendButton.click()`
- Must set a flag to avoid infinite loop (the re-triggered event would be intercepted again)
  - Use a `bypassNext` boolean flag: set true before re-triggering, check at top of handler, reset after

**Files to create:**

`src/content/orchestrator.ts` — wires everything together:
```typescript
export function createOrchestrator(
  adapter: SiteAdapter,
  ctx: ObserverContext,
): { onPromptCaptured: PromptCallback } {
  // 1. Initialize overlay controller
  // 2. On prompt captured:
  //    a. classify(text, { keywords })
  //    b. Filter to HIGH + MEDIUM findings
  //    c. If no findings: log clean event, return 'release'
  //    d. If findings: show overlay, wait for action
  //    e. Handle action:
  //       - 'redact': build redacted text, adapter.setText(), return 'release'
  //       - 'edit': hide overlay, return (don't release — user is editing)
  //       - 'send-anyway': log acknowledgment, return 'release'
  //       - 'cancel': hide overlay, return (don't release)
  // 3. Fetch keywords from chrome.storage.local (cached, refreshed periodically)
}
```

`src/storage/types.ts` — minimal types for Phase 4:
```typescript
export interface FlaggedEvent {
  readonly id: string;           // crypto.randomUUID()
  readonly timestamp: string;    // ISO 8601
  readonly tool: string;         // 'chatgpt' | 'claude' | 'gemini'
  readonly categories: string[]; // ['email', 'api-key']
  readonly findingCount: number;
  readonly action: 'redacted' | 'sent-anyway' | 'cancelled' | 'edited';
  // NEVER store prompt text or finding values
}
```

`src/storage/events.ts`:
```typescript
export function logFlaggedEvent(event: FlaggedEvent): void
export function logCleanPrompt(tool: string): void
```
- Both are fire-and-forget (catch errors silently)
- `logFlaggedEvent` appends to `flaggedEvents` array in `chrome.storage.local`, capped at 1000 entries (FIFO)
- `logCleanPrompt` increments daily interaction counter

**Files to modify:**

`src/entrypoints/content.ts` — replace raw console.log callbacks with orchestrator:
```typescript
import { createOrchestrator } from '../content/orchestrator';
// ... use orchestrator.onPromptCaptured instead of console.log
```

**Redaction text building:**
```typescript
function buildRedactedText(original: string, findings: Finding[]): string {
  // Replace findings from right to left (highest startIndex first)
  // to avoid index shifting
  let result = original;
  const sorted = [...findings].sort((a, b) => b.startIndex - a.startIndex);
  for (const finding of sorted) {
    result = result.slice(0, finding.startIndex)
      + finding.placeholder
      + result.slice(finding.endIndex);
  }
  return result;
}
```

This is safe because Phase 3 guarantees no overlapping findings (see Phase 3 plan, Design Decision D1).

**Tests:**
- `tests/unit/content/interceptor.test.ts` — update existing tests for blocking behavior, add tests for bypass flag, programmatic re-submission
- `tests/unit/content/orchestrator.test.ts` — full flow: classify → overlay → each action path
- `tests/unit/storage/events.test.ts` — logFlaggedEvent appends, respects 1000 cap, logCleanPrompt increments counter
- `tests/unit/content/redaction.test.ts` — buildRedactedText with various finding positions

### Step 3: Integration + Polish

- Test full flow on ChatGPT: type prompt with email → overlay appears → Redact & Send → `[EMAIL_1]` sent
- Test full flow on Claude: same flow
- Test full flow on Gemini: same flow
- Test SPA navigation: navigate away while overlay is showing → overlay removed cleanly
- Test rapid submission: submit twice quickly → second submission debounced
- Test context invalidation: disable extension while overlay showing → cleanup
- Test clean prompts: verify zero delay, no visible UI
- Test keyboard shortcuts: Escape closes, Enter redacts
- Verify no host page breakage after 10 minutes of normal use with extension loaded
- Verify styles don't leak (inspect computed styles on host elements near overlay)

## Design Decisions

### D1: Interceptor becomes blocking (preventDefault)

The interceptor must block the original submission event to give the overlay time to show. This is a significant change from Phase 2's passive observation. The bypass flag pattern (`bypassNext`) prevents infinite loops when re-triggering submission after the user's decision.

Alternative considered: using a debounce/queue instead of blocking — rejected because the prompt would already be sent before the user sees the warning.

### D2: Overlay as Promise-based flow

`showOverlay()` returns a `Promise<OverlayAction>` that resolves when the user clicks a button or presses a keyboard shortcut. This makes the orchestrator logic clean and sequential:

```typescript
const action = await showOverlay(findings);
// handle action...
```

### D3: Minimal storage in Phase 4

Only `logFlaggedEvent` and `logCleanPrompt` are needed now. The full `StoredData` interface (daily stats aggregation, settings, keyword management) comes in Phase 5. This avoids building storage infrastructure that's not yet needed.

### D4: Text highlighting deferred

Per SPEC Section 3.3: "If highlighting is too complex or risks breaking the input, skip it in v1." Highlighting in contenteditable/ProseMirror editors is risky — it can break the editor's internal state. **Decision: skip text highlighting in Phase 4.** The findings are shown in the overlay's detail section instead. Can be revisited in Phase 6 polish.

### D5: Keywords fetched once at orchestrator init, cached

The orchestrator fetches user keywords from `chrome.storage.local` once at initialization and refreshes on `chrome.storage.onChanged`. This keeps `classify()` synchronous and pure (per Phase 3 design decision D2).

## Dependencies & Risks

### Dependencies

- Phase 3 classification engine (completed): `classify()` function and `Finding` types
- Phase 2 DOM observation (completed): `attachSubmissionInterceptor`, site adapters with `getText`/`setText`
- WXT `createShadowRootUi` API: documented, stable, used by thousands of extensions

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `preventDefault` on Enter doesn't fully block submission on some AI tools | Prompt sent before overlay shown | Test on all three tools early. Some tools may use `mousedown` or custom events instead of `keydown`. Adapt per-site. |
| Programmatic re-submission (click/Enter after redaction) behaves differently than user action | Redacted text not actually sent | Each adapter may need a custom `triggerSubmit()` method. Test thoroughly. |
| Shadow DOM styles not fully isolated on some page structures | Overlay looks broken | Use minimal, defensive CSS. Test on all three tools. |
| AI tools update their DOM, breaking adapters | Extension stops working | Already mitigated by adapter pattern (Phase 2). Overlay doesn't depend on host DOM selectors. |
| Overlay blocks important page elements | User can't interact with page | Position overlay near bottom, allow dismiss via Cancel/Escape. |

## Success Metrics

- Overlay appears within 100ms of submission on all three AI tools
- Clean prompts have zero perceptible delay (<5ms overhead)
- Redaction correctly replaces all findings with placeholders
- All four action buttons work correctly
- Extension doesn't break any of the three AI tools after 10 minutes of use
- No style leakage in either direction (overlay ↔ host page)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md](docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md) — Key decisions carried forward: "Warning, not blocking", "Zero UI when clean", "Shadow DOM isolation (closed mode)"

### Internal References

- Full overlay spec: `docs/founding/founding-SPEC.md` Section 3 (lines 231-298)
- Storage spec: `docs/founding/founding-SPEC.md` Section 4.3 (lines 340-391)
- Phase plan checklist: `docs/founding/founding-PLAN.md` Phase 4 (lines 31-40)
- Session prompts: `docs/founding/founding-03-implementation-guide.md` Sessions 8-10 (lines 506-518)
- Phase 3 plan (classification engine): `docs/plans/2026-03-02-feat-phase3-classification-engine-plan.md`
- Classifier types: `src/classifier/types.ts`
- Classifier engine: `src/classifier/engine.ts`
- Current interceptor: `src/content/interceptor.ts`
- Current observer: `src/content/observer.ts`
- Site adapter interface: `src/types/adapter.ts`
- Content script entry: `src/entrypoints/content.ts`

### External References

- WXT `createShadowRootUi` docs: https://wxt.dev/guide/essentials/content-scripts
- WXT Shadow DOM options: `ShadowRootContentScriptUiOptions` — `position: 'overlay'`, `mode: 'closed'`, `isolateEvents: true`
- Preact docs: https://preactjs.com/

### Related Work

- Phase 1 PR: scaffolding
- Phase 2 PR: #2 (DOM observation)
- Phase 3 PR: #3 (classification engine)
