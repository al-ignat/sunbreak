import { render, h } from 'preact';
import Widget from './Widget';
import type { FindingsState } from '../../content/findings-state';
import type { SiteAdapter } from '../../types';
import { buildRedactedText } from '../../content/interceptor';
import widgetStyles from './widget.css?inline';
import panelStyles from './findings-panel.css?inline';

/**
 * Context for the widget controller lifecycle.
 */
export interface WidgetContext {
  readonly isInvalid: boolean;
  onInvalidated(callback: () => void): void;
}

/**
 * Create and manage the corner widget.
 *
 * The widget lives in a closed Shadow DOM container positioned near
 * the chat input. It subscribes to FindingsState for reactive updates.
 */
export function createWidgetController(
  findingsState: FindingsState,
  adapter: SiteAdapter,
  ctx: WidgetContext,
): {
  mount(input: HTMLElement): void;
  unmount(): void;
  destroy(): void;
} {
  let container: HTMLDivElement | null = null;
  let shadowRoot: ShadowRoot | null = null;
  let wrapper: HTMLDivElement | null = null;
  let currentInput: HTMLElement | null = null;
  let rafId: number | null = null;
  let panelOpen = false;

  function ensureContainer(): ShadowRoot {
    if (container && shadowRoot) {
      return shadowRoot;
    }

    container = document.createElement('div');
    container.id = 'sunbreak-widget-root';
    container.style.position = 'fixed';
    container.style.zIndex = '2147483646';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'visible';
    container.style.pointerEvents = 'none';

    const shadow = container.attachShadow({ mode: 'closed' });

    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles + '\n' + panelStyles;
    shadow.appendChild(styleEl);

    const w = document.createElement('div');
    w.id = 'sunbreak-widget-wrapper';
    w.style.pointerEvents = 'auto';
    w.style.position = 'fixed';
    shadow.appendChild(w);

    document.body.appendChild(container);

    shadowRoot = shadow;
    wrapper = w;

    return shadow;
  }

  function updatePosition(): void {
    if (!wrapper || !currentInput) return;

    const rect = currentInput.getBoundingClientRect();

    // Position at bottom-right of the input area
    const top = Math.round(rect.bottom - 36);
    const left = Math.round(rect.right - 140);

    wrapper.style.top = `${top}px`;
    wrapper.style.left = `${left}px`;
  }

  function onScrollOrResize(): void {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updatePosition();
    });
  }

  function handleFix(id: string): void {
    const snap = findingsState.getSnapshot();
    const tf = snap.tracked.find((t) => t.id === id);
    if (!tf || tf.status !== 'active') return;

    const input = currentInput?.isConnected ? currentInput : adapter.findInput();
    if (!input) return;

    const text = adapter.getText(input);
    const redacted = buildRedactedText(text, [tf.finding]);
    adapter.setText(input, redacted);
    findingsState.fix(id);
  }

  function handleIgnore(id: string): void {
    findingsState.ignore(id);
  }

  function handleFixAll(): void {
    const snap = findingsState.getSnapshot();
    const active = snap.tracked.filter((t) => t.status === 'active');
    if (active.length === 0) return;

    const input = currentInput?.isConnected ? currentInput : adapter.findInput();
    if (!input) return;

    const text = adapter.getText(input);
    const redacted = buildRedactedText(
      text,
      active.map((t) => t.finding),
    );
    adapter.setText(input, redacted);
    findingsState.fixAll();
  }

  function handleClose(): void {
    panelOpen = false;
    renderWidget();
  }

  function renderWidget(): void {
    if (!wrapper) return;
    render(
      h(Widget, {
        findingsState,
        panelOpen,
        onFix: handleFix,
        onIgnore: handleIgnore,
        onFixAll: handleFixAll,
        onClose: handleClose,
        onClick: (): void => {
          panelOpen = !panelOpen;
          renderWidget();
        },
      }),
      wrapper,
    );
  }

  function mount(input: HTMLElement): void {
    if (ctx.isInvalid) return;

    currentInput = input;
    ensureContainer();
    updatePosition();
    renderWidget();

    // Subscribe to findings state for re-renders
    const unsub = findingsState.subscribe(() => {
      renderWidget();
    });

    // Position listeners
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    // Cleanup subscription on next unmount
    const prevUnmount = unmountInternal;
    unmountInternal = (): void => {
      unsub();
      prevUnmount();
    };
  }

  let unmountInternal = (): void => {
    // Base unmount — no subscription to clean
  };

  function unmount(): void {
    unmountInternal();
    unmountInternal = (): void => {};

    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (wrapper) {
      render(null, wrapper);
    }

    currentInput = null;
    panelOpen = false;
  }

  function destroy(): void {
    unmount();
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    shadowRoot = null;
    wrapper = null;
  }

  ctx.onInvalidated(() => {
    destroy();
  });

  return { mount, unmount, destroy };
}
