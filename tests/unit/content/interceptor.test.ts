import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  attachSubmissionInterceptor,
  attachFileDetector,
} from '../../../src/content/interceptor';
import type { SiteAdapter } from '../../../src/types';

function createMockAdapter(overrides: Partial<SiteAdapter> = {}): SiteAdapter {
  return {
    name: 'chatgpt',
    matches: () => true,
    findInput: () => null,
    findSendButton: () => null,
    getText: () => 'mock text',
    setText: (): void => {},
    getDropZone: () => null,
    ...overrides,
  };
}

function createMockContext(): {
  isInvalid: boolean;
  addEventListener: (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  onInvalidated: (callback: () => void) => void;
  invalidate: () => void;
} {
  const invalidatedCallbacks: Array<() => void> = [];
  const ctx = {
    isInvalid: false,
    addEventListener(
      target: EventTarget,
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void {
      target.addEventListener(type, handler, options);
    },
    onInvalidated(callback: () => void): void {
      invalidatedCallbacks.push(callback);
    },
    invalidate(): void {
      ctx.isInvalid = true;
      for (const cb of invalidatedCallbacks) cb();
    },
  };
  return ctx;
}

describe('attachSubmissionInterceptor', () => {
  let input: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    input = document.createElement('div');
    input.setAttribute('contenteditable', 'true');
    document.body.appendChild(input);
  });

  it('captures text on Enter key', () => {
    const onCapture = vi.fn();
    const adapter = createMockAdapter({ getText: () => 'sensitive data' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onCapture);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(onCapture).toHaveBeenCalledWith('sensitive data', 'chatgpt');
  });

  it('ignores Shift+Enter', () => {
    const onCapture = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onCapture);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('ignores non-Enter keys', () => {
    const onCapture = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onCapture);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('ignores empty text', () => {
    const onCapture = vi.fn();
    const adapter = createMockAdapter({ getText: () => '' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onCapture);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('does not capture after context invalidation', () => {
    const onCapture = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onCapture);
    ctx.invalidate();

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('captures on send button click', () => {
    const onCapture = vi.fn();
    const sendBtn = document.createElement('button');
    sendBtn.setAttribute('data-testid', 'send-button');
    document.body.appendChild(sendBtn);

    const adapter = createMockAdapter({
      getText: () => 'click capture',
      findSendButton: () => sendBtn,
    });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onCapture);

    sendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onCapture).toHaveBeenCalledWith('click capture', 'chatgpt');
  });

  it('returns a cleanup function', () => {
    const onCapture = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    const cleanup = attachSubmissionInterceptor(
      input,
      adapter,
      ctx,
      onCapture,
    );

    expect(typeof cleanup).toBe('function');
    cleanup();

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(onCapture).not.toHaveBeenCalled();
  });
});

describe('attachFileDetector', () => {
  let input: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    input = document.createElement('div');
    document.body.appendChild(input);
  });

  it('detects file input change events', () => {
    const onFile = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachFileDetector(input, adapter, ctx, onFile);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    document.body.appendChild(fileInput);

    // Simulate file selection
    const file = new File(['content'], 'secret.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onFile).toHaveBeenCalledWith('secret.pdf', 'chatgpt');
  });

  it('detects drag-and-drop file uploads', () => {
    const onFile = vi.fn();
    const dropZone = document.createElement('div');
    document.body.appendChild(dropZone);

    const adapter = createMockAdapter({ getDropZone: () => dropZone });
    const ctx = createMockContext();

    attachFileDetector(input, adapter, ctx, onFile);

    const file = new File(['data'], 'report.xlsx');
    const dropEvent = new Event('drop', { bubbles: true }) as DragEvent;
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file] },
    });

    dropZone.dispatchEvent(dropEvent);

    expect(onFile).toHaveBeenCalledWith('report.xlsx', 'chatgpt');
  });

  it('detects paste events with files', () => {
    const onFile = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachFileDetector(input, adapter, ctx, onFile);

    const file = new File(['img'], 'screenshot.png', { type: 'image/png' });
    const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { files: [file] },
    });

    input.dispatchEvent(pasteEvent);

    expect(onFile).toHaveBeenCalledWith('screenshot.png', 'chatgpt');
  });

  it('does not fire for non-file inputs', () => {
    const onFile = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachFileDetector(input, adapter, ctx, onFile);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    document.body.appendChild(textInput);
    textInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onFile).not.toHaveBeenCalled();
  });

  it('returns a cleanup function', () => {
    const onFile = vi.fn();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    const cleanup = attachFileDetector(input, adapter, ctx, onFile);
    expect(typeof cleanup).toBe('function');
  });
});
