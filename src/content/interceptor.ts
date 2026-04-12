import type { SiteAdapter, FileCallback, AttachmentRemovedCallback } from '../types';

export interface InterceptorContext {
  /** Whether the context is still valid */
  readonly isInvalid: boolean;
  /** Register a listener that auto-removes on invalidation */
  addEventListener<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  /** Register a cleanup callback */
  onInvalidated(callback: () => void): void;
}

/**
 * Configuration for the submission interceptor.
 * - shouldBlock: synchronous check — return true to preventDefault and show toast
 * - onBlocked: async — called after blocking; resolves with true to re-trigger
 *   submission, or false to skip (e.g. user fixed all findings during review)
 */
export interface SubmitInterceptConfig {
  shouldBlock: () => boolean;
  onBlocked: () => Promise<boolean>;
}

/**
 * Attach submission interception listeners.
 *
 * v0.2: checks findingsState.activeCount (via shouldBlock callback).
 * If no active findings, submission passes through with zero delay.
 * If findings exist, blocks submission, calls onBlocked (shows toast),
 * then re-triggers via nonce-based bypass.
 *
 * Returns a cleanup function.
 */
export function attachSubmissionInterceptor(
  input: HTMLElement,
  adapter: SiteAdapter,
  ctx: InterceptorContext,
  config: SubmitInterceptConfig,
): () => void {
  // Nonce-based bypass: a page script in the main world cannot read
  // properties set by the content script's isolated world on the same
  // event object. This eliminates the 100ms race window entirely.
  let bypassNonce: string | null = null;

  /** Look up the current input element, surviving SPA navigations */
  function currentInput(): HTMLElement | null {
    if (input.isConnected) return input;
    return adapter.findInput();
  }

  function generateNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  const handleKeydown = (e: KeyboardEvent): void => {
    if (ctx.isInvalid) return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey || e.isComposing) return;

    const el = currentInput();
    if (!el) return;

    // Only intercept if the keypress is related to the prompt input
    const focused = document.activeElement;
    const target = e.target as HTMLElement | null;
    const isFromInput =
      (focused != null && el.contains(focused)) ||
      (target != null && el.contains(target));
    if (!isFromInput) return;

    // Let nonce-authenticated re-triggered events pass through
    const bypassValue = (e as KeyboardEvent & { _sunbreakBypass?: string })._sunbreakBypass;
    if (bypassValue != null && bypassValue === bypassNonce) {
      bypassNonce = null;
      return;
    }

    const text = adapter.getText(el);
    if (text.length === 0) return;

    // Zero interception when no active findings
    if (!config.shouldBlock()) return;

    // Block the original submission
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    void config.onBlocked().then((resubmit) => {
      if (ctx.isInvalid) return;
      if (!resubmit) return;
      triggerKeyboardSubmit(el);
    });
  };

  const handleClick = (e: MouseEvent): void => {
    if (ctx.isInvalid) return;

    // Let nonce-authenticated re-triggered events pass through
    const bypassValue = (e as MouseEvent & { _sunbreakBypass?: string })._sunbreakBypass;
    if (bypassValue != null && bypassValue === bypassNonce) {
      bypassNonce = null;
      return;
    }

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const sendButton = adapter.findSendButton();
    if (!sendButton) return;
    if (!sendButton.contains(target) && sendButton !== target) return;

    const el = currentInput();
    if (!el) return;

    const text = adapter.getText(el);
    if (text.length === 0) return;

    // Zero interception when no active findings
    if (!config.shouldBlock()) return;

    // Block the original submission
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    void config.onBlocked().then((resubmit) => {
      if (ctx.isInvalid) return;
      if (!resubmit) return;
      triggerButtonSubmit(adapter);
    });
  };

  function triggerKeyboardSubmit(target: HTMLElement): void {
    bypassNonce = generateNonce();
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, '_sunbreakBypass', { value: bypassNonce });
    target.dispatchEvent(event);
  }

  function triggerButtonSubmit(siteAdapter: SiteAdapter): void {
    const sendButton = siteAdapter.findSendButton();
    if (sendButton) {
      bypassNonce = generateNonce();
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, '_sunbreakBypass', { value: bypassNonce });
      sendButton.dispatchEvent(event);
    }
  }

  // window capture fires before document capture in the event chain,
  // ensuring we intercept before any framework handler (React, ProseMirror).
  const keydownListener = handleKeydown as EventListener;
  const clickListener = handleClick as EventListener;

  window.addEventListener('keydown', keydownListener, true);
  window.addEventListener('click', clickListener, true);

  const cleanup = (): void => {
    window.removeEventListener('keydown', keydownListener, true);
    window.removeEventListener('click', clickListener, true);
  };

  ctx.onInvalidated(cleanup);

  return cleanup;
}

/**
 * Build redacted text by replacing findings with their placeholders.
 * Processes findings from right to left to avoid index shifting.
 *
 * Safe because the classification engine guarantees no overlapping findings
 * (Phase 3, Design Decision D1).
 */
export interface RedactionSpan {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly placeholder: string;
}

export interface RedactionResult<T extends RedactionSpan> {
  readonly text: string;
  readonly applied: ReadonlyArray<T>;
}

function isValidRedactionSpan(
  originalLength: number,
  finding: RedactionSpan,
): boolean {
  return Number.isInteger(finding.startIndex) &&
    Number.isInteger(finding.endIndex) &&
    finding.startIndex >= 0 &&
    finding.endIndex <= originalLength &&
    finding.startIndex < finding.endIndex;
}

export function applyRedactions<T extends RedactionSpan>(
  original: string,
  findings: ReadonlyArray<T>,
): RedactionResult<T> {
  if (findings.length === 0) {
    return { text: original, applied: [] };
  }

  const accepted: T[] = [];
  const sorted = [...findings].sort((a, b) => {
    const startDiff = a.startIndex - b.startIndex;
    if (startDiff !== 0) return startDiff;
    const endDiff = b.endIndex - a.endIndex;
    if (endDiff !== 0) return endDiff;
    return a.placeholder.localeCompare(b.placeholder);
  });

  for (const finding of sorted) {
    if (!isValidRedactionSpan(original.length, finding)) {
      continue;
    }

    const previous = accepted[accepted.length - 1];
    if (previous && finding.startIndex < previous.endIndex) {
      continue;
    }

    accepted.push(finding);
  }

  let text = original;
  for (const finding of [...accepted].sort((a, b) => b.startIndex - a.startIndex)) {
    text =
      text.slice(0, finding.startIndex) +
      finding.placeholder +
      text.slice(finding.endIndex);
  }

  return { text, applied: accepted };
}

export function buildRedactedText(
  original: string,
  findings: ReadonlyArray<RedactionSpan>,
): string {
  return applyRedactions(original, findings).text;
}

/**
 * Attach file upload detection listeners.
 * Covers three vectors: input[type=file], drag-and-drop, clipboard paste.
 * Returns a cleanup function.
 */
export function attachFileDetector(
  input: HTMLElement,
  adapter: SiteAdapter,
  ctx: InterceptorContext,
  onFile: FileCallback,
  onAttachmentRemoved?: AttachmentRemovedCallback,
): () => void {
  const cleanups: Array<() => void> = [];
  const composerRoot =
    adapter.getDropZone() ??
    input.closest('form') ??
    input.parentElement ??
    document.body;

  function isAttachmentRemovalControl(element: Element | null): boolean {
    if (!(element instanceof HTMLElement)) return false;
    const control = element.closest('button,[role="button"]');
    if (!(control instanceof HTMLElement)) return false;
    if (!composerRoot.contains(control)) return false;

    const text = [
      control.getAttribute('aria-label') ?? '',
      control.getAttribute('title') ?? '',
      control.textContent ?? '',
    ]
      .join(' ')
      .trim()
      .toLowerCase();

    if (text.length === 0) return false;
    if (!/(remove|delete|discard|clear|close|cancel)/.test(text)) return false;

    return !/(send|stop|voice|audio|microphone|\battach\b|\bupload\b)/.test(text);
  }

  // --- Vector 1: <input type="file"> change events ---
  const handleFileInputChange = (e: Event): void => {
    if (ctx.isInvalid) return;
    const fileInput = e.target as HTMLInputElement;
    if (fileInput.type !== 'file') return;
    const files = fileInput.files;
    if (!files || files.length === 0) {
      onAttachmentRemoved?.(adapter.name);
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        onFile(file.name, adapter.name);
      }
    }
  };

  // Listen for change events on existing and future file inputs
  ctx.addEventListener(document, 'change', handleFileInputChange, true);

  // --- Vector 2: Drag-and-drop ---
  const dropZone = adapter.getDropZone();
  if (dropZone) {
    const handleDrop = (e: DragEvent): void => {
      if (ctx.isInvalid) return;
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          onFile(file.name, adapter.name);
        }
      }
    };
    ctx.addEventListener(dropZone, 'drop', handleDrop, true);
    cleanups.push(() =>
      dropZone.removeEventListener('drop', handleDrop as EventListener, true),
    );
  }

  // --- Vector 3: Clipboard paste with files ---
  const handlePaste = (e: ClipboardEvent): void => {
    if (ctx.isInvalid) return;
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        onFile(file.name, adapter.name);
      }
    }
  };
  ctx.addEventListener(input, 'paste', handlePaste, true);

  const handleAttachmentRemovalClick = (e: Event): void => {
    if (ctx.isInvalid) return;
    const target = e.target as Element | null;
    if (!isAttachmentRemovalControl(target)) return;
    onAttachmentRemoved?.(adapter.name);
  };
  ctx.addEventListener(composerRoot, 'click', handleAttachmentRemovalClick, true);

  return (): void => {
    document.removeEventListener('change', handleFileInputChange, true);
    input.removeEventListener('paste', handlePaste as EventListener, true);
    composerRoot.removeEventListener('click', handleAttachmentRemovalClick as EventListener, true);
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
