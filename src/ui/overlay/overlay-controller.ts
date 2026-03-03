import { render, h } from 'preact';
import type { OverlayAction, OverlayFinding } from './types';
import WarningBanner from './WarningBanner';
import overlayStyles from './WarningBanner.css?inline';

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

/** Return overlay CSS as a string for injection into Shadow DOM */
function getOverlayStyles(): string {
  return overlayStyles;
}
