import { describe, it, expect } from 'vitest';
import { computeWidgetPosition } from '../../../../src/ui/widget/position';
import type { AnchorConfig } from '../../../../src/ui/widget/position';

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  const defaults = { top: 300, left: 200, right: 800, bottom: 400, width: 600, height: 100, x: 200, y: 300 };
  return { ...defaults, ...overrides, toJSON: () => ({}) } as DOMRect;
}

const defaultWidget = { width: 140, height: 36 };
const defaultViewport = { width: 1280, height: 720 };
const bottomRight: AnchorConfig = { mode: 'input-box', edge: 'bottom-right', offsetX: 12, offsetY: 36 };
const bottomLeft: AnchorConfig = { mode: 'input-box', edge: 'bottom-left', offsetX: 12, offsetY: 36 };
const sendButton: AnchorConfig = { mode: 'send-button', gapX: 8, offsetX: 12, offsetY: 36 };

function makeButtonRect(overrides: Partial<DOMRect> = {}): DOMRect {
  // Typical send button: 36x36 near bottom-right of viewport
  const defaults = { top: 682, left: 1200, right: 1236, bottom: 718, width: 36, height: 36, x: 1200, y: 682 };
  return { ...defaults, ...overrides, toJSON: () => ({}) } as DOMRect;
}

describe('computeWidgetPosition', () => {
  it('positions at bottom-right of input rect (default case)', () => {
    const pos = computeWidgetPosition(makeRect(), defaultWidget, defaultViewport, bottomRight);
    // top = rect.bottom(400) - offsetY(36) = 364
    // left = rect.right(800) - widget.width(140) - offsetX(12) = 648
    expect(pos.top).toBe(364);
    expect(pos.left).toBe(648);
  });

  it('supports bottom-left edge configuration', () => {
    const pos = computeWidgetPosition(makeRect(), defaultWidget, defaultViewport, bottomLeft);
    // top = rect.bottom(400) - offsetY(36) = 364
    // left = rect.left(200) + offsetX(12) = 212
    expect(pos.top).toBe(364);
    expect(pos.left).toBe(212);
  });

  it('clamps to right edge of viewport', () => {
    // Input rect extends to the far right, widget would overflow
    const rect = makeRect({ right: 1280, left: 1180 });
    const pos = computeWidgetPosition(rect, defaultWidget, defaultViewport, bottomRight);
    // Unclamped left = 1280 - 140 - 12 = 1128, viewport.width - widget.width = 1140
    // 1128 < 1140, so no clamping needed in this case. Let's push it further.
    expect(pos.left).toBe(1128);

    // Now with a rect that truly overflows
    const rect2 = makeRect({ right: 1400, left: 1300 });
    const pos2 = computeWidgetPosition(rect2, defaultWidget, defaultViewport, bottomRight);
    // Unclamped left = 1400 - 140 - 12 = 1248, max = 1280 - 140 = 1140
    expect(pos2.left).toBe(1140);
  });

  it('clamps to left edge of viewport (prevent negative)', () => {
    // Input rect at far left, bottom-left config would go negative
    const rect = makeRect({ left: -50, right: 550 });
    const pos = computeWidgetPosition(rect, defaultWidget, defaultViewport, bottomLeft);
    // Unclamped left = -50 + 12 = -38, clamped to 0
    expect(pos.left).toBe(0);
  });

  it('clamps to bottom of viewport', () => {
    // Input rect near bottom of viewport
    const rect = makeRect({ bottom: 720, top: 620 });
    const pos = computeWidgetPosition(rect, defaultWidget, defaultViewport, bottomRight);
    // Unclamped top = 720 - 36 = 684, max = 720 - 36 = 684
    expect(pos.top).toBe(684);

    // Now truly overflowing
    const rect2 = makeRect({ bottom: 750, top: 650 });
    const pos2 = computeWidgetPosition(rect2, defaultWidget, defaultViewport, bottomRight);
    // Unclamped top = 750 - 36 = 714, max = 720 - 36 = 684
    expect(pos2.top).toBe(684);
  });

  it('clamps to top of viewport (prevent negative)', () => {
    // Input rect at top, offsetY pushes position negative
    const rect = makeRect({ bottom: 20, top: -80 });
    const pos = computeWidgetPosition(rect, defaultWidget, defaultViewport, bottomRight);
    // Unclamped top = 20 - 36 = -16, clamped to 0
    expect(pos.top).toBe(0);
  });

  it('returns integer pixel values (no sub-pixel)', () => {
    const rect = makeRect({ bottom: 400.7, right: 800.3, left: 200.5 });
    const pos = computeWidgetPosition(rect, defaultWidget, defaultViewport, bottomRight);
    expect(Number.isInteger(pos.top)).toBe(true);
    expect(Number.isInteger(pos.left)).toBe(true);
  });

  it('handles zero-size viewport edge case', () => {
    const rect = makeRect();
    const pos = computeWidgetPosition(rect, defaultWidget, { width: 0, height: 0 }, bottomRight);
    // Everything should be clamped to 0 since viewport is 0x0
    // max top = 0 - 36 = -36, min(unclamped, -36), then max(0, ...) = 0
    // max left = 0 - 140 = -140, min(unclamped, -140), then max(0, ...) = 0
    expect(pos.top).toBe(0);
    expect(pos.left).toBe(0);
  });

  it('handles widget larger than viewport', () => {
    const smallViewport = { width: 100, height: 20 };
    const pos = computeWidgetPosition(makeRect(), defaultWidget, smallViewport, bottomRight);
    // Clamped: top can't go below 0, left can't go below 0
    // max top = 20 - 36 = -16 => min(unclamped, -16) => max(0, ...) = 0
    // max left = 100 - 140 = -40 => min(unclamped, -40) => max(0, ...) = 0
    expect(pos.top).toBe(0);
    expect(pos.left).toBe(0);
  });

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
});
