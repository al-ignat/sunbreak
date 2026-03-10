/**
 * ClipboardInterceptor — listens for copy events on the document,
 * scans for masking tokens, and offers to restore original values.
 *
 * Also listens for postMessage from the MAIN world script when site
 * "Copy" buttons call navigator.clipboard.writeText() directly.
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
  /** Start listening for copy events and clipboard-write messages. */
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
    offerRestore(restored, count);
  }

  /**
   * Handle programmatic clipboard writes from site "Copy" buttons.
   * The MAIN world script posts a message after the original writeText()
   * call, so the clipboard already has the text (safe default).
   */
  function handleMessage(event: MessageEvent): void {
    if (event.source !== window) return;

    const data = event.data as Record<string, unknown> | null;
    if (!data || data.type !== 'sunbreak:clipboard-write') return;

    const text = data.text;
    if (typeof text !== 'string' || text.length === 0) return;

    const { restored, count } = maskingMap.restore(text);
    if (count === 0) return;

    // Clipboard already has the tokenized text (written by site code).
    // Offer restore — if accepted, we overwrite with originals.
    offerRestore(restored, count);
  }

  function offerRestore(restored: string, count: number): void {
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
      window.addEventListener('message', handleMessage);
    },

    detach(): void {
      document.removeEventListener('copy', handleCopy as EventListener, true);
      window.removeEventListener('message', handleMessage);
    },
  };
}
