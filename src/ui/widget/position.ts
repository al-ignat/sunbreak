export interface SendButtonAnchorConfig {
  readonly mode: 'send-button';
  /** Gap between widget right edge and button left edge */
  readonly gapX: number;
}

export interface InputBoxAnchorConfig {
  readonly mode: 'input-box';
  /** Edge to anchor to */
  readonly edge: 'bottom-right' | 'bottom-left';
  /** Horizontal offset from input edge */
  readonly offsetX: number;
  /** Vertical offset from input bottom */
  readonly offsetY: number;
}

export type AnchorConfig = SendButtonAnchorConfig | InputBoxAnchorConfig;

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
    // Right edge of widget aligns to left edge of button, offset by gapX
    left = anchorRect.left - widgetSize.width - config.gapX;
    // Vertically center widget on button midpoint
    top = anchorRect.top + anchorRect.height / 2 - widgetSize.height / 2;
  } else {
    switch (config.edge) {
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
