import { render, h } from 'preact';
import Widget from './Widget';
import type { FindingsState } from '../../content/findings-state';
import type { SiteAdapter } from '../../types';
import { buildRedactedText } from '../../content/interceptor';
import { computeWidgetPosition } from './position';
import type { AnchorConfig } from './position';
import tokenStyles from './widget-tokens.css?inline';
import widgetStyles from './widget.css?inline';
import panelStyles from './findings-panel.css?inline';
import toastStyles from './send-toast.css?inline';
import restoreToastStyles from './restore-toast.css?inline';
import overlayStyles from './text-overlay.css?inline';
import hoverCardStyles from './hover-card.css?inline';
import type { TextOverlayHandle } from './TextOverlay';
import type { MaskingMap } from '../../content/masking-map';

function createSheet(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

const sheets = [
  createSheet(tokenStyles),
  createSheet(widgetStyles),
  createSheet(panelStyles),
  createSheet(toastStyles),
  createSheet(restoreToastStyles),
  createSheet(overlayStyles),
  createSheet(hoverCardStyles),
];

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

/** Restore toast state managed by the controller */
interface RestoreToastState {
  visible: boolean;
  count: number;
  generation: number;
  resolve: (accepted: boolean) => void;
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
  showRestoreToast(count: number): Promise<boolean>;
  getOverlayHandle(): TextOverlayHandle | null;
  setEnabled(enabled: boolean): void;
} {
  let container: HTMLDivElement | null = null;
  let extensionEnabled = true;
  let shadowRoot: ShadowRoot | null = null;
  let wrapper: HTMLDivElement | null = null;
  let currentInput: HTMLElement | null = null;
  let rafId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let panelOpen = false;
  let toastState: ToastState | null = null;
  let restoreToastState: RestoreToastState | null = null;
  let overlayHandle: TextOverlayHandle | null = null;
  let anchorReady = false;
  let currentSendButton: HTMLElement | null = null;
  let currentAnchorMode: AnchorConfig['mode'] = 'input-box';

  const sendButtonConfig: AnchorConfig = {
    mode: 'send-button',
    gapX: adapter.widgetAnchor?.gapX ?? 8,
  };

  const inputFallbackConfig: AnchorConfig = {
    mode: 'input-box',
    edge: 'bottom-right',
    offsetX: 12,
    offsetY: 36,
  };

  function shouldShowFloatingUi(): boolean {
    return (
      findingsState.getSnapshot().activeCount > 0 ||
      (maskingMap?.size ?? 0) > 0 ||
      panelOpen ||
      toastState?.visible === true ||
      restoreToastState?.visible === true
    );
  }

  function setWrapperVisibility(visible: boolean): void {
    if (!wrapper) return;
    wrapper.style.visibility = visible ? 'visible' : 'hidden';
  }

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

    shadow.adoptedStyleSheets = sheets;

    const w = document.createElement('div');
    w.id = 'sunbreak-widget-wrapper';
    w.style.pointerEvents = 'auto';
    w.style.position = 'fixed';
    w.style.visibility = 'hidden';
    shadow.appendChild(w);

    // Hide container if extension is currently disabled
    if (!extensionEnabled) {
      container.style.display = 'none';
    }

    document.body.appendChild(container);

    shadowRoot = shadow;
    wrapper = w;

    return shadow;
  }

  function updateSendButtonTracking(): boolean {
    const nextSendButton = adapter.findSendButton();
    if (nextSendButton === currentSendButton) {
      return false;
    }

    if (resizeObserver && currentSendButton) {
      resizeObserver.unobserve(currentSendButton);
    }

    currentSendButton = nextSendButton;

    if (resizeObserver && currentSendButton) {
      resizeObserver.observe(currentSendButton);
    }

    return true;
  }

  function measureWidgetSize(): { width: number; height: number } | null {
    if (!wrapper) return null;

    const containerRect = wrapper.getBoundingClientRect();
    const trigger = wrapper.querySelector('.sb-widget');
    const triggerRect = trigger instanceof HTMLElement ? trigger.getBoundingClientRect() : containerRect;

    const width = Math.round(containerRect.width);
    const height = Math.round(triggerRect.height);

    if (width <= 0 || height <= 0) {
      return null;
    }

    return { width, height };
  }

  function updatePosition(): void {
    if (!wrapper || !currentInput) return;

    if (!shouldShowFloatingUi()) {
      anchorReady = false;
      setWrapperVisibility(false);
      return;
    }

    updateSendButtonTracking();

    const widgetSize = measureWidgetSize();
    if (!widgetSize) {
      return;
    }

    const anchorRect = currentSendButton?.getBoundingClientRect() ?? currentInput.getBoundingClientRect();
    const anchorConfig = currentSendButton ? sendButtonConfig : inputFallbackConfig;
    currentAnchorMode = anchorConfig.mode;
    const pos = computeWidgetPosition(
      anchorRect,
      widgetSize,
      { width: window.innerWidth, height: window.innerHeight },
      anchorConfig,
    );
    wrapper.style.top = `${pos.top}px`;
    wrapper.style.left = `${pos.left}px`;

    if (!anchorReady) {
      anchorReady = true;
    }
    setWrapperVisibility(true);
  }

  function startObserving(): void {
    stopObserving();
    if (!currentInput) return;

    resizeObserver = new ResizeObserver(() => {
      onScrollOrResize();
    });
    resizeObserver.observe(currentInput);
    resizeObserver.observe(document.body);
    updateSendButtonTracking();

    const mutationRoot = currentInput.closest('form, fieldset') ?? document.body;
    mutationObserver = new MutationObserver(() => {
      const didChange = updateSendButtonTracking();
      if (didChange || currentAnchorMode === 'send-button') {
        onScrollOrResize();
      }
    });
    mutationObserver.observe(mutationRoot, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  function stopObserving(): void {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    currentSendButton = null;
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

  function handleClearMasked(): void {
    maskingMap?.clear();
  }

  function handleRestoreAccept(): void {
    resolveRestoreToast(true);
  }

  function handleRestoreDecline(): void {
    resolveRestoreToast(false);
  }

  function resolveRestoreToast(accepted: boolean): void {
    if (!restoreToastState) return;
    const { resolve } = restoreToastState;
    restoreToastState = null;
    renderWidget();
    resolve(accepted);
  }

  let restoreGeneration = 0;

  function showRestoreToast(count: number): Promise<boolean> {
    // If a toast is already showing, resolve the old one as declined (safe default)
    if (restoreToastState) {
      restoreToastState.resolve(false);
    }

    restoreGeneration++;
    return new Promise((resolve) => {
      restoreToastState = {
        visible: true,
        count,
        generation: restoreGeneration,
        resolve,
      };
      renderWidget();
    });
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
        maskedCount: maskingMap?.size ?? 0,
        maskedEntries: maskingMap ? maskingMap.entries() : undefined,
        maskedExpiresAt: maskingMap?.expiresAt ?? null,
        onClearMasked: maskingMap ? handleClearMasked : undefined,
        restoreToastState: restoreToastState
          ? { count: restoreToastState.count, visible: restoreToastState.visible, generation: restoreToastState.generation }
          : null,
        onRestoreAccept: handleRestoreAccept,
        onRestoreDecline: handleRestoreDecline,
      }),
      wrapper,
    );
    if (!shouldShowFloatingUi()) {
      anchorReady = false;
      setWrapperVisibility(false);
      return;
    }
    if (currentInput) {
      onScrollOrResize();
    }
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
    ensureContainer();
    renderWidget();
    startObserving();
    updatePosition();

    // Subscribe to findings state for re-renders
    const unsubFindings = findingsState.subscribe(() => {
      renderWidget();
    });

    // Subscribe to masking map for badge updates
    const unsubMasking = maskingMap?.subscribe(() => {
      renderWidget();
    });

    // Position listeners
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    // Cleanup subscription on next unmount
    const prevUnmount = unmountInternal;
    unmountInternal = (): void => {
      unsubFindings();
      unsubMasking?.();
      prevUnmount();
    };
  }

  let unmountInternal = (): void => {
    // Base unmount — no subscription to clean
  };

  function unmount(): void {
    unmountInternal();
    unmountInternal = (): void => {};

    stopObserving();
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

    // If a restore toast is pending, resolve as declined (safe default)
    if (restoreToastState) {
      const { resolve } = restoreToastState;
      restoreToastState = null;
      resolve(false);
    }

    currentInput = null;
    anchorReady = false;
    currentAnchorMode = 'input-box';
    panelOpen = false;
    setWrapperVisibility(false);
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

  function setEnabled(enabled: boolean): void {
    extensionEnabled = enabled;
    if (container) {
      container.style.display = enabled ? '' : 'none';
    }
  }

  return { mount, unmount, destroy, showToast, showRestoreToast, getOverlayHandle, setEnabled };
}
