import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  attachSubmissionInterceptor,
  attachFileDetector,
  buildRedactedText,
} from '../../../src/content/interceptor';
import type { InterceptCallback } from '../../../src/content/interceptor';
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

/** Create an InterceptCallback that resolves with the given result */
function createInterceptCallback(
  result: 'release' | 'block' | 'redact' = 'release',
): InterceptCallback & ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(result);
}

describe('attachSubmissionInterceptor', () => {
  let input: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    input = document.createElement('div');
    input.setAttribute('contenteditable', 'true');
    document.body.appendChild(input);
  });

  it('calls intercept callback on Enter key', () => {
    const onIntercept = createInterceptCallback('block');
    const adapter = createMockAdapter({ getText: () => 'sensitive data' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onIntercept).toHaveBeenCalledWith('sensitive data', 'chatgpt');
  });

  it('blocks the original event (preventDefault)', () => {
    const onIntercept = createInterceptCallback('block');
    const adapter = createMockAdapter({ getText: () => 'text' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores Shift+Enter', () => {
    const onIntercept = createInterceptCallback();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(onIntercept).not.toHaveBeenCalled();
  });

  it('ignores non-Enter keys', () => {
    const onIntercept = createInterceptCallback();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );

    expect(onIntercept).not.toHaveBeenCalled();
  });

  it('ignores empty text', () => {
    const onIntercept = createInterceptCallback();
    const adapter = createMockAdapter({ getText: () => '' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onIntercept).not.toHaveBeenCalled();
  });

  it('does not call callback after context invalidation', () => {
    const onIntercept = createInterceptCallback();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);
    ctx.invalidate();

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onIntercept).not.toHaveBeenCalled();
  });

  it('intercepts on send button click', () => {
    const onIntercept = createInterceptCallback('block');
    const sendBtn = document.createElement('button');
    document.body.appendChild(sendBtn);

    const adapter = createMockAdapter({
      getText: () => 'click capture',
      findSendButton: () => sendBtn,
    });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);

    sendBtn.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(onIntercept).toHaveBeenCalledWith('click capture', 'chatgpt');
  });

  it('re-triggers keyboard submit on release result', async () => {
    const onIntercept = createInterceptCallback('release');
    const adapter = createMockAdapter({ getText: () => 'text' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, onIntercept);

    const secondKeydownSpy = vi.fn();
    // Listen for the re-triggered Enter event (non-capture, so it fires after interceptor)
    input.addEventListener('keydown', secondKeydownSpy);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    // Wait for the async intercept callback to resolve
    await vi.waitFor(() => {
      // The second keydown should have been dispatched by the interceptor
      // It's the re-triggered Enter event
      expect(secondKeydownSpy).toHaveBeenCalled();
    });
  });

  it('returns a cleanup function', () => {
    const onIntercept = createInterceptCallback();
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    const cleanup = attachSubmissionInterceptor(
      input,
      adapter,
      ctx,
      onIntercept,
    );

    expect(typeof cleanup).toBe('function');
    cleanup();

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onIntercept).not.toHaveBeenCalled();
  });
});

describe('buildRedactedText', () => {
  it('replaces a single finding with its placeholder', () => {
    const result = buildRedactedText('Email: john@example.com is here', [
      { startIndex: 7, endIndex: 23, placeholder: '[EMAIL_1]' },
    ]);
    expect(result).toBe('Email: [EMAIL_1] is here');
  });

  it('replaces multiple findings from right to left', () => {
    const result = buildRedactedText(
      'Call 555-1234 or email john@test.com',
      [
        { startIndex: 5, endIndex: 13, placeholder: '[PHONE_1]' },
        { startIndex: 23, endIndex: 36, placeholder: '[EMAIL_1]' },
      ],
    );
    expect(result).toBe('Call [PHONE_1] or email [EMAIL_1]');
  });

  it('handles findings at the start of text', () => {
    const result = buildRedactedText('john@example.com is my email', [
      { startIndex: 0, endIndex: 16, placeholder: '[EMAIL_1]' },
    ]);
    expect(result).toBe('[EMAIL_1] is my email');
  });

  it('handles findings at the end of text', () => {
    const result = buildRedactedText('My email is john@example.com', [
      { startIndex: 12, endIndex: 28, placeholder: '[EMAIL_1]' },
    ]);
    expect(result).toBe('My email is [EMAIL_1]');
  });

  it('returns original text when no findings', () => {
    const result = buildRedactedText('Hello world', []);
    expect(result).toBe('Hello world');
  });

  it('handles adjacent findings correctly', () => {
    // Two findings right next to each other
    const result = buildRedactedText('AB', [
      { startIndex: 0, endIndex: 1, placeholder: '[X_1]' },
      { startIndex: 1, endIndex: 2, placeholder: '[Y_1]' },
    ]);
    expect(result).toBe('[X_1][Y_1]');
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
