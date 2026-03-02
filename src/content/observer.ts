import type { SiteAdapter, PromptCallback, FileCallback } from '../types';
import { selectAdapter } from './sites';
import {
  attachSubmissionInterceptor,
  attachFileDetector,
} from './interceptor';

/** How long to wait for the editor element before giving up (ms) */
const FIND_TIMEOUT_MS = 10_000;

/** Interval for checking if the editor element is still connected (ms) */
const HEALTH_CHECK_INTERVAL_MS = 5_000;

interface ObserverContext {
  readonly isInvalid: boolean;
  readonly signal: AbortSignal;
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

/** Increment the adapter failure counter in chrome.storage.local */
async function recordAdapterFailure(adapterName: string): Promise<void> {
  try {
    const data = await chrome.storage.local.get('adapterFailures');
    const failures = (data['adapterFailures'] as Record<string, number>) ?? {};
    failures[adapterName] = (failures[adapterName] ?? 0) + 1;
    await chrome.storage.local.set({ adapterFailures: failures });
  } catch {
    // Storage errors should not crash the observer
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
  onPromptCaptured: PromptCallback,
  onFileDetected: FileCallback,
): void {
  const maybeAdapter = selectAdapter(window.location.hostname);
  if (!maybeAdapter) return; // Not on a supported site
  const adapter: SiteAdapter = maybeAdapter;

  let currentInput: HTMLElement | null = null;
  let cleanupInterceptor: (() => void) | null = null;
  let cleanupFileDetector: (() => void) | null = null;
  let healthCheckId: number | null = null;

  function tearDown(): void {
    cleanupInterceptor?.();
    cleanupInterceptor = null;
    cleanupFileDetector?.();
    cleanupFileDetector = null;
    currentInput = null;
    if (healthCheckId !== null) {
      clearInterval(healthCheckId);
      healthCheckId = null;
    }
  }

  async function attach(): Promise<void> {
    if (ctx.isInvalid) return;
    tearDown();

    const input = await waitForElement(adapter, ctx);
    if (!input || ctx.isInvalid) {
      await recordAdapterFailure(adapter.name);
      return;
    }

    currentInput = input;

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
      onPromptCaptured,
    );

    cleanupFileDetector = attachFileDetector(
      input,
      adapter,
      interceptorCtx,
      onFileDetected,
    );

    // Health check: verify element is still in DOM
    healthCheckId = ctx.setInterval(() => {
      if (!currentInput?.isConnected) {
        // Element was removed — re-attach
        void attach();
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  // Initial attach
  void attach();

  // Re-attach on SPA navigation
  ctx.addEventListener(
    window,
    'wxt:locationchange' as string,
    () => {
      void attach();
    },
  );

  // Full cleanup on context invalidation
  ctx.onInvalidated(() => {
    tearDown();
  });
}
