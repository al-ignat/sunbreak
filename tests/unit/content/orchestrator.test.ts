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
    getDetectionSettings: vi.fn().mockResolvedValue(undefined),
    getExtensionSettings: vi.fn().mockResolvedValue(undefined),
  };
});

import { createWidgetController } from '../../../src/ui/widget/widget-controller';
import { logFlaggedEvent, logCleanPrompt } from '../../../src/storage/events';
import { getExtensionSettings, getDetectionSettings } from '../../../src/storage/dashboard';
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns submitConfig, onFileDetected, findingsState, scannerConfig, widgetController, maskingMap', () => {
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
        }),
      );
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
});
