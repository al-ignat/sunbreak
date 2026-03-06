import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachScanner } from '../../../src/content/scanner';
import { createFindingsState } from '../../../src/content/findings-state';
import type { ScannerConfig, ScannerContext } from '../../../src/content/scanner';
import type { SiteAdapter } from '../../../src/types';
import { DEFAULT_DETECTION_SETTINGS, DEFAULT_EXTENSION_SETTINGS } from '../../../src/storage/types';

function makeAdapter(getText: () => string): SiteAdapter {
  const input = document.createElement('div');
  input.contentEditable = 'true';
  document.body.appendChild(input);
  return {
    name: 'chatgpt',
    findInput: (): HTMLElement => input,
    findSendButton: (): HTMLElement | null => null,
    getText: (): string => getText(),
    setText: vi.fn(),
    getDropZone: (): HTMLElement | null => null,
  };
}

function makeConfig(overrides?: Partial<ScannerConfig>): ScannerConfig {
  return {
    getKeywords: (): string[] => [],
    getDetectionSettings: () => ({ ...DEFAULT_DETECTION_SETTINGS }),
    getExtensionSettings: () => ({ ...DEFAULT_EXTENSION_SETTINGS }),
    ...overrides,
  };
}

function makeCtx(): ScannerContext & { invalidate: () => void } {
  let invalid = false;
  const callbacks: Array<() => void> = [];
  return {
    get isInvalid(): boolean { return invalid; },
    onInvalidated(cb: () => void): void { callbacks.push(cb); },
    invalidate(): void {
      invalid = true;
      callbacks.forEach((cb) => cb());
    },
  };
}

describe('attachScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('runs classification after debounce on input event', () => {
    let text = '';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig();
    const ctx = makeCtx();

    attachScanner(input, adapter, config, state, ctx);

    // Type some text with an email
    text = 'Contact john@example.com for details';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Before debounce: no findings yet
    expect(state.getSnapshot().tracked).toHaveLength(0);

    // After debounce
    vi.advanceTimersByTime(500);
    expect(state.getSnapshot().tracked.length).toBeGreaterThan(0);
    expect(state.getSnapshot().tracked[0]?.finding.type).toBe('email');
  });

  it('runs classification immediately on paste', () => {
    let text = '';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig();
    const ctx = makeCtx();

    attachScanner(input, adapter, config, state, ctx);

    text = 'My SSN is 123-45-6789';
    // Simulate paste via InputEvent
    input.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }),
    );

    // Should classify immediately without debounce
    expect(state.getSnapshot().tracked.length).toBeGreaterThan(0);
  });

  it('debounces repeated typing events', () => {
    let text = '';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig();
    const ctx = makeCtx();

    attachScanner(input, adapter, config, state, ctx);

    // Simulate multiple keystrokes
    text = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(200);

    text = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(200);

    text = 'abc john@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Not enough time yet
    vi.advanceTimersByTime(200);
    expect(state.getSnapshot().tracked).toHaveLength(0);

    // Full debounce from last input
    vi.advanceTimersByTime(300);
    expect(state.getSnapshot().tracked.length).toBeGreaterThan(0);
  });

  it('clears findings when text becomes empty', () => {
    let text = 'john@example.com';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig();
    const ctx = makeCtx();

    attachScanner(input, adapter, config, state, ctx);

    // Initial scan
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(state.getSnapshot().tracked.length).toBeGreaterThan(0);

    // Clear text
    text = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(state.getSnapshot().tracked).toHaveLength(0);
  });

  it('clears findings when extension is disabled', () => {
    let text = 'john@example.com';
    let enabled = true;
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig({
      getExtensionSettings: () => ({
        ...DEFAULT_EXTENSION_SETTINGS,
        enabled,
      }),
    });
    const ctx = makeCtx();

    attachScanner(input, adapter, config, state, ctx);

    // Initial scan
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(state.getSnapshot().tracked.length).toBeGreaterThan(0);

    // Disable extension
    enabled = false;
    text = 'john@example.com still here';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(state.getSnapshot().tracked).toHaveLength(0);
  });

  it('skips classification when text has not changed', () => {
    const text = 'john@example.com';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig();
    const ctx = makeCtx();

    const listener = vi.fn();
    state.subscribe(listener);

    attachScanner(input, adapter, config, state, ctx);

    // First input
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    const callCount = listener.mock.calls.length;

    // Second input with same text — should not trigger update
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(listener.mock.calls.length).toBe(callCount);
  });

  it('cleanup removes listeners and stops scanning', () => {
    let text = '';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig();
    const ctx = makeCtx();

    const cleanup = attachScanner(input, adapter, config, state, ctx);
    cleanup();

    text = 'john@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(state.getSnapshot().tracked).toHaveLength(0);
  });

  it('stops scanning on context invalidation', () => {
    let text = '';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig();
    const ctx = makeCtx();

    attachScanner(input, adapter, config, state, ctx);
    ctx.invalidate();

    text = 'john@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(state.getSnapshot().tracked).toHaveLength(0);
  });

  it('respects keyword settings from config', () => {
    let text = '';
    const adapter = makeAdapter(() => text);
    const input = adapter.findInput();
    if (!input) throw new Error('no input');
    const state = createFindingsState();
    const config = makeConfig({
      getKeywords: (): string[] => ['ProjectNeptune'],
    });
    const ctx = makeCtx();

    attachScanner(input, adapter, config, state, ctx);

    text = 'Working on ProjectNeptune today';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);

    const snap = state.getSnapshot();
    expect(snap.tracked.length).toBeGreaterThan(0);
    expect(snap.tracked[0]?.finding.type).toBe('keyword');
  });
});
