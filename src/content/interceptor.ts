import type { SiteAdapter, PromptCallback, FileCallback } from '../types';

interface InterceptorContext {
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
 * Attach submission interception listeners.
 * Phase 2: captures text but does NOT prevent submission.
 * Returns a cleanup function.
 */
export function attachSubmissionInterceptor(
  input: HTMLElement,
  adapter: SiteAdapter,
  ctx: InterceptorContext,
  onCapture: PromptCallback,
): () => void {
  const handleKeydown = (e: KeyboardEvent): void => {
    if (ctx.isInvalid) return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey || e.isComposing) return;

    const text = adapter.getText(input);
    if (text.length === 0) return;

    // Phase 2: observe only — do not block submission
    onCapture(text, adapter.name);
  };

  const handleClick = (e: MouseEvent): void => {
    if (ctx.isInvalid) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const sendButton = adapter.findSendButton();
    if (!sendButton) return;
    if (!sendButton.contains(target) && sendButton !== target) return;

    const text = adapter.getText(input);
    if (text.length === 0) return;

    onCapture(text, adapter.name);
  };

  // Capture phase to fire before the site's own handlers
  ctx.addEventListener(input, 'keydown', handleKeydown, true);
  ctx.addEventListener(document, 'click', handleClick, true);

  return (): void => {
    input.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('click', handleClick, true);
  };
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
