import { render, h } from 'preact';
import Widget from './Widget';
import type { FindingsState } from '../../content/findings-state';
import type { SiteAdapter } from '../../types';
import { buildRedactedText } from '../../content/interceptor';
import widgetStyles from './widget.css?inline';
import panelStyles from './findings-panel.css?inline';
import toastStyles from './send-toast.css?inline';
import overlayStyles from './text-overlay.css?inline';
import hoverCardStyles from './hover-card.css?inline';
import type { TextOverlayHandle } from './TextOverlay';
import type { MaskingMap } from '../../content/masking-map';

/**
 * Context for the widget controller lifecycle.
 */
export interface WidgetContext {
  readonly isInvalid: boolean;
  onInvalidated(callback: () => void): void;
}

/** Toast state managed by the controller */
interface ToastState {
  visible: boolean;
  paused: boolean;
  activeCount: number;
  resolve: (action: 'send-anyway' | 'timeout') => void;
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
  maskingMap?: MaskingMap,
): {
  mount(input: HTMLElement): void;
  unmount(): void;
  destroy(): void;
  showToast(activeCount: number): Promise<'send-anyway' | 'timeout'>;
  getOverlayHandle(): TextOverlayHandle | null;
} {
  let container: HTMLDivElement | null = null;
  let shadowRoot: ShadowRoot | null = null;
  let wrapper: HTMLDivElement | null = null;
  let currentInput: HTMLElement | null = null;
  let rafId: number | null = null;
  let positionPollId: ReturnType<typeof setInterval> | null = null;
  let lastInputTop = 0;
  let lastInputLeft = 0;
  let panelOpen = false;
  let toastState: ToastState | null = null;
  let overlayHandle: TextOverlayHandle | null = null;

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
    styleEl.textContent = widgetStyles + '\n' + panelStyles + '\n' + toastStyles + '\n' + overlayStyles + '\n' + hoverCardStyles;
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

  function startPositionPolling(): void {
    stopPositionPolling();
    positionPollId = setInterval(() => {
      if (!currentInput || !currentInput.isConnected) return;
      const rect = currentInput.getBoundingClientRect();
      if (Math.abs(rect.top - lastInputTop) > 1 || Math.abs(rect.left - lastInputLeft) > 1) {
        lastInputTop = rect.top;
        lastInputLeft = rect.left;
        updatePosition();
      }
    }, 300);
  }

  function stopPositionPolling(): void {
    if (positionPollId !== null) {
      clearInterval(positionPollId);
      positionPollId = null;
    }
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
    maskingMap?.set(tf.finding.placeholder, tf.finding.value);
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
    maskingMap?.setAll(
      active.map((t) => ({
        token: t.finding.placeholder,
        originalValue: t.finding.value,
      })),
    );
    findingsState.fixAll();
  }

  function handleIgnoreAllOfType(type: string): void {
    findingsState.ignoreAllOfType(type);
  }

  function handleDisableType(type: string): void {
    // Disable this detection type in storage settings
    // This is a best-effort fire-and-forget — settings are read on next scan
    chrome.storage.local.get('detectionSettings', (result) => {
      const current = (result as Record<string, unknown>).detectionSettings as Record<string, boolean> | undefined;
      const updated = { ...current, [type]: false };
      chrome.storage.local.set({ detectionSettings: updated });
    });
    // Also ignore all current findings of this type immediately
    findingsState.ignoreAllOfType(type);
  }

  function handleClose(): void {
    panelOpen = false;
    // If toast was paused (opened via Review), resume it
    if (toastState && toastState.paused) {
      toastState.paused = false;
      toastState.visible = true;
    }
    renderWidget();
  }

  function handleToastReview(): void {
    if (toastState) {
      toastState.paused = true;
      toastState.visible = false;
    }
    panelOpen = true;
    renderWidget();
  }

  function handleToastSendAnyway(): void {
    resolveToast('send-anyway');
  }

  function handleToastTimeout(): void {
    resolveToast('timeout');
  }

  function resolveToast(action: 'send-anyway' | 'timeout'): void {
    if (!toastState) return;
    const { resolve } = toastState;
    toastState = null;
    panelOpen = false;
    renderWidget();
    resolve(action);
  }

  function renderWidget(): void {
    if (!wrapper) return;
    render(
      h(Widget, {
        findingsState,
        editorEl: currentInput,
        supportsOverlay: adapter.supportsOverlay !== false,
        panelOpen,
        onFix: handleFix,
        onIgnore: handleIgnore,
        onFixAll: handleFixAll,
        onClose: handleClose,
        onClick: (): void => {
          panelOpen = !panelOpen;
          // If closing panel while toast is not active, just toggle
          // If toast is active and panel was open via Review, closing resumes toast (handled in handleClose)
          renderWidget();
        },
        toastState: toastState
          ? {
              activeCount: toastState.activeCount,
              paused: toastState.paused,
              visible: toastState.visible,
            }
          : null,
        onToastReview: handleToastReview,
        onToastSendAnyway: handleToastSendAnyway,
        onToastTimeout: handleToastTimeout,
        onIgnoreAllOfType: handleIgnoreAllOfType,
        onDisableType: handleDisableType,
        onOverlayHandleReady: (handle: TextOverlayHandle | null): void => {
          overlayHandle = handle;
        },
      }),
      wrapper,
    );
  }

  function showToast(activeCount: number): Promise<'send-anyway' | 'timeout'> {
    return new Promise((resolve) => {
      toastState = {
        visible: true,
        paused: false,
        activeCount,
        resolve,
      };
      renderWidget();
    });
  }

  function mount(input: HTMLElement): void {
    if (ctx.isInvalid) return;

    currentInput = input;
    const rect = input.getBoundingClientRect();
    lastInputTop = rect.top;
    lastInputLeft = rect.left;
    ensureContainer();
    updatePosition();
    renderWidget();
    startPositionPolling();

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

    stopPositionPolling();
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (wrapper) {
      render(null, wrapper);
    }

    // If a toast is pending, resolve it so the promise doesn't hang
    if (toastState) {
      const { resolve } = toastState;
      toastState = null;
      resolve('timeout');
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

  function getOverlayHandle(): TextOverlayHandle | null {
    return overlayHandle;
  }

  return { mount, unmount, destroy, showToast, getOverlayHandle };
}
