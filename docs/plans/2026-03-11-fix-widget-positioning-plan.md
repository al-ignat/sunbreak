# Fix: Widget & Overlay Positioning

**Date:** 2026-03-11
**Branch:** `fix/widget-positioning`
**Status:** Draft
**Design:** See `docs/design/pencil-sunbreak.pen` > "Widget Positioning — Redesign"

---

## Problem Statement

Live-site screenshot analysis (ChatGPT, Claude, Gemini) reveals three
positioning issues with the Sunbreak widget badge and findings panel:

### P1 — Badge overlaps user text in single-line inputs
The badge is positioned inside the textarea at a fixed offset
(`rect.right - 140`, `rect.bottom - 36`). On single-line inputs
(Gemini always, ChatGPT at wide widths), the badge sits directly over
typed text, truncating it ("Phone: +1-55...").

### P2 — Fixed pixel offsets don't adapt to input geometry
The `140px` right offset and `36px` bottom offset assume a multi-line
textarea with ample space. When the input is narrow or short, the badge
crowds the text area and can overlap the site's own controls (send
button, model selector).

### P3 — Badge competes with site action rows
Each AI tool has a toolbar row beneath the text input (ChatGPT: `+` /
Extended thinking; Claude: `+` / Model selector; Gemini: `+` / Tools).
The badge floats over this area, creating visual clutter.

---

## Design Goals

1. Badge never obscures user text
2. Badge never overlaps site controls (send button, toolbar)
3. Positioning adapts to input height (single-line vs multi-line)
4. Badge scales down gracefully at narrow widths
5. Panel respects viewport bounds (no edge clipping)
6. Minimal code change — keep current architecture (fixed positioning +
   polling), improve the offset calculation

---

## Solution: Adaptive Badge Positioning

### Strategy: "Below-Input Anchor"

Instead of placing the badge inside the textarea, anchor it **below the
textarea's bottom edge**, aligned to the right. This creates clear
separation between user content and the extension's UI.

```
┌─────────────────────────────────────────┐
│ User types here without obstruction...  │  ← textarea
│ Email: john.smith@acme.com              │
│ Phone: +1-555-012-3467                  │
└─────────────────────────────────────────┘
  [+ Extended thinking v]    [☀ Sunbreak 2] ← below, right-aligned
                                     ↑
                             badge sits in the
                             site's own toolbar gap
```

**Why this works:**
- Every AI tool has 8–16px gap between textarea bottom and toolbar row
- Badge width (~120px) fits in the right side of toolbar rows on all
  three providers
- No text overlap possible — badge is fully outside the text area
- Position tracks naturally with textarea resizing

### Fallback: Inside Bottom-Right (tall inputs only)

When the textarea is **>= 120px tall** (multi-line with ample space),
optionally keep the current inside-bottom-right position, but with
improved offsets calculated from send-button position rather than
hardcoded pixels.

---

## Task Breakdown

### T1 — Adaptive `updatePosition()` logic
**File:** `src/ui/widget/widget-controller.ts` (lines 114–125)

Replace fixed offsets with adaptive calculation:

```typescript
function updatePosition(): void {
  if (!wrapper || !currentInput) return;
  const rect = currentInput.getBoundingClientRect();
  const inputHeight = rect.height;

  // Below-input: anchor to bottom-right, outside textarea
  const top = Math.round(rect.bottom + 4);   // 4px gap below input
  const left = Math.round(rect.right - 140);

  // Clamp to viewport
  const maxTop = window.innerHeight - 50;
  const clampedTop = Math.min(top, maxTop);

  wrapper.style.top = `${clampedTop}px`;
  wrapper.style.left = `${left}px`;
}
```

**Tests:** Verify positioning on all three providers at 900px and 1470px.

### T2 — Responsive badge sizing
**File:** `src/ui/widget/Widget.tsx`, `src/ui/widget/widget.css`

Add compact mode when available width is tight:

| Mode     | Content           | Width  | Trigger                      |
|----------|-------------------|--------|------------------------------|
| Full     | ☀ Sunbreak ✓/N   | ~120px | Default                      |
| Compact  | ☀ ✓/N            | ~50px  | Input width < 400px          |

### T3 — Panel viewport clamping
**File:** `src/ui/widget/findings-panel.css`, `FindingsPanel.tsx`

Add JS-driven positioning to prevent panel from clipping:
- If panel top would go above viewport → open below badge
- If panel right would clip → left-align panel to badge

### T4 — Per-site offset tuning
**File:** `src/content/sites/chatgpt.ts`, `claude.ts`, `gemini.ts`

Extend `SiteAdapter` interface with optional positioning hints:

```typescript
export interface SiteAdapter {
  // ... existing methods
  readonly badgeOffsetY?: number;  // vertical gap below input (default: 4)
  readonly badgeOffsetX?: number;  // horizontal offset from right (default: 0)
}
```

Each adapter can provide small tweaks for its specific toolbar layout.

### T5 — Text overlay Z-index adjustment
**File:** `src/ui/widget/TextOverlay.tsx`

If badge moves outside the textarea, text overlay (inline underlines)
remains inside. Verify z-index stacking still works correctly and
underlines don't leak below the input boundary.

---

## Scope

**In:** Badge positioning, responsive sizing, panel clamping
**Out:** Badge redesign (visual style), new widget states, overlay
restyle, dashboard changes

---

## Verification Checklist

- [ ] ChatGPT new chat (centered input) — badge below, no text overlap
- [ ] ChatGPT continued chat (bottom input) — badge visible, not clipped
- [ ] ChatGPT narrow (900px) — compact badge if needed
- [ ] Claude new chat — badge below input
- [ ] Claude continued chat — badge below input
- [ ] Gemini new chat (single-line) — badge below, no overlap
- [ ] Gemini continued chat — badge below input
- [ ] Panel opens without viewport clipping (all three sites)
- [ ] Inline underlines still render correctly
- [ ] HoverCard still positions correctly with new badge location
- [ ] All 659 unit tests still pass
