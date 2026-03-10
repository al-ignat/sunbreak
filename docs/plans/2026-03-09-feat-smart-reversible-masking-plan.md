---
title: "feat: Smart Reversible Masking — Clipboard Restore Flow"
type: feat
status: active
date: 2026-03-09
origin: docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md
depends-on: docs/plans/2026-03-09-feat-smart-masking-plan.md
---

# Smart Reversible Masking — Clipboard Restore Flow

## Overview

After the user masks findings and sends the prompt, the AI responds using the descriptive tokens. When the user copies text from the AI response, the extension offers to restore the original values in the clipboard. The mapping lives entirely in content script memory — never persisted, dies with the tab.

This is the second half of the v0.2 "Smart Reversible Masking" feature (see brainstorm: Feature 1, lines 41-58).

**Depends on:** Smart Masking (descriptive tokens) must be implemented first. The restore flow maps descriptive tokens back to original values.

## Problem Statement

After "Fix" replaces `john.smith@acme.com` with `[John S. email]`, the AI responds using that token. When the user copies the AI's response, they get tokenized text that they must manually de-tokenize. There is no way to recover the original values without re-typing them. This makes the Fix action feel lossy and discourages use.

## Proposed Solution

Three new components working together:

1. **MaskingMap** — in-memory `Map<string, string>` mapping tokens to original values. Populated on each Fix/Fix All. Auto-expires after 30 minutes. Resets on conversation change.

2. **ClipboardInterceptor** — listens for `copy` events on the document. When clipboard text contains known tokens, shows a restore toast. If user accepts, rewrites clipboard with original values.

3. **MaskBadge** — secondary status in the existing widget pill showing masked value count. Clicking opens a mapping table in the findings panel.

### Flow

```
Fix -> populate MaskingMap -> show badge "2 masked"
                                    |
User copies AI response -> ClipboardInterceptor fires
                                    |
                          tokens found in clipboard?
                          /                          \
                        No                           Yes
                        |                             |
                  do nothing              show RestoreToast
                                         /              \
                                     "Restore"      "Keep masked"
                                        |                |
                                 rewrite clipboard    do nothing
                                 with originals
```

(see brainstorm: docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md, lines 43-51)

## Technical Approach

### Architecture

**Clipboard interception strategy: Copy event handler (Approach A).**

Intercept the `copy` event on the document, read the selection via `window.getSelection().toString()`, scan for tokens, and use `event.clipboardData.setData('text/plain', restoredText)` with `preventDefault()` to write restored content.

**Why not Approach B (post-copy read)?** Requires `clipboardRead` + `clipboardWrite` permissions, which trigger a "new permissions" warning for existing users on extension update. Approach A requires zero new permissions — the `copy` event handler's `clipboardData.setData()` is synchronous and permission-free.

**Known limitation:** Site "Copy" buttons on code blocks (ChatGPT, Claude, Gemini) use `navigator.clipboard.writeText()` directly, bypassing the `copy` event. These are not intercepted. Documented as a known limitation; users can Ctrl+C/Cmd+C instead. A future enhancement could override `navigator.clipboard.writeText` via a MAIN world script if user feedback demands it.

**New permissions: None.** Approach A works entirely within the content script's `copy` event handler. No `clipboardRead` or `clipboardWrite` permission needed.

### Implementation Phases

#### Phase 1: MaskingMap Module

New module: in-memory mapping with TTL and conversation scoping.

**Interface:**

```typescript
// src/content/masking-map.ts

interface MaskingMap {
  /** Add a token -> original value mapping. Resets the expiry timer. */
  set(token: string, originalValue: string): void;

  /** Add multiple mappings at once (for Fix All). Resets the expiry timer. */
  setAll(entries: ReadonlyArray<{ token: string; originalValue: string }>): void;

  /** Get the original value for a token, or undefined. */
  get(token: string): string | undefined;

  /** Scan text for all known tokens. Returns restored text and count of replacements. */
  restore(text: string): { restored: string; count: number };

  /** Number of active mappings. */
  readonly size: number;

  /** Subscribe to changes (for badge rendering). */
  subscribe(listener: () => void): () => void;

  /** Clear all mappings and cancel the expiry timer. */
  clear(): void;

  /** Destroy the instance (cancel timers, clear listeners). */
  destroy(): void;
}

function createMaskingMap(options?: { ttlMs?: number }): MaskingMap;
```

**Behavior:**
- Default TTL: 30 minutes (1,800,000ms)
- Timer resets on every `set()` / `setAll()` call
- On expiry: all mappings cleared, subscribers notified
- `restore()` scans text left-to-right, replacing all occurrences of every known token
- Thread safety: single-threaded JS, no concurrent mutation risk
- Memory bound: realistic prompts have <50 findings. No size limit needed.

**Conversation boundary:** The orchestrator calls `maskingMap.clear()` on `wxt:locationchange` when the URL path changes (SPA navigation to a new conversation).

**Files to create:**
- `src/content/masking-map.ts`

**Tests:**
- `tests/unit/content/masking-map.test.ts` — new file
  - `set()` stores token -> value pair
  - `get()` returns value for known token, undefined for unknown
  - `restore()` replaces all known tokens in text
  - `restore()` returns count of replacements
  - `restore()` with no tokens in text returns `{ restored: original, count: 0 }`
  - `setAll()` stores multiple pairs
  - `subscribe()` fires on set, setAll, clear, and TTL expiry
  - `size` reflects current mapping count
  - TTL expiry clears all mappings after configured duration (use `vi.useFakeTimers()`)
  - `set()` resets the TTL timer
  - `clear()` removes all mappings and cancels timer
  - `destroy()` cancels timer and clears listeners
  - Multiple occurrences of same token in text are all restored

**Acceptance criteria:**
- [x] MaskingMap stores and retrieves token -> value pairs
- [x] TTL auto-clears after 30 minutes
- [x] `restore()` correctly replaces all tokens in arbitrary text
- [x] Subscribers notified on all state changes

---

#### Phase 2: Wire MaskingMap into Fix Flow

Populate the mapping when the user clicks Fix or Fix All.

**Files to modify:**
- `src/content/orchestrator.ts` — create MaskingMap instance, pass to widget-controller, cleanup on destroy
- `src/ui/widget/widget-controller.ts` — in `handleFix()`: after building redacted text, call `maskingMap.set(tf.finding.placeholder, tf.finding.value)`. In `handleFixAll()`: call `maskingMap.setAll(...)` with all active findings' placeholder -> value pairs.
- `src/content/observer.ts` — clear MaskingMap on conversation change (URL path change in `wxt:locationchange` handler)

**Key detail:** The mapping must be populated BEFORE `adapter.setText()` is called, because `setText()` triggers re-scan which may update the findings. But actually the mapping just needs the `Finding.placeholder` and `Finding.value` which are read from the snapshot before `setText()`. So the order is:
1. Read TrackedFinding from snapshot
2. Build redacted text
3. Populate MaskingMap
4. Call `adapter.setText()`
5. Call `findingsState.fix()`

**Tests:**
- `tests/unit/ui/widget/widget-controller.test.ts` — extend existing tests
  - After `handleFix()`, MaskingMap contains the fixed finding's token -> value
  - After `handleFixAll()`, MaskingMap contains all active findings' token -> value pairs
  - MaskingMap is cleared when observer handles conversation change

**Acceptance criteria:**
- [x] Fix action populates MaskingMap with correct token -> value pair
- [x] Fix All populates MaskingMap with all active findings
- [x] Conversation change clears the mapping

---

#### Phase 3: ClipboardInterceptor

New module: listens for `copy` events on the document, scans for tokens, offers restore.

**Files to create:**
- `src/content/clipboard-interceptor.ts`

**Interface:**

```typescript
interface ClipboardInterceptorCallbacks {
  /** Called when tokens are found in copied text. Returns whether user wants restore. */
  onTokensFound: (count: number) => Promise<boolean>;
}

interface ClipboardInterceptor {
  /** Start listening for copy events. */
  attach(): void;
  /** Stop listening. */
  detach(): void;
}

function createClipboardInterceptor(
  maskingMap: MaskingMap,
  callbacks: ClipboardInterceptorCallbacks,
): ClipboardInterceptor;
```

**Copy event handler logic:**

```
1. Listen for 'copy' event on document (capture phase)
2. Read selection: window.getSelection().toString()
3. If selection is empty, return (let default copy proceed)
4. Call maskingMap.restore(selectionText)
5. If count === 0, return (no tokens found, let default copy proceed)
6. Prevent default: event.preventDefault()
7. Write tokenized text to clipboard immediately:
   event.clipboardData.setData('text/plain', selectionText)
8. Call callbacks.onTokensFound(count)
9. If user accepts restore:
   Use navigator.clipboard.writeText(restoredText) to overwrite
10. If user declines or toast times out:
    Clipboard keeps the tokenized version (already written in step 7)
```

**Why write tokenized text first (step 7)?** If the user ignores the toast, or the async callback fails, the clipboard has the safe tokenized version. Restoration only happens on explicit "Yes." This is the safe default.

**Edge case — user copies before toast response:** The step 7 `setData()` is synchronous. The clipboard immediately has the tokenized text. The user can paste right away without waiting. The toast is just an opportunity to upgrade to restored values.

**Tests:**
- `tests/unit/content/clipboard-interceptor.test.ts` — new file
  - Copy with tokens: `onTokensFound` called with correct count
  - Copy without tokens: `onTokensFound` NOT called, default copy proceeds
  - Copy with empty selection: ignored
  - `onTokensFound` returns true: clipboard overwritten with restored text
  - `onTokensFound` returns false: clipboard keeps tokenized version
  - `detach()` stops listening
  - Multiple tokens in one copy: all counted

**Mocking strategy:** Use `Object.defineProperty` on ClipboardEvent for `clipboardData` (jsdom doesn't implement it — see `docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md`). Mock `window.getSelection()` to return test strings. Mock `navigator.clipboard.writeText()`.

**Acceptance criteria:**
- [x] Copy events with tokens trigger the callback
- [x] Copy events without tokens pass through unchanged
- [x] Safe default: tokenized text in clipboard until explicit restore
- [x] `navigator.clipboard.writeText()` called only when user accepts

---

#### Phase 4: RestoreToast UI Component

New widget component: shows restore prompt when tokens found in clipboard.

**Files to create:**
- `src/ui/widget/RestoreToast.tsx`
- `src/ui/widget/restore-toast.css`

**Design (consistent with existing SendToast style):**

```
┌──────────────────────────────────────┐
│  📋 Restore 2 masked values?         │
│                                      │
│  [ Restore ]  [ Keep masked ]        │
└──────────────────────────────────────┘
```

- Clipboard icon (inline SVG for Shadow DOM) + "Restore N masked values?"
- "Restore" primary button (orange tint) — calls accept callback
- "Keep masked" ghost button — calls decline callback
- Auto-dismiss after 8 seconds — decline by default (safe)
- Positioned in the same Shadow DOM container as other widget overlays
- Entrance animation consistent with SendToast

**Files to modify:**
- `src/ui/widget/Widget.tsx` — render RestoreToast when triggered, pass accept/decline handlers
- `src/ui/widget/widget.css` — positioning for toast (may share SendToast positioning)

**Tests:**
- `tests/unit/ui/widget/RestoreToast.test.tsx` — new file
  - Renders with correct count
  - "Restore" click calls accept callback
  - "Keep masked" click calls decline callback
  - Auto-dismiss after 8 seconds calls decline callback

**Acceptance criteria:**
- [ ] Toast renders in Shadow DOM with correct count
- [ ] Restore and Keep masked buttons trigger correct callbacks
- [ ] Auto-dismiss after 8 seconds with safe default (keep masked)
- [ ] Renders correctly on ChatGPT, Claude, and Gemini

---

#### Phase 5: MaskBadge in Widget

Show masked value count in the existing widget pill when mappings exist.

**Current widget states:**
- Clean: `● Sunbreak ✓`
- Checking: `● Sunbreak ⟳`
- Findings: `● Sunbreak (3)` with red badge

**New state:**
- Masked: `● Sunbreak | 2 masked` — secondary text when MaskingMap.size > 0 and no active findings
- Mixed: `● Sunbreak (3) | 2 masked` — both active findings and masked values

**Files to modify:**
- `src/ui/widget/Widget.tsx` — subscribe to MaskingMap, render masked count
- `src/ui/widget/widget.css` — styles for "masked" label (muted color, separator)

**Click behavior:** When user clicks the widget while mappings exist, show a "Masked values" section at the bottom of the findings panel:

```
┌──────────────────────────────────────┐
│  2 masked values    [ Clear All ]    │
│──────────────────────────────────────│
│  [John S. email]    john.sm...       │
│  [phone ending 67]  +1-555...        │
│──────────────────────────────────────│
│  Auto-clears in 24 min              │
└──────────────────────────────────────┘
```

- Original values truncated (first 8 chars + "...") — prevents full exposure in UI
- "Clear All" button destroys mapping immediately
- Remaining TTL shown as countdown

**Files to modify:**
- `src/ui/widget/FindingsPanel.tsx` — add masked values section when MaskingMap.size > 0
- `src/ui/widget/findings-panel.css` — styles for masked values section

**Tests:**
- `tests/unit/ui/widget/Widget.test.tsx` — extend
  - Widget shows "2 masked" when MaskingMap has entries
  - Widget shows both finding count and masked count
  - Widget shows neither when both are zero
- `tests/unit/ui/widget/FindingsPanel.test.tsx` — extend
  - Masked values section renders when mappings exist
  - "Clear All" calls maskingMap.clear()
  - Original values are truncated in display

**Acceptance criteria:**
- [ ] Widget pill shows masked count when mappings exist
- [ ] Findings panel shows masked values section with truncated originals
- [ ] "Clear All" destroys the mapping
- [ ] TTL countdown displayed

---

#### Phase 6: Full Integration Wiring

Wire all components together in the orchestrator.

**Files to modify:**
- `src/content/orchestrator.ts` — create MaskingMap, create ClipboardInterceptor, wire callbacks:
  - `onTokensFound` -> show RestoreToast via widget-controller
  - RestoreToast accept -> `navigator.clipboard.writeText(restoredText)`
  - RestoreToast decline -> no-op
  - Pass MaskingMap to widget-controller for badge + panel rendering
- `src/content/observer.ts` — attach ClipboardInterceptor alongside scanner, clear MaskingMap on conversation URL change
- `src/ui/widget/widget-controller.ts` — orchestrate RestoreToast show/hide, accept/decline

**Lifecycle:**
```
orchestrator.create()
  -> createMaskingMap({ ttlMs: 30 * 60 * 1000 })
  -> createClipboardInterceptor(maskingMap, { onTokensFound })
  -> createWidgetController({ ..., maskingMap })

observer.attach()
  -> clipboardInterceptor.attach()

observer.tearDown()
  -> clipboardInterceptor.detach()
  -> maskingMap.destroy()

wxt:locationchange (URL path change)
  -> maskingMap.clear()
```

**Tests:**
- Integration-style tests in `tests/unit/content/orchestrator.test.ts` — extend
  - Fix -> copy with token -> restore toast shown -> accept -> clipboard updated
  - Fix -> copy without token -> no toast
  - Conversation change -> mapping cleared -> copy with old token -> no toast

**Acceptance criteria:**
- [ ] Full flow works end-to-end: Fix -> copy -> restore toast -> accept -> clipboard has original values
- [ ] Conversation change clears all mappings
- [ ] Tab close destroys all state (content script memory freed)
- [ ] No interference with normal copy operations (no tokens = passthrough)

## System-Wide Impact

### Interaction Graph

```
Fix click -> widget-controller.handleFix()
  -> buildRedactedText()
  -> maskingMap.set(token, value)
  -> adapter.setText()
  -> findingsState.fix()

Copy event -> clipboardInterceptor
  -> maskingMap.restore(selectionText)
  -> widget-controller.showRestoreToast(count)
  -> user clicks Restore
  -> navigator.clipboard.writeText(restoredText)
```

### Error & Failure Propagation

- `navigator.clipboard.writeText()` can throw if the page loses focus between toast display and user click. Catch the error silently — the clipboard retains the tokenized version (safe default from step 7 of the copy handler).
- MaskingMap TTL timer uses `setTimeout`. If the tab is suspended (Chrome discards inactive tabs), the timer fires on wake. This is correct — the mapping was effectively expired during suspension.

### State Lifecycle Risks

- **MaskingMap is independent of FindingsState.** FindingsState prunes fixed findings on the next scan cycle. MaskingMap retains the mapping independently. These two states do not interfere.
- **Partial failure on Fix All:** If `adapter.setText()` throws mid-way, the MaskingMap may contain entries for findings that weren't actually replaced in the text. Mitigate by populating MaskingMap only AFTER `setText()` succeeds. Reorder: setText -> setAll -> fix().
- **Multiple Fix actions accumulate.** User fixes email in message 1, API key in message 2. MaskingMap holds both. This is correct per the brainstorm ("accumulates across messages").

### API Surface Parity

- No new chrome APIs used beyond `document.addEventListener('copy')` and `navigator.clipboard.writeText()`.
- No changes to existing component interfaces — MaskingMap is a new dependency injected via the orchestrator.
- Widget gains new optional props for masked count and restore toast.

### Integration Test Scenarios

1. **Happy path:** Fix email -> send prompt -> AI responds with token -> Ctrl+C on response -> toast appears -> click Restore -> paste contains original email
2. **No tokens in copy:** Fix email -> copy text from a different paragraph without tokens -> no toast
3. **Mapping expiry:** Fix email -> wait 30 minutes -> copy AI response with token -> no toast (mapping expired)
4. **Conversation change:** Fix email in conversation A -> navigate to conversation B -> copy text with same token -> no toast (mapping cleared)
5. **Multiple Fix accumulation:** Fix email in message 1 -> Fix phone in message 2 -> copy AI response with both tokens -> toast shows "Restore 2 masked values?"

## Acceptance Criteria

### Functional Requirements

- [ ] Fix action populates the in-memory mapping
- [ ] Copy with tokens shows restore toast
- [ ] Accepting restore writes original values to clipboard
- [ ] Declining restore keeps tokenized clipboard
- [ ] Mapping auto-expires after 30 minutes
- [ ] Conversation navigation clears the mapping
- [ ] Widget shows masked count when mappings exist
- [ ] Findings panel shows masked values with truncated originals
- [ ] "Clear All" destroys all mappings immediately

### Non-Functional Requirements

- [ ] Original values never persisted to disk (memory-only)
- [ ] No new browser permissions required
- [ ] Copy handler adds <1ms to copy operations when no tokens found
- [ ] Restore toast renders within 100ms of copy event
- [ ] Zero interference with normal copy operations

### Quality Gates

- [ ] MaskingMap test suite covers TTL, accumulation, restore, and cleanup
- [ ] ClipboardInterceptor tests verify passthrough for non-token copies
- [ ] RestoreToast tests verify auto-dismiss and safe default behavior
- [ ] Full integration test covers Fix -> copy -> restore -> paste

## Dependencies & Prerequisites

- **Smart Masking plan** must be implemented first — descriptive tokens are the tokens being mapped
- No new npm dependencies
- No storage schema changes
- No new browser permissions

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Site "Copy" buttons bypass `copy` event | Certain | Medium | Document limitation. Users can use Ctrl+C/Cmd+C instead. Future: MAIN world script override. |
| `navigator.clipboard.writeText()` fails on focus loss | Medium | Low | Catch error silently. Clipboard retains safe tokenized version. |
| Clipboard history managers persist restored values | Medium | Low | Out of scope — the restore is explicit user action. Document in privacy FAQ. |
| Tab suspension expires mapping prematurely | Low | Low | Expected behavior — the mapping was effectively expired during suspension. |
| Mapping holds stale entries if user edits text after fix | Low | Low | Mapping entries are harmless if stale — restore toast simply won't find them in copied text. |
| Multiple toasts stack on rapid copies | Low | Medium | Replace existing toast on new copy. Only one RestoreToast at a time. |

## Future Enhancements (Not in Scope)

- **MAIN world clipboard override** for site "Copy" button interception
- **Rich text (HTML) restore** — scan and replace tokens in `text/html` clipboard data
- **Per-keyword labels** — user-configurable descriptive labels per custom keyword
- **Mapping persistence option** — opt-in `chrome.storage.session` storage for mapping (survives extension restart but not browser close)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md](docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md) — Feature 1: Smart Reversible Masking, lines 41-58 (clipboard restore flow)

### Internal References

- `src/ui/widget/widget-controller.ts:135-168` — `handleFix()` and `handleFixAll()` (wiring point for MaskingMap)
- `src/content/orchestrator.ts` — lifecycle owner for MaskingMap
- `src/content/observer.ts:219-221` — `wxt:locationchange` handler (conversation boundary)
- `src/ui/widget/SendToast.tsx` — design reference for RestoreToast
- `src/ui/widget/Widget.tsx` — badge rendering integration point
- `src/ui/widget/FindingsPanel.tsx` — masked values panel section
- `docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md` — jsdom clipboard mocking patterns
- `docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md` — Shadow DOM rendering patterns

### Key File Paths

**Create:**
- `src/content/masking-map.ts` — in-memory mapping with TTL
- `src/content/clipboard-interceptor.ts` — copy event listener
- `src/ui/widget/RestoreToast.tsx` — restore prompt toast
- `src/ui/widget/restore-toast.css` — toast styles
- `tests/unit/content/masking-map.test.ts`
- `tests/unit/content/clipboard-interceptor.test.ts`
- `tests/unit/ui/widget/RestoreToast.test.tsx`

**Modify (major):**
- `src/content/orchestrator.ts` — create and wire MaskingMap + ClipboardInterceptor
- `src/ui/widget/widget-controller.ts` — populate mapping on fix, show restore toast
- `src/ui/widget/Widget.tsx` — masked count badge
- `src/ui/widget/FindingsPanel.tsx` — masked values section

**Modify (minor):**
- `src/content/observer.ts` — attach clipboard interceptor, clear mapping on navigation
- `src/ui/widget/widget.css` — badge styles
- `src/ui/widget/findings-panel.css` — masked values section styles
