import { render, h } from 'preact';
import Widget from './Widget';
import type { FindingsState } from '../../content/findings-state';
import type { SiteAdapter } from '../../types';
import { applyRedactions } from '../../content/interceptor';
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
import { recordLocalDiagnostic } from '../../utils/local-diagnostics';

type WidgetAnchorMode =
  | 'send-button'
  | 'input-box-fallback'
  | 'hidden'
  | 'disabled'
  | 'degraded';

type WidgetAnchorReason =
  | 'idle'
  | 'extension-disabled'
  | 'missing-input'
  | 'input-detached'
  | 'input-unmeasurable'
  | 'widget-unmeasurable';

type AnchorResolution =
  | {
      mode: 'send-button';
      anchorRect: DOMRect;
      config: AnchorConfig;
    }
  | {
      mode: 'input-box-fallback';
      anchorRect: DOMRect;
      config: AnchorConfig;
    }
  | {
      mode: 'hidden' | 'disabled' | 'degraded';
      reason: WidgetAnchorReason;
    };

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

function isMaskableFinding(finding: { type: string }): boolean {
  return finding.type !== 'custom-pattern';
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
  let currentSendButton: HTMLElement | null = null;
  let currentAnchorMode: WidgetAnchorMode = 'hidden';
  let currentAnchorReason: WidgetAnchorReason = 'idle';
  const maskingAllowed = adapter.capabilities?.reliableSetText !== false;

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

  function setAnchorState(
    mode: WidgetAnchorMode,
    reason: WidgetAnchorReason = 'idle',
  ): void {
    if (
      currentAnchorMode === mode &&
      currentAnchorReason === reason &&
      container?.dataset.anchorMode === mode &&
      container?.dataset.anchorReason === reason &&
      wrapper?.dataset.anchorMode === mode &&
      wrapper?.dataset.anchorReason === reason
    ) {
      return;
    }

    currentAnchorMode = mode;
    currentAnchorReason = reason;

    if (container) {
      container.dataset.anchorMode = mode;
      container.dataset.anchorReason = reason;
    }

    if (wrapper) {
      wrapper.dataset.anchorMode = mode;
      wrapper.dataset.anchorReason = reason;
    }

    recordLocalDiagnostic('widget-controller', 'anchor-state-changed', {
      adapter: adapter.name,
      mode,
      reason,
    });
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
    setAnchorState(extensionEnabled ? 'hidden' : 'disabled', extensionEnabled ? 'idle' : 'extension-disabled');
    recordLocalDiagnostic('widget-controller', 'container-created', {
      adapter: adapter.name,
    });

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

    recordLocalDiagnostic('widget-controller', 'send-button-tracked', {
      adapter: adapter.name,
      present: currentSendButton !== null,
      mode: currentSendButton ? 'send-button' : 'input-box-fallback',
    });

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

  function resolveAnchor(): AnchorResolution {
    if (!extensionEnabled) {
      return {
        mode: 'disabled',
        reason: 'extension-disabled',
      };
    }

    if (!shouldShowFloatingUi()) {
      return {
        mode: 'hidden',
        reason: 'idle',
      };
    }

    if (!currentInput) {
      return {
        mode: 'degraded',
        reason: 'missing-input',
      };
    }

    if (!currentInput.isConnected) {
      return {
        mode: 'degraded',
        reason: 'input-detached',
      };
    }

    updateSendButtonTracking();

    if (currentSendButton) {
      return {
        mode: 'send-button',
        anchorRect: currentSendButton.getBoundingClientRect(),
        config: sendButtonConfig,
      };
    }

    const inputRect = currentInput.getBoundingClientRect();
    if (inputRect.width <= 0 || inputRect.height <= 0) {
      return {
        mode: 'degraded',
        reason: 'input-unmeasurable',
      };
    }

    return {
      mode: 'input-box-fallback',
      anchorRect: inputRect,
      config: inputFallbackConfig,
    };
  }

  function updatePosition(): void {
    if (!wrapper) return;
    if (!currentInput) {
      setAnchorState(extensionEnabled ? 'degraded' : 'disabled', extensionEnabled ? 'missing-input' : 'extension-disabled');
      setWrapperVisibility(false);
      return;
    }
    const anchor = resolveAnchor();
    if (anchor.mode === 'hidden' || anchor.mode === 'disabled' || anchor.mode === 'degraded') {
      setAnchorState(anchor.mode, anchor.reason);
      setWrapperVisibility(false);
      return;
    }

    const widgetSize = measureWidgetSize();
    if (!widgetSize) {
      setAnchorState('degraded', 'widget-unmeasurable');
      setWrapperVisibility(false);
      return;
    }

    const pos = computeWidgetPosition(
      anchor.anchorRect,
      widgetSize,
      { width: window.innerWidth, height: window.innerHeight },
      anchor.config,
    );
    wrapper.style.top = `${pos.top}px`;
    wrapper.style.left = `${pos.left}px`;
    setAnchorState(anchor.mode);
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

  function handleDocumentPointerDown(event: PointerEvent): void {
    if (!panelOpen || !container) return;
    const path = typeof event.composedPath === 'function'
      ? event.composedPath()
      : [];
    if (path.includes(container)) return;
    handleClose();
  }

  function handleFix(id: string): void {
    if (!maskingAllowed) return;

    const snap = findingsState.getSnapshot();
    const tf = snap.tracked.find((t) => t.id === id);
    if (!tf || tf.status !== 'active') return;
    if (!isMaskableFinding(tf.finding)) return;

    const input = currentInput?.isConnected ? currentInput : adapter.findInput();
    if (!input) return;

    const text = adapter.getText(input);
    const redaction = applyRedactions(text, [tf.finding]);
    if (redaction.applied.length === 0 || redaction.text === text) {
      recordLocalDiagnostic('widget-controller', 'write-back-skipped', {
        adapter: adapter.name,
        action: 'fix-one',
        findingType: tf.finding.type,
        reason: 'stale-or-invalid-range',
      });
      return;
    }
    try {
      adapter.setText(input, redaction.text);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      recordLocalDiagnostic('widget-controller', 'write-back-failed', {
        adapter: adapter.name,
        action: 'fix-one',
        findingType: tf.finding.type,
        message,
      });
      console.error('[Sunbreak] setText failed:', e);
      return;
    }
    maskingMap?.set(tf.finding.placeholder, tf.finding.value);
    findingsState.fix(id);
  }

  function handleIgnore(id: string): void {
    findingsState.ignore(id);
  }

  function handleFixAll(): void {
    if (!maskingAllowed) return;

    const snap = findingsState.getSnapshot();
    const active = snap.tracked.filter((t) => t.status === 'active' && isMaskableFinding(t.finding));
    if (active.length === 0) return;

    const input = currentInput?.isConnected ? currentInput : adapter.findInput();
    if (!input) return;

    const text = adapter.getText(input);
    const redaction = applyRedactions(
      text,
      active.map((t) => ({
        id: t.id,
        finding: t.finding,
        startIndex: t.finding.startIndex,
        endIndex: t.finding.endIndex,
        placeholder: t.finding.placeholder,
      })),
    );
    if (redaction.applied.length === 0 || redaction.text === text) {
      recordLocalDiagnostic('widget-controller', 'write-back-skipped', {
        adapter: adapter.name,
        action: 'fix-all',
        findingCount: active.length,
        reason: 'stale-or-invalid-ranges',
      });
      return;
    }
    try {
      adapter.setText(input, redaction.text);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      recordLocalDiagnostic('widget-controller', 'write-back-failed', {
        adapter: adapter.name,
        action: 'fix-all',
        findingCount: active.length,
        message,
      });
      console.error('[Sunbreak] setText failed:', e);
      return;
    }
    maskingMap?.setAll(
      redaction.applied.map((entry) => ({
        token: entry.finding.placeholder,
        originalValue: entry.finding.value,
      })),
    );
    findingsState.fixMany(redaction.applied.map((entry) => entry.id));
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

  function clearVisibleUiForDisable(): void {
    panelOpen = false;
    overlayHandle = null;

    if (toastState) {
      const { resolve } = toastState;
      toastState = null;
      resolve('timeout');
    }

    if (restoreToastState) {
      const { resolve } = restoreToastState;
      restoreToastState = null;
      resolve(false);
    }
  }

  function renderWidget(): void {
    if (!wrapper) return;
    if (!extensionEnabled) {
      render(null, wrapper);
      overlayHandle = null;
      setAnchorState('disabled', 'extension-disabled');
      setWrapperVisibility(false);
      return;
    }

    const mountedEditor = currentInput?.isConnected ? currentInput : null;
    const maskableActiveCount = findingsState
      .getSnapshot()
      .tracked
      .filter((t) => t.status === 'active' && isMaskableFinding(t.finding))
      .length;
    render(
      h(Widget, {
        findingsState,
        editorEl: mountedEditor,
        supportsOverlay: adapter.supportsOverlay !== false,
        panelOpen,
        onFix: maskingAllowed ? handleFix : undefined,
        onIgnore: handleIgnore,
        onFixAll: maskingAllowed && maskableActiveCount > 1 ? handleFixAll : undefined,
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
      setAnchorState('hidden', 'idle');
      setWrapperVisibility(false);
      return;
    }
    if (mountedEditor) {
      onScrollOrResize();
      return;
    }

    setAnchorState('degraded', 'input-detached');
    setWrapperVisibility(false);
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

    if (currentInput || wrapper) {
      unmount();
    }

    currentInput = input;
    recordLocalDiagnostic('widget-controller', 'mount', {
      adapter: adapter.name,
    });
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
    document.addEventListener('pointerdown', handleDocumentPointerDown, true);

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
    recordLocalDiagnostic('widget-controller', 'unmount', {
      adapter: adapter.name,
      mode: currentAnchorMode,
      reason: currentAnchorReason,
    });
    unmountInternal();
    unmountInternal = (): void => {};

    stopObserving();
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true);

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
    currentAnchorMode = extensionEnabled ? 'hidden' : 'disabled';
    currentAnchorReason = extensionEnabled ? 'idle' : 'extension-disabled';
    panelOpen = false;
    setAnchorState(currentAnchorMode, currentAnchorReason);
    setWrapperVisibility(false);
  }

  function destroy(): void {
    recordLocalDiagnostic('widget-controller', 'destroy', {
      adapter: adapter.name,
    });
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
    recordLocalDiagnostic('widget-controller', 'enabled-changed', {
      adapter: adapter.name,
      enabled,
    });
    if (container) {
      container.style.display = enabled ? '' : 'none';
    }
    if (!enabled) {
      clearVisibleUiForDisable();
    }
    setAnchorState(enabled ? 'hidden' : 'disabled', enabled ? 'idle' : 'extension-disabled');
    renderWidget();
  }

  return { mount, unmount, destroy, showToast, showRestoreToast, getOverlayHandle, setEnabled };
}
