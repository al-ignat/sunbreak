import type { SiteAdapter, FileCallback, SiteName } from '../types';

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
 * Result of the interception callback.
 * - 'release': allow the submission to proceed (re-trigger programmatically)
 * - 'block': block the submission (overlay is handling it)
 * - 'redact': submission will happen after text replacement
 */
export type InterceptResult = 'release' | 'block' | 'redact';

/**
 * Callback invoked when a prompt submission is intercepted.
 * The submission is already blocked at this point.
 * Returns the decision for what to do next.
 */
export type InterceptCallback = (
  text: string,
  adapterName: SiteName,
) => Promise<InterceptResult>;

/**
 * Attach submission interception listeners.
 * Phase 4: blocks submission, calls the callback, then re-triggers if needed.
 * Returns a cleanup function.
 */
export function attachSubmissionInterceptor(
  input: HTMLElement,
  adapter: SiteAdapter,
  ctx: InterceptorContext,
  onIntercept: InterceptCallback,
): () => void {
  // Bypass flag: when true, the next event is a re-triggered submission
  // and should pass through without interception
  let bypassNext = false;

  const handleKeydown = (e: KeyboardEvent): void => {
    if (ctx.isInvalid) return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey || e.isComposing) return;

    // Let re-triggered events pass through
    if (bypassNext) {
      bypassNext = false;
      return;
    }

    const text = adapter.getText(input);
    if (text.length === 0) return;

    // Block the original submission
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    void onIntercept(text, adapter.name).then((result) => {
      if (ctx.isInvalid) return;
      if (result === 'release' || result === 'redact') {
        triggerKeyboardSubmit(input);
      }
      // 'block' means overlay is showing — do nothing
    });
  };

  const handleClick = (e: MouseEvent): void => {
    if (ctx.isInvalid) return;

    // Let re-triggered events pass through
    if (bypassNext) {
      bypassNext = false;
      return;
    }

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const sendButton = adapter.findSendButton();
    if (!sendButton) return;
    if (!sendButton.contains(target) && sendButton !== target) return;

    const text = adapter.getText(input);
    if (text.length === 0) return;

    // Block the original submission
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    void onIntercept(text, adapter.name).then((result) => {
      if (ctx.isInvalid) return;
      if (result === 'release' || result === 'redact') {
        triggerButtonSubmit(adapter);
      }
    });
  };

  function triggerKeyboardSubmit(target: HTMLElement): void {
    bypassNext = true;
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    // Reset bypass if the event wasn't handled (safety net)
    setTimeout(() => {
      bypassNext = false;
    }, 100);
  }

  function triggerButtonSubmit(siteAdapter: SiteAdapter): void {
    const sendButton = siteAdapter.findSendButton();
    if (sendButton) {
      bypassNext = true;
      sendButton.click();
      setTimeout(() => {
        bypassNext = false;
      }, 100);
    }
  }

  // Capture phase to fire before the site's own handlers
  ctx.addEventListener(input, 'keydown', handleKeydown, true);
  ctx.addEventListener(document, 'click', handleClick, true);

  return (): void => {
    input.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('click', handleClick, true);
  };
}

/**
 * Build redacted text by replacing findings with their placeholders.
 * Processes findings from right to left to avoid index shifting.
 *
 * Safe because the classification engine guarantees no overlapping findings
 * (Phase 3, Design Decision D1).
 */
export function buildRedactedText(
  original: string,
  findings: ReadonlyArray<{
    readonly startIndex: number;
    readonly endIndex: number;
    readonly placeholder: string;
  }>,
): string {
  let result = original;
  const sorted = [...findings].sort((a, b) => b.startIndex - a.startIndex);
  for (const finding of sorted) {
    result =
      result.slice(0, finding.startIndex) +
      finding.placeholder +
      result.slice(finding.endIndex);
  }
  return result;
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
): () => void {
  const cleanups: Array<() => void> = [];

  // --- Vector 1: <input type="file"> change events ---
  const handleFileInputChange = (e: Event): void => {
    if (ctx.isInvalid) return;
    const fileInput = e.target as HTMLInputElement;
    if (fileInput.type !== 'file') return;
    const files = fileInput.files;
    if (!files) return;
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

  return (): void => {
    document.removeEventListener('change', handleFileInputChange, true);
    input.removeEventListener('paste', handlePaste as EventListener, true);
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
