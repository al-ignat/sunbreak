import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectAdapter } from '../../../src/content/sites';
import { startObserving } from '../../../src/content/observer';
import { createMaskingMap } from '../../../src/content/masking-map';
import type { MaskingMap } from '../../../src/content/masking-map';

// Mock interceptor + scanner so startObserving doesn't need real DOM wiring
vi.mock('../../../src/content/interceptor', () => ({
  attachSubmissionInterceptor: (): (() => void) => () => {},
  attachFileDetector: (): (() => void) => () => {},
}));
vi.mock('../../../src/content/scanner', () => ({
  attachScanner: (): (() => void) => () => {},
}));

describe('selectAdapter', () => {
  it('returns chatgpt adapter for chatgpt.com', () => {
    const adapter = selectAdapter('chatgpt.com');
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe('chatgpt');
  });

  it('returns claude adapter for claude.ai', () => {
    const adapter = selectAdapter('claude.ai');
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe('claude');
  });

  it('returns gemini adapter for gemini.google.com', () => {
    const adapter = selectAdapter('gemini.google.com');
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe('gemini');
  });

  it('returns null for unsupported sites', () => {
    expect(selectAdapter('google.com')).toBeNull();
    expect(selectAdapter('facebook.com')).toBeNull();
    expect(selectAdapter('')).toBeNull();
  });
});

describe('observer module integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('adapter findInput returns element when present', () => {
    const editor = document.createElement('div');
    editor.id = 'prompt-textarea';
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);

    const adapter = selectAdapter('chatgpt.com');
    expect(adapter?.findInput()).toBe(editor);
  });

  it('adapter findInput returns null when element absent', () => {
    const adapter = selectAdapter('chatgpt.com');
    expect(adapter?.findInput()).toBeNull();
  });

  it('adapters correctly extract multi-line text', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>';

    const chatgpt = selectAdapter('chatgpt.com');
    expect(chatgpt?.getText(editor)).toBe(
      'First paragraph\nSecond paragraph\nThird paragraph',
    );

    const claude = selectAdapter('claude.ai');
    expect(claude?.getText(editor)).toBe(
      'First paragraph\nSecond paragraph\nThird paragraph',
    );

    const gemini = selectAdapter('gemini.google.com');
    expect(gemini?.getText(editor)).toBe(
      'First paragraph\nSecond paragraph\nThird paragraph',
    );
  });
});

describe('conversation-change MaskingMap clearing', () => {
  let maskingMap: MaskingMap;
  let locationChangeHandler: (() => void) | null;
  const originalLocation = window.location;

  function setPathname(path: string): void {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'chatgpt.com', pathname: path },
      writable: true,
      configurable: true,
    });
  }

  function makeCtx(): {
    isInvalid: boolean;
    addEventListener: (
      target: EventTarget,
      type: string,
      handler: (event: Event) => void,
      options?: boolean | AddEventListenerOptions,
    ) => void;
    onInvalidated: (callback: () => void) => void;
    setInterval: (callback: () => void, ms: number) => number;
  } {
    return {
      isInvalid: false,
      addEventListener: (
        _target: EventTarget,
        type: string,
        handler: (event: Event) => void,
      ): void => {
        if (type === 'wxt:locationchange') {
          locationChangeHandler = handler as unknown as () => void;
        }
      },
      onInvalidated: (): void => {},
      setInterval: (): number => 0,
    };
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    locationChangeHandler = null;
    maskingMap = createMaskingMap();
    // Create the editor element so waitForElement resolves immediately
    const editor = document.createElement('div');
    editor.id = 'prompt-textarea';
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    maskingMap.destroy();
  });

  it('does NOT clear MaskingMap when new chat creates its first URL (/ → /c/abc)', () => {
    // Start at root (new chat page)
    setPathname('/');

    startObserving(
      makeCtx(),
      { onSubmit: () => {} },
      () => {},
      undefined,
      undefined,
      maskingMap,
    );

    // Populate the masking map (user clicked Fix)
    maskingMap.set('[John S. email]', 'john@acme.com');
    expect(maskingMap.size).toBe(1);

    // Simulate SPA navigation: ChatGPT assigns a conversation URL
    setPathname('/c/abc-123');
    if (!locationChangeHandler) throw new Error('locationchange handler not registered');
    locationChangeHandler();

    // MaskingMap should still have the entry
    expect(maskingMap.size).toBe(1);
    expect(maskingMap.get('[John S. email]')).toBe('john@acme.com');
  });

  it('clears MaskingMap when switching between conversations (/c/abc → /c/def)', () => {
    // Start at an existing conversation
    setPathname('/c/abc-123');

    startObserving(
      makeCtx(),
      { onSubmit: () => {} },
      () => {},
      undefined,
      undefined,
      maskingMap,
    );

    maskingMap.set('[John S. email]', 'john@acme.com');
    expect(maskingMap.size).toBe(1);

    // Navigate to a different conversation
    setPathname('/c/def-456');
    if (!locationChangeHandler) throw new Error('locationchange handler not registered');
    locationChangeHandler();

    expect(maskingMap.size).toBe(0);
  });

  it('clears MaskingMap when navigating from conversation to new chat (/c/abc → /)', () => {
    setPathname('/c/abc-123');

    startObserving(
      makeCtx(),
      { onSubmit: () => {} },
      () => {},
      undefined,
      undefined,
      maskingMap,
    );

    maskingMap.set('[phone ending 67]', '+1-555-012-3467');
    expect(maskingMap.size).toBe(1);

    // Navigate to new chat
    setPathname('/');
    if (!locationChangeHandler) throw new Error('locationchange handler not registered');
    locationChangeHandler();

    expect(maskingMap.size).toBe(0);
  });
});
