/**
 * ClipboardInterceptor — listens for copy events on the document,
 * scans for masking tokens, and offers to restore original values.
 *
 * Safe default: tokenized text goes to clipboard immediately.
 * Restoration only happens on explicit user acceptance.
 */

import type { MaskingMap } from './masking-map';

export interface ClipboardInterceptorCallbacks {
  /** Called when tokens are found in copied text. Returns whether user wants restore. */
  onTokensFound: (count: number) => Promise<boolean>;
}

export interface ClipboardInterceptor {
  /** Start listening for copy events. */
  attach(): void;
  /** Stop listening. */
  detach(): void;
}

export function createClipboardInterceptor(
  maskingMap: MaskingMap,
  callbacks: ClipboardInterceptorCallbacks,
): ClipboardInterceptor {
  function handleCopy(event: ClipboardEvent): void {
    // 1. Read selection
    const selection = window.getSelection();
    const selectionText = selection?.toString() ?? '';

    // 2. Empty selection — let default copy proceed
    if (selectionText.length === 0) return;

    // 3. Check for tokens
    const { restored, count } = maskingMap.restore(selectionText);

    // 4. No tokens — let default copy proceed
    if (count === 0) return;

    // 5. Tokens found — prevent default and write tokenized text (safe default)
    event.preventDefault();
    if (event.clipboardData) {
      event.clipboardData.setData('text/plain', selectionText);
    }

    // 6. Ask user via callback (async — clipboard already has safe tokenized version)
    void callbacks.onTokensFound(count).then((accepted) => {
      if (accepted) {
        // Overwrite clipboard with restored (original) values
        void navigator.clipboard.writeText(restored).catch(() => {
          // Focus lost or permission denied — clipboard keeps tokenized version (safe)
        });
      }
    });
  }

  return {
    attach(): void {
      document.addEventListener('copy', handleCopy as EventListener, true);
    },

    detach(): void {
      document.removeEventListener('copy', handleCopy as EventListener, true);
    },
  };
}
