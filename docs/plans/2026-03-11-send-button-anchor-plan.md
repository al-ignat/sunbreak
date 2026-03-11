# Send-Button Anchor Positioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Anchor the widget to the send button's left edge (vertically centered), expanding leftward as it grows, with per-provider gap offsets and input-box fallback.

**Architecture:** Extend `computeWidgetPosition()` with a `send-button` mode that aligns the widget's right edge to the button's left edge, vertically centered. The widget-controller locates the send button via `adapter.findSendButton()`, falling back to input-box anchoring. Each site adapter declares a `widgetAnchor.gapX` value. ResizeObserver watches the send button.

**Tech Stack:** TypeScript, Preact, Vitest

---

## Task 1: Add send-button mode to position.ts

Extend the pure position function with a new anchor mode.

**Files:**
- Modify: `src/ui/widget/position.ts`
- Modify: `tests/unit/ui/widget/position.test.ts`

**Step 1: Write failing tests for send-button mode**

Add these tests to the existing `describe('computeWidgetPosition', ...)` block in `tests/unit/ui/widget/position.test.ts`:

```typescript
// Add this config at the top alongside existing configs:
const sendButton: AnchorConfig = { mode: 'send-button', gapX: 8, offsetX: 12, offsetY: 36 };

// Make a small button rect helper:
function makeButtonRect(overrides: Partial<DOMRect> = {}): DOMRect {
  // Typical send button: 36x36 near bottom-right of viewport
  const defaults = { top: 682, left: 1200, right: 1236, bottom: 718, width: 36, height: 36, x: 1200, y: 682 };
  return { ...defaults, ...overrides, toJSON: () => ({}) } as DOMRect;
}
```

Tests to add:

```typescript
describe('send-button mode', () => {
  it('positions widget right edge to left of button with gapX', () => {
    const pos = computeWidgetPosition(makeButtonRect(), defaultWidget, defaultViewport, sendButton);
    // left = buttonRect.left(1200) - widgetSize.width(140) - gapX(8) = 1052
    // top = buttonRect.top(682) + buttonRect.height(36)/2 - widgetSize.height(36)/2 = 682
    expect(pos.left).toBe(1052);
    expect(pos.top).toBe(682);
  });

  it('vertically centers widget on button midpoint', () => {
    // Tall button (60px), widget is 36px
    const tallButton = makeButtonRect({ top: 660, bottom: 720, height: 60 });
    const pos = computeWidgetPosition(tallButton, defaultWidget, defaultViewport, sendButton);
    // top = 660 + 60/2 - 36/2 = 660 + 30 - 18 = 672
    expect(pos.top).toBe(672);
  });

  it('widget expands leftward as width increases (right edge stays fixed)', () => {
    const narrow = { width: 80, height: 36 };
    const wide = { width: 200, height: 36 };
    const posNarrow = computeWidgetPosition(makeButtonRect(), narrow, defaultViewport, sendButton);
    const posWide = computeWidgetPosition(makeButtonRect(), wide, defaultViewport, sendButton);
    // Right edges should both be at buttonRect.left - gapX = 1200 - 8 = 1192
    expect(posNarrow.left + narrow.width).toBe(1192);
    expect(posWide.left + wide.width).toBe(1192);
    // Wide widget left edge is further left
    expect(posWide.left).toBeLessThan(posNarrow.left);
  });

  it('clamps to left edge of viewport', () => {
    // Button near left edge, wide widget would go negative
    const leftButton = makeButtonRect({ left: 100, right: 136 });
    const pos = computeWidgetPosition(leftButton, defaultWidget, defaultViewport, sendButton);
    // Unclamped left = 100 - 140 - 8 = -48, clamped to 0
    expect(pos.left).toBe(0);
  });

  it('clamps to top of viewport', () => {
    const topButton = makeButtonRect({ top: 5, bottom: 41, height: 36 });
    const pos = computeWidgetPosition(topButton, defaultWidget, defaultViewport, sendButton);
    // Unclamped top = 5 + 18 - 18 = 5, no clamping needed
    expect(pos.top).toBe(5);
  });

  it('returns integer pixel values', () => {
    const oddButton = makeButtonRect({ top: 682.5, left: 1200.3, bottom: 718.5, height: 36 });
    const pos = computeWidgetPosition(oddButton, defaultWidget, defaultViewport, sendButton);
    expect(Number.isInteger(pos.top)).toBe(true);
    expect(Number.isInteger(pos.left)).toBe(true);
  });
});
```

Also update the existing `bottomRight` and `bottomLeft` config declarations to include `mode: 'input-box'` (needed since AnchorConfig is changing):

```typescript
const bottomRight: AnchorConfig = { mode: 'input-box', edge: 'bottom-right', offsetX: 12, offsetY: 36 };
const bottomLeft: AnchorConfig = { mode: 'input-box', edge: 'bottom-left', offsetX: 12, offsetY: 36 };
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/ui/widget/position.test.ts`
Expected: FAIL — `mode` property doesn't exist on AnchorConfig

**Step 3: Update position.ts with send-button mode**

Replace the entire file:

```typescript
export interface AnchorConfig {
  readonly mode: 'send-button' | 'input-box';
  /** Gap between widget right edge and button left edge (send-button mode) */
  readonly gapX?: number;
  /** Edge to anchor to (input-box mode) */
  readonly edge?: 'bottom-right' | 'bottom-left';
  /** Horizontal offset from input edge (input-box mode) */
  readonly offsetX: number;
  /** Vertical offset from input bottom (input-box mode) */
  readonly offsetY: number;
}

export interface WidgetPosition {
  readonly top: number;
  readonly left: number;
}

/**
 * Compute widget position relative to an anchor element rect.
 * Pure function — no DOM access. Fully testable.
 */
export function computeWidgetPosition(
  anchorRect: DOMRect,
  widgetSize: { width: number; height: number },
  viewport: { width: number; height: number },
  config: AnchorConfig,
): WidgetPosition {
  let top: number;
  let left: number;

  if (config.mode === 'send-button') {
    const gapX = config.gapX ?? 8;
    // Right edge of widget aligns to left edge of button, offset by gapX
    left = anchorRect.left - widgetSize.width - gapX;
    // Vertically center widget on button midpoint
    top = anchorRect.top + anchorRect.height / 2 - widgetSize.height / 2;
  } else {
    const edge = config.edge ?? 'bottom-right';
    switch (edge) {
      case 'bottom-right':
        top = anchorRect.bottom - config.offsetY;
        left = anchorRect.right - widgetSize.width - config.offsetX;
        break;
      case 'bottom-left':
        top = anchorRect.bottom - config.offsetY;
        left = anchorRect.left + config.offsetX;
        break;
    }
  }

  // Clamp to viewport
  top = Math.max(0, Math.min(top, viewport.height - widgetSize.height));
  left = Math.max(0, Math.min(left, viewport.width - widgetSize.width));

  return { top: Math.round(top), left: Math.round(left) };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/ui/widget/position.test.ts`
Expected: All tests pass (both old input-box tests and new send-button tests)

**Step 5: Commit**

```bash
git add src/ui/widget/position.ts tests/unit/ui/widget/position.test.ts
git commit -m "feat(position): add send-button anchor mode with vertical centering"
```

---

## Task 2: Add widgetAnchor to SiteAdapter and site adapters

Add the optional `widgetAnchor` property to the adapter interface and set initial `gapX` values per site.

**Files:**
- Modify: `src/types/adapter.ts`
- Modify: `src/content/sites/chatgpt.ts`
- Modify: `src/content/sites/claude.ts`
- Modify: `src/content/sites/gemini.ts`

**Step 1: Add widgetAnchor to SiteAdapter interface**

In `src/types/adapter.ts`, add after the `supportsOverlay` property (before the closing brace of the interface):

```typescript
  /** Widget positioning config — gap between widget and send button */
  readonly widgetAnchor?: {
    readonly gapX: number;
  };
```

**Step 2: Add widgetAnchor to each adapter**

In `src/content/sites/chatgpt.ts`, add to the adapter object (after `getDropZone`):

```typescript
  widgetAnchor: { gapX: 8 },
```

In `src/content/sites/claude.ts`, add to the adapter object:

```typescript
  widgetAnchor: { gapX: 8 },
```

In `src/content/sites/gemini.ts`, add to the adapter object:

```typescript
  widgetAnchor: { gapX: 8 },
```

Note: Starting all at `gapX: 8`. These values will be tuned visually per-provider later.

**Step 3: Run tests**

Run: `npm run test`
Expected: All tests pass (purely additive, no behavior change)

**Step 4: Commit**

```bash
git add src/types/adapter.ts src/content/sites/chatgpt.ts src/content/sites/claude.ts src/content/sites/gemini.ts
git commit -m "feat(adapters): add widgetAnchor.gapX to SiteAdapter interface"
```

---

## Task 3: Wire send-button anchor into widget-controller

Update `widget-controller.ts` to locate the send button, use it as the primary anchor, and fall back to input-box positioning.

**Files:**
- Modify: `src/ui/widget/widget-controller.ts`

**Step 1: Update the anchorConfig and add send button tracking**

Near the top of `createWidgetController`, replace the `anchorConfig` declaration and add a `currentSendButton` variable:

```typescript
  let currentSendButton: HTMLElement | null = null;

  const sendButtonConfig: AnchorConfig = {
    mode: 'send-button',
    gapX: adapter.widgetAnchor?.gapX ?? 8,
    offsetX: 12,
    offsetY: 36,
  };

  const inputFallbackConfig: AnchorConfig = {
    mode: 'input-box',
    edge: 'bottom-right',
    offsetX: 12,
    offsetY: 36,
  };
```

**Step 2: Update updatePosition() to try send button first**

Replace the `updatePosition()` function:

```typescript
  function updatePosition(): void {
    if (!wrapper || !currentInput) return;

    // Try send button as primary anchor
    const sendBtn = adapter.findSendButton();
    currentSendButton = sendBtn;

    if (sendBtn) {
      const rect = sendBtn.getBoundingClientRect();
      const pos = computeWidgetPosition(
        rect,
        { width: 140, height: 36 },
        { width: window.innerWidth, height: window.innerHeight },
        sendButtonConfig,
      );
      wrapper.style.top = `${pos.top}px`;
      wrapper.style.left = `${pos.left}px`;
    } else {
      // Fallback to input box
      const rect = currentInput.getBoundingClientRect();
      const pos = computeWidgetPosition(
        rect,
        { width: 140, height: 36 },
        { width: window.innerWidth, height: window.innerHeight },
        inputFallbackConfig,
      );
      wrapper.style.top = `${pos.top}px`;
      wrapper.style.left = `${pos.left}px`;
    }
  }
```

**Step 3: Update startObserving() to also watch the send button**

Replace `startObserving()`:

```typescript
  function startObserving(): void {
    stopObserving();
    if (!currentInput) return;

    resizeObserver = new ResizeObserver(() => {
      onScrollOrResize();
    });
    resizeObserver.observe(currentInput);
    resizeObserver.observe(document.body);

    // Also observe send button if available
    const sendBtn = adapter.findSendButton();
    if (sendBtn) {
      resizeObserver.observe(sendBtn);
    }
  }
```

**Step 4: Clean up — remove the old anchorConfig**

Delete the line:
```typescript
  const anchorConfig: AnchorConfig = { edge: 'bottom-right', offsetX: 12, offsetY: 36 };
```

**Step 5: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/ui/widget/widget-controller.ts
git commit -m "feat(widget): send-button anchor with input-box fallback"
```

---

## Task 4: Deferred rendering — only render when anchor is found

Update widget-controller to not render the Preact component until a send button (or fallback input) is located and positioned.

**Files:**
- Modify: `src/ui/widget/widget-controller.ts`

**Step 1: Add a `rendered` flag and guard renderWidget()**

Add a variable near other state variables:

```typescript
  let anchorReady = false;
```

At the top of `renderWidget()`, add a guard:

```typescript
  function renderWidget(): void {
    if (!wrapper || !anchorReady) return;
    // ... rest unchanged
  }
```

**Step 2: Set anchorReady in updatePosition()**

In `updatePosition()`, after computing and applying the position (in both the send-button and fallback branches), set the flag:

```typescript
    // After setting wrapper.style.top and wrapper.style.left:
    if (!anchorReady) {
      anchorReady = true;
      renderWidget();
    }
```

**Step 3: Reset anchorReady in unmount()**

In `unmount()`, add:

```typescript
    anchorReady = false;
```

**Step 4: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/ui/widget/widget-controller.ts
git commit -m "feat(widget): defer rendering until anchor element is located"
```

---

## Task 5: Final integration test + cleanup

Verify everything works end-to-end. Run linter. Full test suite.

**Files:**
- Possibly modify: any files needing minor adjustments

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 2: Run linter**

Run: `npm run lint`
Expected: No new errors (pre-existing ones are OK)

**Step 3: Verify git log is clean**

Run: `git log --oneline main..HEAD`
Expected: 4 commits from tasks 1-4

**Step 4: Final commit only if cleanup was needed**

```bash
git commit -m "chore: send-button anchor final cleanup"
```

---

## Summary

| Task | What | Key Outcome |
|------|------|-------------|
| 1 | position.ts send-button mode | Pure math for right-edge anchoring + vertical centering |
| 2 | SiteAdapter widgetAnchor | Per-provider gapX configuration |
| 3 | widget-controller wiring | Send button primary, input fallback |
| 4 | Deferred rendering | Empty container until anchor located |
| 5 | Final verification | All tests pass, lint clean |

**After this implementation:**
- Widget anchors to send button's left edge, vertically centered
- Grows leftward — right edge stays fixed
- Falls back to input-box positioning if button not found
- Per-provider `gapX` tuned per adapter
- `computeWidgetPosition()` remains pure and testable
