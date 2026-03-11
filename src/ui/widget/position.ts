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
