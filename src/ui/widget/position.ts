export interface AnchorConfig {
  readonly mode: 'send-button' | 'input-box';
  readonly edge?: 'bottom-right' | 'bottom-left';
  readonly gapX?: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface WidgetPosition {
  readonly top: number;
  readonly left: number;
}

/**
 * Compute widget position relative to an input element rect.
 * Pure function — no DOM access. Fully testable.
 */
export function computeWidgetPosition(
  inputRect: DOMRect,
  widgetSize: { width: number; height: number },
  viewport: { width: number; height: number },
  config: AnchorConfig,
): WidgetPosition {
  let top: number;
  let left: number;

  if (config.mode === 'send-button') {
    // Position to the left of the send button
    const gapX = config.gapX ?? 8;
    top = inputRect.top + (inputRect.height - widgetSize.height) / 2;
    left = inputRect.left - widgetSize.width - gapX;
  } else {
    // input-box mode: position relative to input box edge
    const edge = config.edge ?? 'bottom-right';
    switch (edge) {
      case 'bottom-right':
        top = inputRect.bottom - config.offsetY;
        left = inputRect.right - widgetSize.width - config.offsetX;
        break;
      case 'bottom-left':
        top = inputRect.bottom - config.offsetY;
        left = inputRect.left + config.offsetX;
        break;
    }
  }

  // Clamp to viewport
  top = Math.max(0, Math.min(top, viewport.height - widgetSize.height));
  left = Math.max(0, Math.min(left, viewport.width - widgetSize.width));

  return { top: Math.round(top), left: Math.round(left) };
}
