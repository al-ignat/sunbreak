import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  attachSubmissionInterceptor,
  attachFileDetector,
  applyRedactions,
  buildRedactedText,
} from '../../../src/content/interceptor';
import type { SubmitInterceptConfig } from '../../../src/content/interceptor';
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

/** Create a SubmitInterceptConfig */
function createConfig(
  overrides: Partial<SubmitInterceptConfig> = {},
): SubmitInterceptConfig {
  return {
    shouldBlock: overrides.shouldBlock ?? ((): boolean => true),
    onBlocked: overrides.onBlocked ?? ((): Promise<void> => Promise.resolve()),
  };
}

describe('attachSubmissionInterceptor', () => {
  let input: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    input = document.createElement('div');
    input.setAttribute('contenteditable', 'true');
    document.body.appendChild(input);
  });

  it('calls onBlocked on Enter when shouldBlock returns true', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const adapter = createMockAdapter({ getText: () => 'sensitive data' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, createConfig({ onBlocked }));

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it('does not call onBlocked when shouldBlock returns false', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const adapter = createMockAdapter({ getText: () => 'text' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(
      input,
      adapter,
      ctx,
      createConfig({ shouldBlock: () => false, onBlocked }),
    );

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(onBlocked).not.toHaveBeenCalled();
    // Should NOT be prevented — zero interception
    expect(event.defaultPrevented).toBe(false);
  });

  it('blocks the original event (preventDefault) when shouldBlock is true', () => {
    const adapter = createMockAdapter({ getText: () => 'text' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, createConfig());

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores Shift+Enter', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, createConfig({ onBlocked }));

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('ignores non-Enter keys', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, createConfig({ onBlocked }));

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );

    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('ignores empty text', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const adapter = createMockAdapter({ getText: () => '' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, createConfig({ onBlocked }));

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('does not call onBlocked after context invalidation', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, createConfig({ onBlocked }));
    ctx.invalidate();

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('intercepts on send button click', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const sendBtn = document.createElement('button');
    document.body.appendChild(sendBtn);

    const adapter = createMockAdapter({
      getText: () => 'click capture',
      findSendButton: () => sendBtn,
    });
    const ctx = createMockContext();

    attachSubmissionInterceptor(input, adapter, ctx, createConfig({ onBlocked }));

    sendBtn.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it('re-triggers keyboard submit after onBlocked resolves', async () => {
    const adapter = createMockAdapter({ getText: () => 'text' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(
      input,
      adapter,
      ctx,
      createConfig({ onBlocked: () => Promise.resolve() }),
    );

    const secondKeydownSpy = vi.fn();
    input.addEventListener('keydown', secondKeydownSpy);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    await vi.waitFor(() => {
      expect(secondKeydownSpy).toHaveBeenCalled();
    });
  });

  it('nonce bypass lets re-triggered event pass through', async () => {
    let blockCount = 0;
    const adapter = createMockAdapter({ getText: () => 'text' });
    const ctx = createMockContext();

    attachSubmissionInterceptor(
      input,
      adapter,
      ctx,
      createConfig({
        shouldBlock: () => {
          blockCount++;
          return true;
        },
        onBlocked: () => Promise.resolve(),
      }),
    );

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    await vi.waitFor(() => {
      // shouldBlock is called once for original, then the re-triggered event
      // has the nonce so it bypasses shouldBlock entirely
      expect(blockCount).toBe(1);
    });
  });

  it('returns a cleanup function', () => {
    const onBlocked = vi.fn().mockResolvedValue(undefined);
    const adapter = createMockAdapter();
    const ctx = createMockContext();

    const cleanup = attachSubmissionInterceptor(
      input,
      adapter,
      ctx,
      createConfig({ onBlocked }),
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

    expect(onBlocked).not.toHaveBeenCalled();
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
    const result = buildRedactedText('AB', [
      { startIndex: 0, endIndex: 1, placeholder: '[X_1]' },
      { startIndex: 1, endIndex: 2, placeholder: '[Y_1]' },
    ]);
    expect(result).toBe('[X_1][Y_1]');
  });

  it('ignores invalid spans instead of corrupting the text', () => {
    const result = buildRedactedText('Email: john@example.com', [
      { startIndex: -1, endIndex: 4, placeholder: '[BAD]' },
      { startIndex: 7, endIndex: 23, placeholder: '[EMAIL_1]' },
      { startIndex: 99, endIndex: 120, placeholder: '[BAD_2]' },
    ]);
    expect(result).toBe('Email: [EMAIL_1]');
  });

  it('skips overlapping spans deterministically', () => {
    const result = buildRedactedText('john@example.com', [
      { startIndex: 0, endIndex: 16, placeholder: '[EMAIL_FULL]' },
      { startIndex: 5, endIndex: 16, placeholder: '[EMAIL_PARTIAL]' },
    ]);
    expect(result).toBe('[EMAIL_FULL]');
  });
});

describe('applyRedactions', () => {
  it('returns only the spans that were actually applied', () => {
    const first = { startIndex: 0, endIndex: 4, placeholder: '[A]', id: 'a' };
    const overlapping = { startIndex: 2, endIndex: 5, placeholder: '[B]', id: 'b' };
    const second = { startIndex: 4, endIndex: 7, placeholder: '[C]', id: 'c' };

    const result = applyRedactions('ABCDEFG', [first, overlapping, second]);

    expect(result.text).toBe('[A][C]');
    expect(result.applied).toEqual([first, second]);
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

  it('detects explicit attachment removal clicks inside the composer', () => {
    const onFile = vi.fn();
    const onAttachmentRemoved = vi.fn();
    const composer = document.createElement('form');
    composer.appendChild(input);
    document.body.appendChild(composer);

    const removeBtn = document.createElement('button');
    removeBtn.setAttribute('aria-label', 'Remove attachment');
    composer.appendChild(removeBtn);

    const adapter = createMockAdapter({
      findInput: () => input,
      getDropZone: () => composer,
    });
    const ctx = createMockContext();

    attachFileDetector(input, adapter, ctx, onFile, onAttachmentRemoved);

    removeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onAttachmentRemoved).toHaveBeenCalledWith('chatgpt');
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
