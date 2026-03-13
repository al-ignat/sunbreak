import type { SiteAdapter, FileCallback } from '../types';
import { selectAdapter } from './sites';
import {
  attachSubmissionInterceptor,
  attachFileDetector,
} from './interceptor';
import type { SubmitInterceptConfig } from './interceptor';
import { attachScanner } from './scanner';
import type { ScannerConfig } from './scanner';
import type { FindingsState } from './findings-state';
import type { createWidgetController } from '../ui/widget/widget-controller';
import type { MaskingMap } from './masking-map';
import type { ClipboardInterceptor } from './clipboard-interceptor';
import { recordLocalDiagnostic } from '../utils/local-diagnostics';

/** How long to wait for the editor element before giving up (ms) */
const FIND_TIMEOUT_MS = 10_000;

/** Interval for checking if the editor element is still connected (ms) */
const HEALTH_CHECK_INTERVAL_MS = 5_000;

interface ObserverContext {
  readonly isInvalid: boolean;
  addEventListener(
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  onInvalidated(callback: () => void): void;
  setInterval(callback: () => void, ms: number): number;
}

/**
 * Wait for an element matching any of the adapter's selectors to appear in the DOM.
 * Uses MutationObserver to avoid polling. Resolves with the element or null on timeout.
 */
function waitForElement(
  adapter: SiteAdapter,
  ctx: ObserverContext,
  timeoutMs: number = FIND_TIMEOUT_MS,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    // Check if already in DOM
    const existing = adapter.findInput();
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;

    const observer = new MutationObserver(() => {
      if (settled || ctx.isInvalid) {
        observer.disconnect();
        return;
      }
      const el = adapter.findInput();
      if (el) {
        settled = true;
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout — give up after timeoutMs
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, timeoutMs);

    // Cleanup on context invalidation
    ctx.onInvalidated(() => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        observer.disconnect();
        resolve(null);
      }
    });
  });
}

/** Increment the adapter failure counter in chrome.storage.local (fire-and-forget) */
function recordAdapterFailure(adapterName: string): void {
  try {
    chrome.storage.local
      .get('adapterFailures')
      .then((data) => {
        const failures =
          (data['adapterFailures'] as Record<string, number>) ?? {};
        failures[adapterName] = (failures[adapterName] ?? 0) + 1;
        return chrome.storage.local.set({ adapterFailures: failures });
      })
      .catch(() => {
        // Extension context invalidated or storage error — ignore
      });
  } catch {
    // chrome.storage may throw synchronously if context is already dead
  }
}

/**
 * Start observing the current page for prompt submissions and file uploads.
 *
 * 1. Selects the correct adapter based on hostname
 * 2. Waits for the editor element via MutationObserver
 * 3. Attaches interception listeners
 * 4. Re-attaches on SPA navigation
 * 5. Periodically verifies the element is still connected
 */
export function startObserving(
  ctx: ObserverContext,
  submitConfig: SubmitInterceptConfig,
  onFileDetected: FileCallback,
  scannerDeps?: {
    config: ScannerConfig;
    state: FindingsState;
  },
  widgetController?: ReturnType<typeof createWidgetController>,
  maskingMap?: MaskingMap,
  clipboardInterceptor?: ClipboardInterceptor,
): void {
  const maybeAdapter = selectAdapter(window.location.hostname);
  if (!maybeAdapter) return; // Not on a supported site
  const adapter: SiteAdapter = maybeAdapter;

  let currentInput: HTMLElement | null = null;
  let cleanupInterceptor: (() => void) | null = null;
  let cleanupFileDetector: (() => void) | null = null;
  let cleanupScanner: (() => void) | null = null;
  let healthCheckId: number | null = null;

  function tearDown(): void {
    recordLocalDiagnostic('observer', 'teardown', {
      adapter: adapter.name,
      hadInput: currentInput !== null,
    });
    cleanupInterceptor?.();
    cleanupInterceptor = null;
    cleanupFileDetector?.();
    cleanupFileDetector = null;
    cleanupScanner?.();
    cleanupScanner = null;
    clipboardInterceptor?.detach();
    widgetController?.unmount();
    currentInput = null;
    if (healthCheckId !== null) {
      clearInterval(healthCheckId);
      healthCheckId = null;
    }
  }

  async function attach(): Promise<void> {
    if (ctx.isInvalid) return;
    recordLocalDiagnostic('observer', 'attach-start', {
      adapter: adapter.name,
      pathname: window.location.pathname,
    });
    // Catch navigations that wxt:locationchange missed (e.g. ChatGPT "New chat")
    clearIfNavigatedFromConversation();
    tearDown();

    const input = await waitForElement(adapter, ctx);
    if (!input || ctx.isInvalid) {
      if (!ctx.isInvalid) {
        recordAdapterFailure(adapter.name);
        recordLocalDiagnostic('observer', 'attach-failed', {
          adapter: adapter.name,
          pathname: window.location.pathname,
          reason: 'input-not-found',
        });
      }
      return;
    }

    currentInput = input;
    recordLocalDiagnostic('observer', 'attach-success', {
      adapter: adapter.name,
      pathname: window.location.pathname,
    });

    const interceptorCtx = {
      get isInvalid(): boolean {
        return ctx.isInvalid;
      },
      addEventListener: ctx.addEventListener.bind(ctx),
      onInvalidated: ctx.onInvalidated.bind(ctx),
    };

    cleanupInterceptor = attachSubmissionInterceptor(
      input,
      adapter,
      interceptorCtx,
      submitConfig,
    );

    cleanupFileDetector = attachFileDetector(
      input,
      adapter,
      interceptorCtx,
      onFileDetected,
    );

    // Mount corner widget
    widgetController?.mount(input);

    // Attach clipboard interceptor for restore flow
    clipboardInterceptor?.attach();

    // Attach continuous scanner if dependencies provided
    if (scannerDeps) {
      const scannerCtx = {
        get isInvalid(): boolean {
          return ctx.isInvalid;
        },
        onInvalidated: ctx.onInvalidated.bind(ctx),
      };
      cleanupScanner = attachScanner(
        input,
        adapter,
        scannerDeps.config,
        scannerDeps.state,
        scannerCtx,
      );
    }

    // Health check: verify element is still in DOM
    healthCheckId = ctx.setInterval(() => {
      if (!currentInput?.isConnected) {
        // Element was removed — re-attach
        recordLocalDiagnostic('observer', 'health-check-reattach', {
          adapter: adapter.name,
          pathname: window.location.pathname,
        });
        void attach();
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  // Track pathname to detect conversation switches vs creation.
  // Used by both wxt:locationchange and attach() as a fallback
  // (some SPA navigations don't fire wxt:locationchange).
  let lastKnownPathname = window.location.pathname;

  /**
   * Clear MaskingMap and FindingsState when navigating away from a conversation.
   * Only clears when moving FROM a path with 2+ segments (e.g. /c/abc-123).
   * Safe to call multiple times — no-ops if pathname hasn't changed.
   */
  function clearIfNavigatedFromConversation(): void {
    const currentPathname = window.location.pathname;
    if (currentPathname === lastKnownPathname) return;

    const oldSegments = lastKnownPathname.split('/').filter(Boolean);
    const wasInConversation = oldSegments.length >= 2;

    if (wasInConversation) {
      maskingMap?.clear();
      scannerDeps?.state.clear();
      recordLocalDiagnostic('observer', 'conversation-cleared', {
        adapter: adapter.name,
        from: lastKnownPathname,
        to: currentPathname,
      });
    }

    lastKnownPathname = currentPathname;
  }

  // Initial attach
  void attach();

  // Re-attach on SPA navigation
  ctx.addEventListener(
    window,
    'wxt:locationchange' as string,
    () => {
      recordLocalDiagnostic('observer', 'locationchange', {
        adapter: adapter.name,
        pathname: window.location.pathname,
      });
      clearIfNavigatedFromConversation();
      void attach();
    },
  );

  // Full cleanup on context invalidation
  ctx.onInvalidated(() => {
    recordLocalDiagnostic('observer', 'context-invalidated', {
      adapter: adapter.name,
    });
    tearDown();
  });
}
