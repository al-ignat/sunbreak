import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOrchestrator } from '../../../src/content/orchestrator';
import type { SiteAdapter } from '../../../src/types';
import type { Finding } from '../../../src/classifier/types';

// Mock the widget controller
vi.mock('../../../src/ui/widget/widget-controller', () => ({
  createWidgetController: vi.fn(() => ({
    mount: vi.fn(),
    unmount: vi.fn(),
    destroy: vi.fn(),
    showToast: vi.fn().mockResolvedValue('timeout'),
    showRestoreToast: vi.fn().mockResolvedValue(false),
    setEnabled: vi.fn(),
  })),
}));

// Mock the storage events
vi.mock('../../../src/storage/events', () => ({
  logFlaggedEvent: vi.fn(),
  logCleanPrompt: vi.fn(),
}));

// Mock the dashboard storage
vi.mock('../../../src/storage/dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/storage/dashboard')>();
  return {
    ...actual,
    getKeywords: vi.fn().mockResolvedValue([]),
    getCustomPatterns: vi.fn().mockResolvedValue([]),
    getDetectionSettings: vi.fn().mockResolvedValue(undefined),
    getExtensionSettings: vi.fn().mockResolvedValue(undefined),
  };
});

import { createWidgetController } from '../../../src/ui/widget/widget-controller';
import { logFlaggedEvent, logCleanPrompt } from '../../../src/storage/events';
import {
  getExtensionSettings,
  getDetectionSettings,
  getCustomPatterns,
} from '../../../src/storage/dashboard';
import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
} from '../../../src/storage/types';

function createMockAdapter(overrides: Partial<SiteAdapter> = {}): SiteAdapter {
  const input = document.createElement('div');
  return {
    name: 'chatgpt',
    matches: () => true,
    findInput: () => input,
    findSendButton: () => null,
    getText: () => 'mock text',
    setText: vi.fn(),
    getDropZone: () => null,
    ...overrides,
  };
}

function createMockContext(): {
  isInvalid: boolean;
  onInvalidated: (cb: () => void) => void;
  invalidate: () => void;
} {
  const callbacks: Array<() => void> = [];
  return {
    isInvalid: false,
    onInvalidated(cb: () => void): void {
      callbacks.push(cb);
    },
    invalidate(): void {
      this.isInvalid = true;
      for (const cb of callbacks) cb();
    },
  };
}

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    type: 'email',
    value: 'john@example.com',
    startIndex: 0,
    endIndex: 16,
    confidence: 'HIGH',
    label: 'Email Address',
    placeholder: '[EMAIL_1]',
    ...overrides,
  };
}

/** Flush microtasks so fetchAllSettings resolves */
async function flushSettingsInit(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('createOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.mocked(getExtensionSettings).mockResolvedValue({ ...DEFAULT_EXTENSION_SETTINGS });
    vi.mocked(getDetectionSettings).mockResolvedValue({ ...DEFAULT_DETECTION_SETTINGS });
    vi.mocked(getCustomPatterns).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns submitConfig, onFileDetected, findingsState, scannerConfig, widgetController, maskingMap, clipboardInterceptor', () => {
    const adapter = createMockAdapter();
    const ctx = createMockContext();
    const result = createOrchestrator(adapter, ctx);

    expect(result.submitConfig).toBeDefined();
    expect(typeof result.submitConfig.shouldBlock).toBe('function');
    expect(typeof result.submitConfig.onBlocked).toBe('function');
    expect(typeof result.onFileDetected).toBe('function');
    expect(result.findingsState).toBeDefined();
    expect(result.scannerConfig).toBeDefined();
    expect(result.widgetController).toBeDefined();
    expect(result.maskingMap).toBeDefined();
    expect(typeof result.maskingMap.set).toBe('function');
    expect(typeof result.maskingMap.restore).toBe('function');
    expect(result.clipboardInterceptor).toBeDefined();
    expect(typeof result.clipboardInterceptor.attach).toBe('function');
    expect(typeof result.clipboardInterceptor.detach).toBe('function');
  });

  describe('shouldBlock', () => {
    it('returns false when no active findings', () => {
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig } = createOrchestrator(adapter, ctx);

      expect(submitConfig.shouldBlock()).toBe(false);
    });

    it('logs clean prompt when no active findings', () => {
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig } = createOrchestrator(adapter, ctx);

      submitConfig.shouldBlock();

      expect(logCleanPrompt).toHaveBeenCalledWith('chatgpt');
    });

    it('returns true when active findings exist', () => {
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);

      findingsState.update([makeFinding()]);

      expect(submitConfig.shouldBlock()).toBe(true);
    });

    it('returns false when extension is disabled', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        enabled: false,
        interventionMode: 'warn',
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      findingsState.update([makeFinding()]);

      expect(submitConfig.shouldBlock()).toBe(false);
      expect(logCleanPrompt).not.toHaveBeenCalled();
      expect(logFlaggedEvent).not.toHaveBeenCalled();
    });

    it('returns false in log-only mode but logs the event', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        enabled: true,
        interventionMode: 'log-only',
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      findingsState.update([makeFinding()]);

      expect(submitConfig.shouldBlock()).toBe(false);
      expect(logFlaggedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'chatgpt',
          action: 'sent-anyway',
          categories: expect.arrayContaining(['email']),
          source: 'prompt',
          guidanceVersion: 1,
          needsAttention: true,
        }),
      );
    });

    it('logs custom pattern categories with their company bucket', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        ...DEFAULT_EXTENSION_SETTINGS,
        interventionMode: 'log-only',
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      findingsState.update([
        makeFinding({
          type: 'custom-pattern',
          value: 'EMP-1234',
          label: 'Employee ID',
          customPattern: {
            id: 'employee-id',
            severity: 'warning',
            category: 'hr',
            templateId: 'employee-id',
          },
        }),
      ]);

      expect(submitConfig.shouldBlock()).toBe(false);
      expect(logFlaggedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: expect.arrayContaining(['custom-pattern:hr']),
          source: 'prompt',
        }),
      );
    });

    it('returns false for clean prompts in log-only mode', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        enabled: true,
        interventionMode: 'log-only',
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      expect(submitConfig.shouldBlock()).toBe(false);
      expect(logCleanPrompt).toHaveBeenCalled();
      expect(logFlaggedEvent).not.toHaveBeenCalled();
    });
  });

  describe('onBlocked', () => {
    it('shows toast via widget controller', async () => {
      const mockShowToast = vi.fn().mockResolvedValue('timeout');
      vi.mocked(createWidgetController).mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
        showToast: mockShowToast,
        showRestoreToast: vi.fn().mockResolvedValue(false),
        setEnabled: vi.fn(),
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);

      findingsState.update([makeFinding()]);
      await submitConfig.onBlocked();

      expect(mockShowToast).toHaveBeenCalledWith(1);
    });

    it('logs flagged event after toast resolves', async () => {
      const mockShowToast = vi.fn().mockResolvedValue('send-anyway');
      vi.mocked(createWidgetController).mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
        showToast: mockShowToast,
        showRestoreToast: vi.fn().mockResolvedValue(false),
        setEnabled: vi.fn(),
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);

      findingsState.update([makeFinding()]);
      await submitConfig.onBlocked();

      expect(logFlaggedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'chatgpt',
          action: 'sent-anyway',
          categories: expect.arrayContaining(['email']),
          findingCount: 1,
          source: 'prompt',
          guidanceVersion: 1,
          needsAttention: true,
        }),
      );
    });

    it('clears active findings immediately after submission is released', async () => {
      const mockShowToast = vi.fn().mockResolvedValue('send-anyway');
      vi.mocked(createWidgetController).mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
        showToast: mockShowToast,
        showRestoreToast: vi.fn().mockResolvedValue(false),
        setEnabled: vi.fn(),
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);

      findingsState.update([makeFinding()]);
      expect(findingsState.getSnapshot().activeCount).toBe(1);

      await submitConfig.onBlocked();

      expect(findingsState.getSnapshot().activeCount).toBe(0);
      expect(findingsState.getSnapshot().tracked).toHaveLength(0);
    });
  });

  describe('clipboard restore integration', () => {
    it('clipboardInterceptor calls showRestoreToast via onTokensFound', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      const mockShowRestoreToast = vi.fn().mockResolvedValue(true);
      vi.mocked(createWidgetController).mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
        showToast: vi.fn().mockResolvedValue('timeout'),
        showRestoreToast: mockShowRestoreToast,
        setEnabled: vi.fn(),
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { maskingMap, clipboardInterceptor } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      // Populate MaskingMap with a token
      maskingMap.set('[John S. email]', 'john@acme.com');

      // Attach the clipboard interceptor
      clipboardInterceptor.attach();

      // Simulate a copy event with the token
      const selection = { toString: () => 'Response: [John S. email]' };
      vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection);

      const clipboardData = {
        setData: vi.fn(),
      };
      const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
      Object.defineProperty(copyEvent, 'clipboardData', { value: clipboardData });

      document.dispatchEvent(copyEvent);

      // onTokensFound should trigger showRestoreToast
      await new Promise((r) => setTimeout(r, 0));
      expect(mockShowRestoreToast).toHaveBeenCalledWith(1);

      // After acceptance, clipboard should be overwritten with restored text
      await new Promise((r) => setTimeout(r, 0));
      expect(mockWriteText).toHaveBeenCalledWith('Response: john@acme.com');

      clipboardInterceptor.detach();
      vi.restoreAllMocks();
    });

    it('skips restore toast when maskingEnabled is false', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        enabled: true,
        interventionMode: 'warn',
        maskingEnabled: false,
      });

      const mockShowRestoreToast = vi.fn().mockResolvedValue(true);
      vi.mocked(createWidgetController).mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
        showToast: vi.fn().mockResolvedValue('timeout'),
        showRestoreToast: mockShowRestoreToast,
        setEnabled: vi.fn(),
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { maskingMap, clipboardInterceptor } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      maskingMap.set('[John S. email]', 'john@acme.com');
      clipboardInterceptor.attach();

      const selection = { toString: () => 'Response: [John S. email]' };
      vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection);

      const clipboardData = { setData: vi.fn() };
      const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
      Object.defineProperty(copyEvent, 'clipboardData', { value: clipboardData });

      document.dispatchEvent(copyEvent);
      await new Promise((r) => setTimeout(r, 0));

      expect(mockShowRestoreToast).not.toHaveBeenCalled();

      clipboardInterceptor.detach();
      vi.restoreAllMocks();
    });

    it('does not show toast when copied text has no tokens', async () => {
      const mockShowRestoreToast = vi.fn().mockResolvedValue(true);
      vi.mocked(createWidgetController).mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
        showToast: vi.fn().mockResolvedValue('timeout'),
        showRestoreToast: mockShowRestoreToast,
        setEnabled: vi.fn(),
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { clipboardInterceptor } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      clipboardInterceptor.attach();

      const selection = { toString: () => 'Plain text without tokens' };
      vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection);

      const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
      document.dispatchEvent(copyEvent);
      await new Promise((r) => setTimeout(r, 0));

      expect(mockShowRestoreToast).not.toHaveBeenCalled();

      clipboardInterceptor.detach();
      vi.restoreAllMocks();
    });
  });

  describe('file detection', () => {
    it('logs file detection to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onFileDetected } = createOrchestrator(adapter, ctx);

      onFileDetected('secret.pdf', 'chatgpt');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File detected'),
      );
    });
  });

  describe('capability flags', () => {
    it('works normally with adapter that has no capabilities set', () => {
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const result = createOrchestrator(adapter, ctx);

      expect(result.widgetController).toBeDefined();
      expect(result.maskingMap).toBeDefined();
    });

    it('still creates maskingMap when reliableSetText is false', () => {
      const adapter = createMockAdapter({
        capabilities: { reliableSetText: false, sendButtonAnchor: true, pageContextBridge: false },
      });
      const ctx = createMockContext();
      const result = createOrchestrator(adapter, ctx);

      // MaskingMap should still exist for clipboard restore
      expect(result.maskingMap).toBeDefined();
      expect(typeof result.maskingMap.set).toBe('function');
    });

    it('still blocks submission when reliableSetText is false and findings exist', () => {
      const adapter = createMockAdapter({
        capabilities: { reliableSetText: false, sendButtonAnchor: true, pageContextBridge: false },
      });
      const ctx = createMockContext();
      const { submitConfig, findingsState } = createOrchestrator(adapter, ctx);

      findingsState.update([makeFinding()]);

      // Detection still works — submission should still be blocked
      expect(submitConfig.shouldBlock()).toBe(true);
    });
  });
});
