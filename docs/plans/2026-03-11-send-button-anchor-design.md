# Send-Button Anchor Positioning — Design

**Goal:** Anchor the widget to the send button instead of the input box, aligning the widget's right edge to the button's left edge with vertical centering. Per-provider gap offsets. Input-box fallback when send button is unavailable.

## Anchor Algorithm

1. `adapter.findSendButton()` → get `DOMRect`
2. Anchor point = (button left edge, button vertical center)
3. Widget right edge aligns to anchor point, offset left by `gapX`
4. Widget vertical midpoint aligns to button vertical midpoint
5. Viewport clamping prevents off-screen positioning

```
            gapX
         <-------->
   +----------------+  +---------+
   |  sun  3   2    |  |  Send > |
   +----------------+  +---------+

   Widget right edge --+  +-- Button left edge
   Vertically centered on button's midpoint
```

When the widget grows wider (more badges), it expands leftward. The right edge stays fixed.

## Fallback

If `findSendButton()` returns null, fall back to input-box anchoring (current bottom-right behavior). This handles edge cases where the button hasn't rendered yet.

## Deferred Rendering

Widget mounts the Shadow DOM container immediately but only renders the Preact component once the send button (or fallback input) is located. Empty container until then.

## Per-Provider Offsets

Each site adapter specifies a `widgetAnchor.gapX` value:

```typescript
interface SiteAdapter {
  // ... existing ...
  readonly widgetAnchor?: {
    readonly gapX: number; // px between widget right edge and button left edge
  };
}
```

Default fallback: 8px if adapter doesn't specify.

## Position Function

New `send-button` mode in AnchorConfig:

```typescript
interface AnchorConfig {
  readonly mode: 'send-button' | 'input-box';
  readonly gapX: number;
  // input-box fallback uses these:
  readonly offsetX: number;
  readonly offsetY: number;
}
```

Send-button mode math:
```
left = buttonRect.left - widgetSize.width - gapX
top  = buttonRect.top + (buttonRect.height / 2) - (widgetSize.height / 2)
```

## Observation

ResizeObserver watches both the send button and the input element. Scroll and resize listeners unchanged.

## Files Changed

| File | Change |
|---|---|
| `src/ui/widget/position.ts` | Add send-button mode |
| `tests/unit/ui/widget/position.test.ts` | Send-button tests |
| `src/ui/widget/widget-controller.ts` | Locate send button, pass rect, observe, deferred render |
| `src/types/adapter.ts` | Add optional widgetAnchor to SiteAdapter |
| `src/content/sites/chatgpt.ts` | Set widgetAnchor gapX |
| `src/content/sites/claude.ts` | Set widgetAnchor gapX |
| `src/content/sites/gemini.ts` | Set widgetAnchor gapX |

## What Doesn't Change

observer.ts, FindingsState, scanner, severity system, CSS files.
