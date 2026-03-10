import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClipboardInterceptor } from '../../../src/content/clipboard-interceptor';
import { createMaskingMap } from '../../../src/content/masking-map';

/** Helper: create a ClipboardEvent with mocked clipboardData */
function createCopyEvent(): ClipboardEvent {
  const event = new Event('copy', { bubbles: true, cancelable: true }) as ClipboardEvent;
  const clipboardData = {
    setData: vi.fn(),
    getData: vi.fn().mockReturnValue(''),
  };
  Object.defineProperty(event, 'clipboardData', { value: clipboardData });
  return event;
}

/** Helper: simulate a postMessage from the same window (MAIN→ISOLATED) */
function simulateClipboardWriteMessage(text: string): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: 'sunbreak:clipboard-write', text },
      source: window,
    }),
  );
}

/** Helper: mock window.getSelection to return given text */
function mockSelection(text: string): void {
  vi.spyOn(window, 'getSelection').mockReturnValue({
    toString: () => text,
  } as unknown as Selection);
}

describe('ClipboardInterceptor', () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onTokensFound with correct count when tokens are in selection', async () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');
    maskingMap.set('«phone-US-555»', '+1-555-123-4567');

    const onTokensFound = vi.fn().mockResolvedValue(false);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();

    mockSelection('Contact «email-john» or call «phone-US-555»');
    const event = createCopyEvent();
    document.dispatchEvent(event);

    // Flush microtasks so the .then() runs
    await vi.waitFor(() => {
      expect(onTokensFound).toHaveBeenCalledWith(2);
    });

    interceptor.detach();
    maskingMap.destroy();
  });

  it('does not call onTokensFound when no tokens in selection', () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');

    const onTokensFound = vi.fn().mockResolvedValue(false);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();

    mockSelection('No tokens in this text');
    const event = createCopyEvent();
    document.dispatchEvent(event);

    expect(onTokensFound).not.toHaveBeenCalled();
    // Default copy should proceed (not prevented)
    expect(event.defaultPrevented).toBe(false);

    interceptor.detach();
    maskingMap.destroy();
  });

  it('ignores copy with empty selection', () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');

    const onTokensFound = vi.fn().mockResolvedValue(false);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();

    mockSelection('');
    const event = createCopyEvent();
    document.dispatchEvent(event);

    expect(onTokensFound).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);

    interceptor.detach();
    maskingMap.destroy();
  });

  it('writes tokenized text to clipboardData as safe default', () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');

    const onTokensFound = vi.fn().mockResolvedValue(false);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();

    const selectionText = 'Contact «email-john» for info';
    mockSelection(selectionText);
    const event = createCopyEvent();
    document.dispatchEvent(event);

    // Should prevent default and write tokenized text
    expect(event.defaultPrevented).toBe(true);
    expect(event.clipboardData?.setData).toHaveBeenCalledWith('text/plain', selectionText);

    interceptor.detach();
    maskingMap.destroy();
  });

  it('overwrites clipboard with restored text when user accepts', async () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');

    const onTokensFound = vi.fn().mockResolvedValue(true);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();

    mockSelection('Contact «email-john» for info');
    const event = createCopyEvent();
    document.dispatchEvent(event);

    await vi.waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('Contact john@acme.com for info');
    });

    interceptor.detach();
    maskingMap.destroy();
  });

  it('does not overwrite clipboard when user declines', async () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');

    const onTokensFound = vi.fn().mockResolvedValue(false);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();

    mockSelection('Contact «email-john» for info');
    const event = createCopyEvent();
    document.dispatchEvent(event);

    await vi.waitFor(() => {
      expect(onTokensFound).toHaveBeenCalled();
    });

    expect(writeTextMock).not.toHaveBeenCalled();

    interceptor.detach();
    maskingMap.destroy();
  });

  it('detach stops listening for copy events', () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');

    const onTokensFound = vi.fn().mockResolvedValue(false);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();
    interceptor.detach();

    mockSelection('Contact «email-john» for info');
    const event = createCopyEvent();
    document.dispatchEvent(event);

    expect(onTokensFound).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);

    maskingMap.destroy();
  });

  describe('postMessage (site copy button)', () => {
    it('calls onTokensFound when postMessage contains tokens', async () => {
      const maskingMap = createMaskingMap();
      maskingMap.set('«email-john»', 'john@acme.com');

      const onTokensFound = vi.fn().mockResolvedValue(false);
      const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
      interceptor.attach();

      simulateClipboardWriteMessage('Contact «email-john» for info');

      await vi.waitFor(() => {
        expect(onTokensFound).toHaveBeenCalledWith(1);
      });

      interceptor.detach();
      maskingMap.destroy();
    });

    it('overwrites clipboard with restored text when user accepts via postMessage', async () => {
      const maskingMap = createMaskingMap();
      maskingMap.set('«email-john»', 'john@acme.com');

      const onTokensFound = vi.fn().mockResolvedValue(true);
      const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
      interceptor.attach();

      simulateClipboardWriteMessage('Contact «email-john» for info');

      await vi.waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('Contact john@acme.com for info');
      });

      interceptor.detach();
      maskingMap.destroy();
    });

    it('ignores postMessage with wrong type', () => {
      const maskingMap = createMaskingMap();
      maskingMap.set('«email-john»', 'john@acme.com');

      const onTokensFound = vi.fn().mockResolvedValue(false);
      const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
      interceptor.attach();

      // Dispatch message with wrong type — synchronous, no await needed
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'other-message', text: '«email-john»' },
          source: window,
        }),
      );

      expect(onTokensFound).not.toHaveBeenCalled();

      interceptor.detach();
      maskingMap.destroy();
    });

    it('ignores postMessage with no tokens', () => {
      const maskingMap = createMaskingMap();
      maskingMap.set('«email-john»', 'john@acme.com');

      const onTokensFound = vi.fn().mockResolvedValue(false);
      const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
      interceptor.attach();

      simulateClipboardWriteMessage('No tokens here');

      expect(onTokensFound).not.toHaveBeenCalled();

      interceptor.detach();
      maskingMap.destroy();
    });

    it('detach stops listening for postMessage', () => {
      const maskingMap = createMaskingMap();
      maskingMap.set('«email-john»', 'john@acme.com');

      const onTokensFound = vi.fn().mockResolvedValue(false);
      const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
      interceptor.attach();
      interceptor.detach();

      simulateClipboardWriteMessage('«email-john»');

      expect(onTokensFound).not.toHaveBeenCalled();

      maskingMap.destroy();
    });
  });

  it('handles navigator.clipboard.writeText failure gracefully', async () => {
    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');

    writeTextMock.mockRejectedValue(new Error('Focus lost'));

    const onTokensFound = vi.fn().mockResolvedValue(true);
    const interceptor = createClipboardInterceptor(maskingMap, { onTokensFound });
    interceptor.attach();

    mockSelection('Contact «email-john» for info');
    const event = createCopyEvent();
    document.dispatchEvent(event);

    // Should not throw — error is caught silently
    await vi.waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    interceptor.detach();
    maskingMap.destroy();
  });
});
