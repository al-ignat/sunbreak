import { render, h } from 'preact';
import type { OverlayAction, OverlayFinding } from './types';
import WarningBanner from './WarningBanner';

/**
 * Context needed by the overlay controller.
 * In production this comes from WXT's ContentScriptContext.
 */
export interface OverlayContext {
  readonly isInvalid: boolean;
  onInvalidated(callback: () => void): void;
}

/** Internal state for the overlay */
interface OverlayState {
  container: HTMLDivElement | null;
  shadowRoot: ShadowRoot | null;
  mounted: boolean;
  pendingResolve: ((action: OverlayAction) => void) | null;
}

/**
 * Create and manage the warning overlay.
 *
 * The overlay is rendered inside a closed Shadow DOM container appended to
 * document.body. In production, WXT's createShadowRootUi handles the
 * Shadow DOM setup; this controller provides the show/hide/destroy lifecycle
 * that wraps around it.
 */
export function createOverlayController(ctx: OverlayContext): {
  show: (findings: ReadonlyArray<OverlayFinding>) => Promise<OverlayAction>;
  hide: () => void;
  destroy: () => void;
  /** Exposed for testing */
  readonly state: Readonly<Pick<OverlayState, 'mounted' | 'container'>>;
} {
  const state: OverlayState = {
    container: null,
    shadowRoot: null,
    mounted: false,
    pendingResolve: null,
  };

  function ensureContainer(): ShadowRoot {
    if (state.container && state.shadowRoot) {
      return state.shadowRoot;
    }

    const container = document.createElement('div');
    container.id = 'byoai-root';
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'visible';
    container.style.pointerEvents = 'none';

    const shadow = container.attachShadow({ mode: 'closed' });

    // Inject styles into the shadow DOM
    const styleEl = document.createElement('style');
    styleEl.textContent = getOverlayStyles();
    shadow.appendChild(styleEl);

    // Create a wrapper for Preact to render into
    const wrapper = document.createElement('div');
    wrapper.id = 'byoai-overlay-wrapper';
    wrapper.style.pointerEvents = 'auto';
    shadow.appendChild(wrapper);

    document.body.appendChild(container);

    state.container = container;
    state.shadowRoot = shadow;

    return shadow;
  }

  function show(
    findings: ReadonlyArray<OverlayFinding>,
  ): Promise<OverlayAction> {
    if (ctx.isInvalid) {
      return Promise.resolve('cancel');
    }

    // If there's a pending overlay, resolve it as cancel
    if (state.pendingResolve) {
      state.pendingResolve('cancel');
      state.pendingResolve = null;
    }

    const shadow = ensureContainer();
    const wrapper = shadow.getElementById('byoai-overlay-wrapper');
    if (!wrapper) {
      return Promise.resolve('cancel');
    }

    return new Promise<OverlayAction>((resolve) => {
      state.pendingResolve = resolve;
      state.mounted = true;

      const handleAction = (action: OverlayAction): void => {
        state.pendingResolve = null;
        state.mounted = false;
        render(null, wrapper);
        resolve(action);
      };

      render(
        h(WarningBanner, { findings, onAction: handleAction }),
        wrapper,
      );
    });
  }

  function hide(): void {
    if (!state.shadowRoot || !state.mounted) return;

    const wrapper = state.shadowRoot.getElementById('byoai-overlay-wrapper');
    if (wrapper) {
      render(null, wrapper);
    }

    state.mounted = false;

    if (state.pendingResolve) {
      state.pendingResolve('cancel');
      state.pendingResolve = null;
    }
  }

  function destroy(): void {
    hide();
    if (state.container?.parentNode) {
      state.container.parentNode.removeChild(state.container);
    }
    state.container = null;
    state.shadowRoot = null;
  }

  // Cleanup on context invalidation
  ctx.onInvalidated(() => {
    destroy();
  });

  return {
    show,
    hide,
    destroy,
    get state(): Readonly<Pick<OverlayState, 'mounted' | 'container'>> {
      return { mounted: state.mounted, container: state.container };
    },
  };
}

/** Inline CSS for the overlay (same content as WarningBanner.css) */
function getOverlayStyles(): string {
  return `
@keyframes byoai-slide-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes byoai-slide-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(20px); }
}

.byoai-banner {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 600px;
  width: calc(100% - 32px);
  background: #FFF8E1;
  border-left: 4px solid #FF9800;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: #333333;
  z-index: 2147483647;
  animation: byoai-slide-in 200ms ease-out forwards;
  box-sizing: border-box;
  padding: 12px 16px;
  line-height: 1.4;
}

.byoai-banner--exit {
  animation: byoai-slide-out 150ms ease-in forwards;
}

.byoai-banner__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.byoai-banner__icon {
  font-size: 18px;
  color: #FF9800;
  flex-shrink: 0;
}

.byoai-banner__summary {
  flex: 1;
  font-weight: 600;
}

.byoai-banner__toggle {
  background: none;
  border: none;
  color: #666666;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  font-family: inherit;
}

.byoai-banner__toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}

.byoai-banner__toggle:focus-visible {
  outline: 2px solid #FF9800;
  outline-offset: 2px;
}

.byoai-banner__details {
  list-style: none;
  margin: 8px 0 0;
  padding: 8px 0 0;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.byoai-banner__finding {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 13px;
}

.byoai-banner__finding-label {
  color: #666666;
  min-width: 80px;
}

.byoai-banner__finding-value {
  background: rgba(255, 152, 0, 0.12);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
  color: #B26A00;
  word-break: break-all;
}

.byoai-banner__finding-arrow {
  color: #999999;
  flex-shrink: 0;
}

.byoai-banner__finding-placeholder {
  background: rgba(76, 175, 80, 0.12);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
  color: #2E7D32;
}

.byoai-banner__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.byoai-btn {
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 14px;
  font-family: inherit;
  line-height: 1.4;
  transition: background 120ms ease;
}

.byoai-btn:focus-visible {
  outline: 2px solid #FF9800;
  outline-offset: 2px;
}

.byoai-btn--primary {
  background: #E65100;
  color: #FFFFFF;
}

.byoai-btn--primary:hover {
  background: #BF360C;
}

.byoai-btn--secondary {
  background: transparent;
  border: 1px solid #FF9800;
  color: #E65100;
}

.byoai-btn--secondary:hover {
  background: rgba(255, 152, 0, 0.08);
}

.byoai-btn--tertiary {
  background: transparent;
  color: #666666;
  padding: 6px 10px;
}

.byoai-btn--tertiary:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333333;
}
  `.trim();
}
