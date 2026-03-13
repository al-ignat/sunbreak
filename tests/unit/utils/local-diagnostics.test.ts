import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearLocalDiagnostics,
  getLocalDiagnostics,
  isLocalDiagnosticsEnabled,
  recordLocalDiagnostic,
} from '../../../src/utils/local-diagnostics';

describe('local diagnostics', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    clearLocalDiagnostics();
    storage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string): string | null => storage.get(key) ?? null,
        setItem: (key: string, value: string): void => {
          storage.set(key, value);
        },
        removeItem: (key: string): void => {
          storage.delete(key);
        },
      },
      configurable: true,
    });
    delete (globalThis as { __SUNBREAK_DEBUG__?: boolean }).__SUNBREAK_DEBUG__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records structured local diagnostic entries', () => {
    const entry = recordLocalDiagnostic('observer', 'attach-start', {
      adapter: 'chatgpt',
    });

    expect(entry.subsystem).toBe('observer');
    expect(getLocalDiagnostics()).toEqual([entry]);
  });

  it('caps the diagnostics buffer to the most recent 200 entries', () => {
    for (let i = 0; i < 205; i += 1) {
      recordLocalDiagnostic('widget-controller', `event-${i}`);
    }

    const diagnostics = getLocalDiagnostics();
    expect(diagnostics).toHaveLength(200);
    expect(diagnostics[0]?.event).toBe('event-5');
    expect(diagnostics.at(-1)?.event).toBe('event-204');
  });

  it('enables console mirroring when the localStorage debug flag is set', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    globalThis.localStorage.setItem('sunbreak:debug', '1');

    expect(isLocalDiagnosticsEnabled()).toBe(true);
    recordLocalDiagnostic('widget-controller', 'anchor-state-changed', {
      mode: 'send-button',
    });

    expect(debugSpy).toHaveBeenCalledWith(
      '[Sunbreak:widget-controller] anchor-state-changed',
      { mode: 'send-button' },
    );
  });

  it('enables console mirroring when the global debug flag is set', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    (globalThis as { __SUNBREAK_DEBUG__?: boolean }).__SUNBREAK_DEBUG__ = true;

    expect(isLocalDiagnosticsEnabled()).toBe(true);
    recordLocalDiagnostic('orchestrator', 'settings-loaded');

    expect(debugSpy).toHaveBeenCalledWith(
      '[Sunbreak:orchestrator] settings-loaded',
      {},
    );
  });
});
