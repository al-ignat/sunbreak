---
title: "feat: Inline Detection UX — Replace Blocking Overlay with Real-Time Widget"
type: feat
status: active
date: 2026-03-06
origin: docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md
---

# Inline Detection UX

## Enhancement Summary

**Deepened on:** 2026-03-06
**Research agents used:** Text overlay positioning, reactive state patterns, accessibility, architecture review, performance analysis, security audit, Preact signals exploration, frontend design review

### Critical Findings (Must Address Before Implementation)

1. **FindingsState diff must match by `type + value`, not indices** — indices shift on every keystroke, causing 100% finding churn and lost fix/ignore status. Use `type + value` with occurrence-order tiebreaker.
2. **Cache keyword regexes** — current `detectKeywords()` builds `new RegExp()` per keyword per call. At 2 calls/sec with 20 keywords = 40 regex compilations/sec. Build once on keyword-list change.
3. **Replace `innerHTML` in `setParagraphText` before v0.2** — use `createElement` + `textContent` to eliminate XSS fragility and Trusted Types breakage on Gemini. This is a prerequisite task.
4. **Upgrade bypass flag to nonce pattern** — replace boolean `bypassNext` with `crypto.randomUUID()` on a synthetic event property. Eliminates race condition window.
5. **Dual-pipeline risk during Phases 1-3** — orchestrator must read from `FindingsState` on submit, not re-classify independently. Otherwise widget and overlay show different finding counts.

### Key Improvements

- Concrete code patterns for text overlay positioning (TreeWalker + Range + getClientRects)
- CSS Custom Highlight API identified as progressive enhancement for Chrome
- Batch read-then-write pattern for getClientRects to prevent layout thrashing
- `fixAll()` must be a single-pass batch operation, not sequential `fix()` calls
- Scanner interface should be async from day one (future Web Worker migration)
- `FindingsState` needs `isScanning` flag for widget state
- `TextOverlay` must expose `findingAtPoint(x, y)` API for hover card coupling
- Storage types need `fixedCount`/`ignoredCount` in DailyStats (not automatic)
- MutationObserver as fallback for `input` events (ProseMirror may swallow them)

---

## Overview

Replace the current blocking overlay (classify-on-submit, modal with Redact/Edit/Send Anyway/Cancel) with a real-time inline detection system. Classification runs continuously as the user types and pastes. Findings appear as inline underlines with a corner widget, hover cards, and a findings panel. Submission is never blocked — at most a 3-second auto-dismissing toast.

This is the biggest architectural shift in v0.2 and the foundation that Features 1 (Smart Reversible Masking) and 5 (AI Adoption Hub micro-tips) build on.

## Pillar 1 Ordering Rationale

**Feature 3 (this) must come before Feature 1 (Smart Reversible Masking).**

Feature 1 is ~60% UI work — masking badge near input, clipboard restore toast, per-finding "Fix" button behavior. If built on the current blocking overlay, all that UI gets thrown away when this feature replaces it. The classifier-level changes in Feature 1 (descriptive token generation) carry forward, but the overlay UI does not.

Feature 2 (Company-Specific Classification) is almost entirely classifier-layer work — custom patterns, templates, import/export. It has no content script UI dependency and can be developed before, after, or in parallel.

**Recommended Pillar 1 order:** Feature 3 -> Feature 1 -> Feature 2 (or Feature 2 in parallel anytime).

## Problem Statement

The current v0.1 flow is **reactive and disruptive**:

1. User writes prompt, hits Enter
2. Extension blocks submission (preventDefault + stopImmediatePropagation at capture phase)
3. Classifier runs on the full text
4. Blocking modal overlay appears with findings
5. User must choose an action before the prompt can go

This creates friction at the worst moment — when the user is ready to send. It feels like a security guard, not a companion. The brainstorm's core principle is: **"Enable, never restrict. Any hint of restriction pushes users back to shadow AI."** (see brainstorm: Feature 3, "The fundamental shift").

## Proposed Solution

Shift from "block-then-ask" to "watch-then-nudge":

- **Classify continuously** — on paste (immediate), on typing pause (500ms debounce), on focus change
- **Show findings inline** — dotted underlines over detected text, corner widget with count
- **One-click fixes** — hover card per finding with "Fix" (mask) and "Ignore" actions
- **Never block submission** — if unresolved findings remain, show a 3-second toast; auto-dismiss proceeds with logging

## Prerequisites (Before Phase 1)

Two changes to existing code should land first as a small prep PR:

**1. Replace `innerHTML` in `setParagraphText` (`src/content/sites/dom-utils.ts:23-34`)**

```typescript
// BEFORE (fragile, Trusted Types risk on Gemini)
input.innerHTML = paragraphs;

// AFTER (safe DOM API)
function setParagraphText(input: HTMLElement, text: string): void {
  while (input.firstChild) input.removeChild(input.firstChild);
  for (const line of text.split('\n')) {
    const p = document.createElement('p');
    p.textContent = line || '\u200B'; // zero-width space for empty lines
    input.appendChild(p);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
```

**2. Cache keyword regexes (`src/classifier/keywords.ts`)**

Build `RegExp` objects once when the keyword list changes (in the orchestrator's `chrome.storage.onChanged` listener), not on every `classify()` call. Pass pre-compiled patterns to the detector.

## Technical Approach

### Architecture

```
                   Text changes (paste/debounce/focus)
                              |
                              v
                    +---------+----------+
                    |  scanner.ts        |
                    |  (debounced        |
                    |   classify calls)  |
                    +---------+----------+
                              |
                              v
                    +---------+----------+
                    |  findings-state.ts |
                    |  (active/fixed/    |
                    |   ignored per      |
                    |   finding)         |
                    +---------+----------+
                       |    |    |
              +--------+    |    +--------+
              v             v             v
        +---------+  +----------+  +----------+
        | Widget  |  | Findings |  | Send     |
        | (pill)  |  | Panel    |  | Toast    |
        +---------+  +----------+  +----------+
              |             |
              v             v
        +---------+  +----------+
        | Text    |  | Hover    |
        | Overlay |  | Card     |
        | (lines) |  |          |
        +---------+  +----------+
```

**Key state:** `FindingsState` — a reactive store holding current findings, each marked `active | fixed | ignored`, plus an `isScanning` flag. All UI components subscribe to this state. The scanner updates it on each classification run, diffing new findings against previous ones (preserving fix/ignore status for findings that haven't changed).

### Current Architecture (what changes)

| Component | v0.1 | v0.2 |
|-----------|------|------|
| **Classification trigger** | On submit only (`interceptor.ts:64-137`) | Continuous: paste, 500ms debounce, focus change (`scanner.ts` — new) |
| **Findings lifecycle** | Ephemeral — exists only during overlay promise | Persistent per-prompt — tracked in `findings-state.ts` |
| **Primary UI** | Blocking `WarningBanner` in closed Shadow DOM | Corner widget + findings panel + hover cards in Shadow DOM |
| **Submission handling** | Block -> classify -> overlay -> release/block | Check findings state -> toast if unresolved -> always release |
| **Overlay controller** | `overlay-controller.ts` — `show()` returns `Promise<OverlayAction>` | Removed in Phase 4. Widget/panel are always-mounted, reactively driven by state |
| **Interceptor** | Blocks all submits, complex bypass flag pattern | Lighter: checks findings state, shows toast if needed, never fully blocks |

### Transition Strategy

**Architectural invariant:** The old overlay remains functional as a fallback through Phase 3. It is only removed in Phase 4 after the new widget+panel are confirmed working.

- **Phase 1:** Scanner and FindingsState are created. The orchestrator's `onPromptIntercepted` reads `FindingsState.activeCount` to decide whether to show the old overlay (instead of re-classifying). This prevents dual-pipeline divergence.
- **Phases 2-3:** Widget and panel appear alongside the old overlay. Users can fix/ignore findings in real-time. The old overlay triggers on submit only if active findings remain.
- **Phase 4:** Old overlay removed. Toast replaces it. Interceptor simplified.

### What Stays Unchanged

- **Classifier engine** (`src/classifier/`) — all detectors, `classify()`, deduplication, confidence scoring. Completely reused.
- **Site adapters** (`src/content/sites/`) — `findInput()`, `getText()`, `setText()`, `findSendButton()`. Extended but not rewritten.
- **Storage layer** (`src/storage/`) — event logging, settings cache. Extended with new action types.
- **Background script** (`src/entrypoints/background.ts`) — unchanged.
- **Dashboard** (`src/ui/dashboard/`) — needs minor updates for new action types in stats.

### Implementation Phases

#### Phase 1: Continuous Classification Pipeline + Findings State

**Goal:** Classification runs on text changes, findings state managed in memory. No new UI yet — old overlay reads from FindingsState on submit.

**New files:**
- `src/content/scanner.ts` — debounced classification trigger
- `src/content/findings-state.ts` — findings state manager
- `tests/unit/scanner.test.ts`
- `tests/unit/findings-state.test.ts`

**`scanner.ts` responsibilities:**
- Listen for `input` events on the editor element (bubbles from ProseMirror/Quill)
- Listen for `paste` events (classify immediately, no debounce)
- Listen for `focus` events (classify on re-focus after tab switch)
- **Fallback:** Also observe editor via `MutationObserver` on `characterData` and `childList` (ProseMirror replaces nodes on edit and may not fire standard `input` events reliably)
- Debounce input events at 500ms (reset timer on each input)
- **Early exit:** Compare text against last classified text via `===` before calling classify. Skip if unchanged. Eliminates ~30-50% of redundant calls (focus/blur cycles, cursor movement).
- Call `classify(text, options)` with cached settings (reuse orchestrator's caching pattern from `orchestrator.ts:89-124`)
- **Async interface:** `scanner.scan()` should return `Promise<void>` even though current classification is synchronous. This makes future Web Worker migration a drop-in replacement.
- Pass results to findings state
- Pause debounce timer on `document.visibilitychange` (hidden tabs)
- Clear FindingsState on `wxt:locationchange` (SPA navigation)

**`findings-state.ts` responsibilities:**
- Hold current `FindingsState`: array of `TrackedFinding` objects
- `TrackedFinding` = `Finding & { status: 'active' | 'fixed' | 'ignored'; id: string }`
- **ID generation:** Deterministic hash — `id = hash(type + ':' + startIndex + ':' + endIndex + ':' + value)`. IDs derived from content, not random. Stable across re-classifications when the finding hasn't changed.
- `isScanning: boolean` — set by scanner before calling classify, cleared after update. Widget subscribes to this for scanning indicator.
- `update(newFindings: Finding[])` — diff against current state:
  - **Match by `type + value` with occurrence-order tiebreaker** (not by indices — indices shift on every keystroke, causing 100% churn and lost status)
  - Algorithm: Build Map from new findings keyed by `${type}:${value}`. For each previous TrackedFinding, look up by key. If found, carry forward status and consume from array (FIFO). Remaining unconsumed findings default to `active`. O(n) with Map lookup.
  - Findings no longer in text are removed
- `fix(id: string)` — mark as `fixed`, trigger text replacement via callback (not direct adapter import — preserves testability)
- `fixAll()` — **batch operation**: compute fully-redacted text in one pass using `buildRedactedText()`, call `adapter.setText()` once, update all findings to `fixed` status optimistically. Do NOT implement as sequential `fix()` calls (each would trigger setText and re-classification on intermediate states).
- `ignore(id: string)` — mark as `ignored`
- `activeCount` — count of findings with status `active`
- `subscribe(listener)` — notify on state changes (simple callback pattern, no framework dependency)
- `clear()` — reset when prompt is sent or cleared. Overwrite finding values before replacing reference (defense-in-depth for memory hygiene):
  ```typescript
  clear(): void {
    for (const f of this.findings) {
      (f as { value: string }).value = '';
    }
    this.findings = [];
    this.notify();
  }
  ```

**Modified files:**
- `src/content/observer.ts` — attach scanner alongside interceptor
- `src/content/orchestrator.ts` — create scanner and findings state, wire together. **On submit, read `FindingsState.activeCount` instead of re-classifying.**
- `src/entrypoints/content.ts` — pass scanner to orchestrator setup

**Success criteria:**
- [x] Classification runs on paste (immediate) and typing (500ms debounce)
- [x] FindingsState correctly diffs by `type + value` and preserves fix/ignore status across text edits
- [x] Classification stays < 50ms (existing budget)
- [x] Skips classification when text is unchanged
- [ ] Old overlay reads from FindingsState on submit (no dual classification)
- [ ] FindingsState clears on SPA navigation
- [x] All unit tests pass

##### Phase 1 Research Insights

**Performance:**
- At 2 calls/sec on a 50K-char prompt, the current classifier runs under 50ms. No Web Worker needed yet — add that when ML inference (50-300ms) arrives in v0.3+.
- `requestIdleCallback` is NOT appropriate for the debounced typing path (user already waited 500ms). Use it only for initial page-load classification and post-fix re-classification.
- The IPv6 regex (`ip-address.ts:19-20`) has catastrophic backtracking risk on adversarial input (long hex-colon strings). Add targeted performance tests.

**Testing:**
- Add adversarial performance tests: 50K chars of hex-colon strings (IPv6 stress), 50K chars with 100+ email-like patterns, 50K chars with 50 keywords. Verify all stay under 50ms.

#### Phase 2: Corner Widget

**Goal:** Always-present pill near chat input showing detection status.

**New files:**
- `src/ui/widget/Widget.tsx` — Preact component
- `src/ui/widget/widget.css` — styles (injected into Shadow DOM)
- `tests/unit/widget.test.ts`

**Widget states:**

```
Clean:       [sun-icon] Sunbreak  [checkmark]     (green accent, semi-transparent)
Scanning:    [sun-icon] Sunbreak  [spinner]       (neutral, semi-transparent)
Findings:    [sun-icon] Sunbreak  (3)             (red badge, slightly more opaque)
```

**Behavior:**
- ~120px pill, positioned near bottom-right of chat input area
- Semi-transparent until hovered (0.6 -> 1.0 opacity)
- Click toggles findings panel open/close
- Badge count = `findingsState.activeCount` (excludes fixed/ignored)
- Subscribes to `FindingsState` for reactive updates (both `activeCount` and `isScanning`)
- Rendered in same closed Shadow DOM container (WXT `createShadowRootUi`)

**Positioning strategy:**
- Use `position: fixed` with coordinates from `adapter.findInput().getBoundingClientRect()`
- Check for transformed ancestors — if `transform !== 'none'` on any ancestor, fall back to `position: absolute` relative to the nearest transformed ancestor
- Recalculate on scroll and resize (throttled to rAF)
- If input element is detached (SPA nav), widget hides until re-attached
- Round to whole pixels: `Math.round(rect.left)` to avoid sub-pixel rendering issues with zoom

**CSS injection:** Concatenate all widget CSS modules into a single `<style>` element injected once at Shadow DOM creation. Do not inject per-component styles — eliminates redundant CSS parsing and Trusted Types issues.

**Modified files:**
- `src/content/orchestrator.ts` — mount widget component in Shadow DOM
- `src/types/adapter.ts` — no changes needed (widget positions relative to `findInput()`)

**Success criteria:**
- [x] Widget visible on ChatGPT, Claude, and Gemini
- [x] Correctly shows clean/scanning/findings states
- [x] Does not interfere with host page interaction
- [x] Semi-transparent when idle, fully opaque on hover
- [x] Badge count updates reactively
- [x] Positioning adapts to scroll, resize, and zoom

##### Phase 2 Research Insights

**Accessibility:**
- Widget should have `role="status"` with `aria-live="polite"` for the badge count — screen readers announce count changes without interrupting
- Click target should be `role="button"` with `aria-expanded="true|false"` reflecting panel state
- `aria-label="Sunbreak: 3 findings detected"` for the pill when in findings state

**Positioning gotchas:**
- If any ancestor has CSS `transform`, `getBoundingClientRect()` returns transformed-space coordinates but `position: fixed` ignores transforms. Detect with `getComputedStyle(parent).transform !== 'none'` and switch to absolute positioning.
- Editor may be inside a scrollable container — use `getScrollParent()` to find the right container for scroll listener attachment.

#### Phase 3: Findings Panel + Fix/Ignore Actions

**Goal:** Dropdown panel from widget listing all findings with per-finding and bulk actions.

**New files:**
- `src/ui/widget/FindingsPanel.tsx` — Preact component
- `src/ui/widget/findings-panel.css`
- `tests/unit/findings-panel.test.ts`

**Panel layout (from brainstorm):**

```
+----------------------------------+
|  3 findings              Fix All |
|----------------------------------|
|  [red]  sk-proj-a8x...  [ Fix ] |
|  [orange] john.smith@... [ Fix ] |
|  [amber] +45 12 34 56   [ Fix ] |
|----------------------------------|
|  Fix All = mask & safe to send   |
+----------------------------------+
```

**Behavior:**
- Opens below/above widget (auto-flip based on viewport space)
- Findings grouped by severity color (red/orange/amber/blue per brainstorm table)
- Each finding shows: color dot, truncated value, "Fix" and "Ignore" buttons
- "Fix" calls `findingsState.fix(id)` which triggers text replacement via callback
- "Ignore" calls `findingsState.ignore(id)` — finding disappears from panel, count decrements
- "Fix All" calls `findingsState.fixAll()` — single-pass batch replacement
- Panel closes on click outside or Escape key
- Keyboard navigable: Tab through findings, Enter to fix

**Severity color mapping (from brainstorm):**

| Color | Category | Finding types |
|-------|----------|---------------|
| Red | Credentials & secrets | `api-key` |
| Orange | Identity data | `ssn`, `cpr`, `ni-number`, `credit-card` |
| Amber | Contact info | `email`, `phone` |
| Blue | Custom patterns | `keyword`, `ip-address` |

**Modified files:**
- `src/ui/widget/Widget.tsx` — add click handler to toggle panel
- `src/content/findings-state.ts` — `fix()` and `fixAll()` call adapter.setText() via callback

**Success criteria:**
- [ ] Panel shows all active findings with correct severity colors
- [ ] "Fix" replaces individual finding in input text
- [ ] "Fix All" replaces all active findings in a single batch
- [ ] "Ignore" dismisses finding for this prompt
- [ ] Panel keyboard accessible (Tab, Enter, Escape)
- [ ] Badge count updates after fix/ignore

##### Phase 3 Research Insights

**Accessibility:**
- Panel should have `role="dialog"` with `aria-label="Sunbreak findings"` and focus trap
- Each finding row: `role="listitem"` inside a `role="list"` container
- "Fix" and "Ignore" buttons need `aria-label` with context: `aria-label="Fix email john.smith@acme.com"`
- On panel open, focus moves to first finding. On close (Escape or click outside), focus returns to widget button.
- Announce actions via `aria-live="assertive"` region: "Email fixed. 2 findings remaining."

**Fix loop safety:** The fix -> setText -> re-classification loop terminates because placeholders like `[EMAIL_1]` don't match detector regexes. Each fix strictly reduces findings. However, `fixAll()` must NOT be sequential `fix()` calls — each intermediate `setText()` would trigger the scanner on partially-replaced text with shifted indices.

#### Phase 4: Send-Time Toast + Interceptor Refactor

**Goal:** Replace blocking overlay with non-blocking toast. Submission is never fully blocked.

**New files:**
- `src/ui/widget/SendToast.tsx` — Preact component
- `src/ui/widget/send-toast.css`
- `tests/unit/send-toast.test.ts`

**Toast layout (from brainstorm):**

```
+----------------------------------+
|  ! 2 unfixed findings            |
|  [ Review ]  [ Send Anyway ]     |
+----------------------------------+
```

**Behavior:**
- Appears near send button when user submits with active findings
- 3-second countdown, auto-dismisses
- "Review" opens findings panel, pauses countdown
- "Send Anyway" dismisses immediately, logs event, releases submission
- Auto-dismiss after 3 seconds: logs event, releases submission
- If user dismisses panel after "Review" without fixing: toast reappears with remaining time
- **If no active findings at submit time: zero interception, zero delay, zero UI**

**Interceptor refactor (`src/content/interceptor.ts`):**

The interceptor's role simplifies dramatically:

```
v0.1: Block submit -> classify -> show overlay -> wait for action -> release/block
v0.2: Check findingsState.activeCount -> if 0: pass through -> if >0: show toast -> always release
```

- Keep capture-phase handlers on window (still need to fire before framework)
- Instead of blocking + running classifier + showing overlay, check `findingsState.activeCount` **via callback** (keep the existing indirection pattern — don't import FindingsState directly. Preserves testability.)
- If 0: immediately return (don't even preventDefault)
- If >0: preventDefault, show toast, start 3-second timer
- On toast action or timeout: re-trigger submission via **nonce-based bypass** (replaces boolean flag)

**Nonce-based bypass pattern (replaces `bypassNext` boolean):**

```typescript
let bypassToken: string | null = null;

// In handler:
const event = e as KeyboardEvent & { _byoaiBypass?: string };
if (event._byoaiBypass === bypassToken) {
  bypassToken = null;
  return; // Let through
}

// When re-triggering:
bypassToken = crypto.randomUUID();
const syntheticEvent = new KeyboardEvent('keydown', { ... });
Object.defineProperty(syntheticEvent, '_byoaiBypass', { value: bypassToken });
target.dispatchEvent(syntheticEvent);
```

A page script in the main world cannot read properties set by the content script's isolated world on the same event object. This eliminates the 100ms race window entirely.

**Files removed:**
- `src/ui/overlay/overlay-controller.ts`
- `src/ui/overlay/WarningBanner.tsx`
- `src/ui/overlay/WarningBanner.css`
- `src/ui/overlay/types.ts`

**Modified files:**
- `src/content/interceptor.ts` — simplify to findings-state check + toast + nonce bypass
- `src/content/orchestrator.ts` — remove overlay creation, wire toast
- `src/storage/types.ts` — add `'fixed' | 'ignored'` to `FlaggedEvent.action` union. Add `fixedCount` and `ignoredCount` to `DailyStats`.
- `src/storage/events.ts` — log new action types, update `doIncrementDailyStat` for new counters

**Success criteria:**
- [ ] Zero interception when no active findings (prompt sends instantly)
- [ ] Toast appears when submitting with active findings
- [ ] Toast auto-dismisses after 3 seconds, submission proceeds
- [ ] "Review" opens findings panel
- [ ] "Send Anyway" proceeds immediately with logging
- [ ] Old overlay completely removed
- [ ] Nonce-based bypass replaces boolean flag
- [ ] Dashboard stats include fixed/ignored counts
- [ ] All existing E2E tests updated and passing

##### Phase 4 Research Insights

**Accessibility:**
- Toast should use `role="alertdialog"` with `aria-live="assertive"` — announces content immediately to screen readers
- Do NOT move focus to toast (interrupts typing flow). Use aria-live for announcement only.
- "Review" and "Send Anyway" should be keyboard accessible via Tab from the editor area

**Security:**
- The nonce pattern is strictly more secure than the boolean flag. `crypto.randomUUID()` provides 122 bits of entropy. A page script cannot guess the nonce and cannot read properties set by the content script.
- The 100ms `setTimeout` reset can be removed entirely with the nonce approach.

#### Phase 5: Inline Underlines (Progressive Enhancement)

**Goal:** Dotted underlines on detected text in the editor. This is the technically riskiest phase — includes a designed fallback.

**New files:**
- `src/ui/widget/TextOverlay.tsx` — positioned overlay for underlines
- `src/ui/widget/text-overlay.css`
- `tests/unit/text-overlay.test.ts`

**Underline colors (from brainstorm):**

| Color | Category |
|-------|----------|
| Red (dotted) | Credentials & secrets (`api-key`) |
| Orange (dotted) | Identity data (`ssn`, `cpr`, `ni-number`, `credit-card`) |
| Amber (dotted) | Contact info (`email`, `phone`) |
| Blue (dotted) | Custom patterns (`keyword`, `ip-address`) |

Dotted style distinguishes from browser spellcheck (solid red).

**Implementation approach — Transparent Overlay + Range.getClientRects() (Approach A):**

This is the Grammarly-proven pattern. A transparent `<div>` with `pointer-events: none` is positioned over the editor, inside our Shadow DOM. String match offsets are mapped to DOM text nodes using a `TreeWalker`, then `Range.getClientRects()` returns pixel positions for underline rendering.

**Core code pattern — mapping string offsets to DOM Ranges:**

```typescript
function createRangeFromOffsets(
  root: HTMLElement, startOffset: number, endOffset: number
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charIndex = 0;
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const nodeLen = textNode.textContent?.length ?? 0;
    if (!startNode && charIndex + nodeLen > startOffset) {
      startNode = textNode;
      startNodeOffset = startOffset - charIndex;
    }
    if (!endNode && charIndex + nodeLen >= endOffset) {
      endNode = textNode;
      endNodeOffset = endOffset - charIndex;
      break;
    }
    charIndex += nodeLen;
  }
  if (!startNode || !endNode) return null;
  const range = new Range();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  return range;
}
```

**Rendering underlines — batch read-then-write:**

```typescript
// READ phase (one forced reflow at most)
const allRects: DOMRect[][] = [];
for (const finding of findings) {
  const range = createRangeFromOffsets(editor, finding.startIndex, finding.endIndex);
  allRects.push(range ? Array.from(range.getClientRects()) : []);
}

// WRITE phase (update overlay positions — no reflows)
for (let i = 0; i < findings.length; i++) {
  renderUnderlineSpans(overlayEl, allRects[i], containerRect, severityColor(findings[i]));
}
```

This read-then-write pattern reduces worst-case reflows from N (number of findings) to 1.

**Scroll handling — compositor-only:**
Use `transform: translate(0, ${scrollDelta}px)` on the overlay container instead of updating `top`/`left` on individual underline elements. Translation is a compositor-only operation — no layout triggered.

**Public API:** `TextOverlay` must expose `findingAtPoint(x: number, y: number): TrackedFinding | null` for Phase 6 hover card coupling.

**Progressive enhancement — CSS Custom Highlight API:**
For Chrome-only, the CSS Custom Highlight API can style text ranges natively without any DOM overlay:

```typescript
if (CSS.highlights) {
  const ranges = findings.map(f => createRangeFromOffsets(editor, f.startIndex, f.endIndex));
  CSS.highlights.set('sunbreak-sensitive', new Highlight(...ranges.filter(Boolean)));
}
```

```css
::highlight(sunbreak-sensitive) {
  text-decoration: underline dotted red;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
```

This is a future enhancement — the overlay approach is the primary implementation because it supports multiple colors per finding and works across all browsers.

**Positioning gotchas:**
- **Scroll containers:** Editor is usually inside a scrollable parent. Use `position: fixed` with viewport coordinates from `getClientRects()`, clipped to editor bounds.
- **CSS transforms on ancestors:** If any ancestor has `transform !== 'none'`, `position: fixed` breaks. Detect and switch to `position: absolute`.
- **Zoom:** `getClientRects()` returns CSS pixels that account for zoom. Round to whole pixels with `Math.round()`.
- **Iframes:** Not currently an issue (ChatGPT, Claude, Gemini all use same-document editors). If a future site uses iframes, the adapter would need `allFrames` in WXT config.

**Recalculation triggers:**

| Event | Action |
|-------|--------|
| Findings state change | Full recalc of underline positions |
| Scroll | Translate overlay container only (cheap, no getClientRects) |
| Window/editor resize | Full recalc |
| MutationObserver `characterData`/`childList` | Full recalc of affected underlines |

**Fallback strategy (from brainstorm):**
> "Fallback: show findings only in widget popover if precise positioning is too fragile for a given site adapter."

If position calculation fails for a site, that adapter skips underlines. The `SiteAdapter` interface gains an optional `supportsOverlay?: boolean` flag.

**Modified files:**
- `src/types/adapter.ts` — optional `supportsOverlay` flag, optional `getTextNodes()` method
- `src/ui/widget/Widget.tsx` — mount TextOverlay alongside widget

**Success criteria:**
- [ ] Underlines appear at correct positions on at least ChatGPT and Claude
- [ ] Underlines use correct colors per category
- [ ] Underlines reposition on scroll (translate-only, no reflow) and resize (full recalc)
- [ ] Underlines disappear when finding is fixed or ignored
- [ ] Graceful fallback (no underlines, findings in panel only) on failure
- [ ] No interference with editor functionality (typing, selection, cursor)
- [ ] `findingAtPoint()` API exposed for hover card integration

#### Phase 6: Hover Cards

**Goal:** Contextual information and actions on hover over underlined text.

**New files:**
- `src/ui/widget/HoverCard.tsx` — Preact component
- `src/ui/widget/hover-card.css`
- `tests/unit/hover-card.test.ts`

**Hover card layout (from brainstorm):**

```
+----------------------------------+
|  [icon] Email address            |
|                                  |
|  john.smith@acme.com             |
|  ->                              |
|  [EMAIL_1]                       |
|                                  |
|  [ Fix ]  [ Ignore ]    ...     |
+----------------------------------+
```

Note: The masked preview uses the current v0.1 placeholder format (`[EMAIL_1]`) until Feature 1 (Smart Reversible Masking) upgrades it. This is by design — Feature 1 builds on this UI.

**Behavior:**
- Appears on hover over underlined text (or click on finding in panel)
- Shows: finding type icon, original value, masked preview
- "Fix" replaces this finding with placeholder in input
- "Ignore" dismisses for this prompt
- Overflow menu (...): "Ignore all [type] in this prompt", "Turn off [type] detection"
- Card disappears on mouse leave (with 200ms delay to allow entering the card)
- Positioned above or below the underline, auto-flips based on viewport

**Hover detection:**
- Use `TextOverlay.findingAtPoint(e.clientX, e.clientY)` to map mouse position to finding
- Show hover card for the matching finding
- If no underlines (fallback mode): clicking a finding in the panel highlights it in editor and opens hover card anchored to the panel item

**Modified files:**
- `src/ui/widget/TextOverlay.tsx` — hover detection, pass finding to HoverCard
- `src/ui/widget/FindingsPanel.tsx` — click finding opens hover card in fallback mode
- `src/content/findings-state.ts` — add "Ignore all [type]" and "Turn off [type]" actions

**Success criteria:**
- [ ] Hover card appears on underline hover
- [ ] Shows correct finding type, value, and placeholder preview
- [ ] "Fix" and "Ignore" actions work
- [ ] Overflow menu actions work
- [ ] Card disappears cleanly on mouse leave
- [ ] Works in fallback mode (panel click) when underlines are unavailable

##### Phase 6 Research Insights

**Accessibility:**
- Hover cards must also be keyboard-accessible — triggered by focus on the underlined text range (Tab to finding in panel, then Enter to open card)
- `role="tooltip"` with `aria-describedby` linking to the hover card content
- Overflow menu: `role="menu"` with `role="menuitem"` children

### Testing & Cleanup (Cross-Phase)

After each phase, before moving to the next:
- [ ] Run `npm run test` — all unit tests pass
- [ ] Run `npm run lint` — no lint errors
- [ ] Manual test on ChatGPT, Claude, and Gemini with `npm run dev`
- [ ] Verify no host page breakage after 10 min of use

After all phases:
- [ ] Remove `src/ui/overlay/` directory entirely
- [ ] Update `tests/e2e/` for new interaction model
- [ ] Update `docs/founding/founding-PLAN.md` to reflect v0.2 progress
- [ ] Update `DailyStats` counters in dashboard components for new action types

## System-Wide Impact

### Interaction Graph

Content script boot sequence changes:
1. `content.ts` -> `selectAdapter()` -> `createOrchestrator()` (same as v0.1)
2. `startObserving()` now also attaches scanner (input/paste/focus listeners + MutationObserver fallback)
3. Scanner -> `classify()` -> `FindingsState.update()` -> Widget/Panel/Underlines re-render
4. Interceptor reads `FindingsState.activeCount` on submit via callback (no longer runs classifier)

**Downstream effects of `FindingsState.fix()`:**
1. `adapter.setText()` replaces text in editor (single call)
2. Editor fires `input` event (from `setParagraphText` in dom-utils.ts)
3. Scanner picks up input event, compares text via `===` — text changed, re-classifies after 500ms debounce
4. FindingsState updates — the fixed finding is gone from new results
5. Widget badge decrements

**Downstream effects of `FindingsState.fixAll()` (batch):**
1. `buildRedactedText()` computes all replacements in one pass (right-to-left)
2. `adapter.setText()` called once with fully-redacted text
3. All findings marked `fixed` optimistically (before re-classification confirms)
4. Scanner re-classifies after 500ms — confirms all findings gone

### Error Propagation

- Scanner errors (classification fails): log to console, widget shows last known state. Never crash the page.
- Text overlay positioning errors: caught per-adapter, falls back to panel-only mode. No user-visible error.
- Toast timeout race: if user navigates away during 3-second toast, cleanup runs via `ctx.onInvalidated()` (WXT content script context).

### State Lifecycle Risks

- **SPA navigation** (ChatGPT/Claude route changes): Scanner, widget, and FindingsState must all reset. Trigger on `wxt:locationchange` event (existing pattern in `observer.ts:182-188`).
- **Tab backgrounding**: `document.visibilitychange` pauses scanner debounce timer. No wasted classification on hidden tabs.
- **Multiple rapid pastes**: Each paste triggers immediate classification. FindingsState.update() is synchronous and idempotent — rapid calls are safe. Widget re-render throttled via requestAnimationFrame.
- **Input event reliability**: ProseMirror may not fire standard `input` events consistently. Scanner uses `MutationObserver` on `characterData`/`childList` as fallback detection of text changes.

### API Surface Parity

The `SiteAdapter` interface gains optional members in Phase 5:
- `supportsOverlay?: boolean` (default true)
- `getTextNodes?(input: HTMLElement): Text[]` (optional, for underline positioning)

Existing adapters continue to work without changes through Phase 4. Phase 5 adds overlay support progressively.

### Storage Type Expansion

`FlaggedEvent.action` gains `'fixed' | 'ignored'`. `DailyStats` gains `fixedCount: number` and `ignoredCount: number`. These cascade into:
- `src/storage/events.ts` — `doIncrementDailyStat` needs new counter branches
- `src/ui/dashboard/ReportCards.tsx` — may want to show fix/ignore rates
- `src/ui/dashboard/ActivityLog.tsx` — new action types in event display
- `src/ui/dashboard/BarChart.tsx` — new data series if desired

## Acceptance Criteria

### Functional Requirements

- [ ] Classification runs on paste (immediate) and typing (500ms debounce after pause)
- [ ] Corner widget shows clean/scanning/findings states with correct badge count
- [ ] Findings panel lists all active findings with severity colors
- [ ] "Fix" replaces individual finding with placeholder in the editor
- [ ] "Fix All" replaces all active findings in a single batch operation
- [ ] "Ignore" dismisses finding for this prompt
- [ ] Send-time toast appears when submitting with active findings
- [ ] Toast auto-dismisses after 3 seconds, submission proceeds with logging
- [ ] "Review" opens findings panel, "Send Anyway" proceeds immediately
- [ ] Zero interception and zero UI delay when no active findings
- [ ] Works on ChatGPT, Claude, and Gemini

### Non-Functional Requirements

- [ ] Classification < 50ms (existing budget, unchanged)
- [ ] Classification skipped when text is unchanged
- [ ] Widget mount < 50ms
- [ ] Toast-to-release < 3 seconds
- [ ] No host page breakage after 30 minutes of continuous use
- [ ] Page load increase < 100ms (existing budget)
- [ ] Zero network requests from extension
- [ ] getClientRects calls batched (read-then-write, max 1 reflow per update)
- [ ] Scroll handling uses transform:translate (compositor-only, no layout)

### Accessibility

- [ ] Widget has `role="status"` with `aria-live="polite"` for badge count
- [ ] Widget button has `aria-expanded` reflecting panel state
- [ ] Findings panel has `role="dialog"` with focus trap and `aria-label`
- [ ] Toast has `role="alertdialog"` with `aria-live="assertive"` (does not steal focus)
- [ ] All interactive elements have visible focus indicators
- [ ] Action announcements via aria-live: "Email fixed. 2 findings remaining."
- [ ] Hover cards keyboard-accessible (focus trigger, not only hover)
- [ ] Underline colors pass WCAG AA contrast on white/dark backgrounds

### Quality Gates

- [ ] All new components have unit tests with min 5 positive and 5 negative cases
- [ ] Adversarial performance tests (IPv6 stress, mass emails, many keywords) pass < 50ms
- [ ] E2E tests updated for new interaction model on all three AI tools
- [ ] Manual QA on ChatGPT, Claude, Gemini with real prompts
- [ ] Old overlay code fully removed — no dead code

## Dependencies & Prerequisites

- **Prerequisite PR:** Replace `innerHTML` in `setParagraphText` + cache keyword regexes
- **No new external dependencies** — all new UI is Preact + CSS in existing Shadow DOM
- **No new permissions** — no manifest changes needed for this feature
- Feature 1 (Smart Reversible Masking) depends on this feature's "Fix" action UX
- Feature 5 (AI Adoption Hub micro-tips) depends on this feature's widget for tip placement

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Inline underline positioning breaks on site DOM changes | High | Low | Fallback: panel-only mode. Widget + panel provide full functionality without underlines. |
| Continuous classification causes noticeable CPU usage | Medium | Medium | 500ms debounce, skip if text unchanged, async interface for future Worker. |
| Widget overlaps AI tool's own UI elements | Medium | Low | Per-adapter positioning offsets. CSS transform ancestor detection. |
| Re-classification after "Fix" creates flash of stale state | Low | Low | Optimistic update: mark as fixed immediately, before re-classification confirms. |
| Gemini Trusted Types CSP blocks DOM manipulation | Low | High | Prerequisite: replace innerHTML with createElement+textContent. |
| Bypass flag race condition allows uninspected submission | Medium | Medium | Nonce-based bypass with crypto.randomUUID() replaces boolean flag. |
| FindingsState churn on every keystroke | High | High | Match by `type + value` not indices. Eliminates index-shift problem entirely. |
| fixAll() on intermediate states causes corrupt text | Medium | High | Batch operation: single buildRedactedText() + single setText(), not sequential fix() calls. |
| ProseMirror swallows input events | Medium | Medium | MutationObserver on characterData/childList as fallback text-change detection. |

## Institutional Learnings to Apply

From `docs/solutions/`:

1. **Preact hooks + Shadow DOM** — always use `h(Component, props)`, never call components as functions (see `docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md`)
2. **Right-to-left text replacement** — sort findings by `startIndex` descending when replacing. Already implemented in `buildRedactedText()` (`interceptor.ts:205`)
3. **Bypass flag + 100ms timeout** — **upgraded to nonce pattern** in this plan. Original pattern documented at `interceptor.ts:54,139-163`
4. **Cleanup in afterEach** — Preact Testing Library doesn't auto-cleanup. Required for all component tests.
5. **Trusted Types on Gemini** — use `createElement` + `textContent`, not `innerHTML`. Prerequisite PR addresses this.
6. **Selective storage listeners** — only refresh data for changed keys, not blanket refresh (see `docs/solutions/code-quality/phase-5-dashboard-code-review-fixes.md`)
7. **TypeScript narrowing in closures** — assign narrowed values to fresh `const` before async callbacks

## Future Considerations

- **Feature 1 integration:** Hover cards will show descriptive tokens (`[John S. email]`) instead of robot-speak (`[EMAIL_1]`) once Feature 1 is implemented. The hover card layout already includes a "masked preview" section for this.
- **Feature 5 integration:** Micro-tips will appear as a card below the widget, triggered by user behavior (after a fix, after pasting code, etc.). The widget's Shadow DOM container and positioning logic will be reused.
- **Feature 2 integration:** Custom pattern findings will appear with blue severity color. No UI changes needed — they flow through the same FindingsState.
- **Web Worker migration (v0.3):** When ML inference (50-300ms) arrives, the scanner's async interface allows drop-in Worker migration without changing callers.
- **CSS Custom Highlight API:** Progressive enhancement for Chrome — native underline rendering without DOM overlay. Monitor Firefox support for `text-decoration` in `::highlight()`.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md](docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md) — Key decisions carried forward: inline-first UX (never block), corner widget design, severity color system, 3-second auto-dismiss toast, fallback strategy for underline positioning.

### Internal References

- Overlay controller (being replaced): `src/ui/overlay/overlay-controller.ts`
- Interceptor (being simplified): `src/content/interceptor.ts`
- Orchestrator (being refactored): `src/content/orchestrator.ts`
- Observer lifecycle: `src/content/observer.ts`
- Classifier engine (unchanged): `src/classifier/engine.ts`
- Site adapter interface: `src/types/adapter.ts`
- Storage types: `src/storage/types.ts`
- DOM utils: `src/content/sites/dom-utils.ts`

### Documented Solutions

- Preact + Shadow DOM pitfalls: `docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md`
- DOM observation patterns: `docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md`
- Dashboard storage fixes: `docs/solutions/code-quality/phase-5-dashboard-code-review-fixes.md`
- Classifier pitfalls: `docs/solutions/logic-errors/2026-03-03-pii-classifier-pitfalls.md`

### External References

- [Grammarly engineering: native-feeling underlines](https://www.grammarly.com/blog/engineering/making-grammarly-feel-native-on-every-website/)
- [MDN: CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
- [MDN: Range.getClientRects()](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects)
- [ProseMirror decoration guide](https://prosemirror.net/docs/guide/) (reviewed and rejected — too fragile for content script use)
