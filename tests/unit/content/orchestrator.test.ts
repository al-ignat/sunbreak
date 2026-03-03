import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOrchestrator } from '../../../src/content/orchestrator';
import type { SiteAdapter } from '../../../src/types';
import type { DetectionSettings } from '../../../src/storage/types';

// Mock the overlay controller
vi.mock('../../../src/ui/overlay/overlay-controller', () => ({
  createOverlayController: vi.fn(() => ({
    show: vi.fn().mockResolvedValue('cancel'),
    hide: vi.fn(),
    destroy: vi.fn(),
    state: { mounted: false, container: null },
  })),
}));

// Mock the storage events
vi.mock('../../../src/storage/events', () => ({
  logFlaggedEvent: vi.fn(),
  logCleanPrompt: vi.fn(),
}));

// Mock the dashboard storage — keep toEnabledDetectors real
vi.mock('../../../src/storage/dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/storage/dashboard')>();
  return {
    ...actual,
    getKeywords: vi.fn().mockResolvedValue([]),
    getDetectionSettings: vi.fn().mockResolvedValue(undefined),
    getExtensionSettings: vi.fn().mockResolvedValue(undefined),
  };
});

import { createOverlayController } from '../../../src/ui/overlay/overlay-controller';
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

/** Flush microtasks so fetchAllSettings resolves */
async function flushSettingsInit(): Promise<void> {
  // fetchAllSettings uses Promise.all on 3 async calls — flush microtask queue
  await new Promise((r) => setTimeout(r, 0));
}

describe('createOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    // Reset dashboard mocks to defaults
    vi.mocked(getExtensionSettings).mockResolvedValue({ ...DEFAULT_EXTENSION_SETTINGS });
    vi.mocked(getDetectionSettings).mockResolvedValue({ ...DEFAULT_DETECTION_SETTINGS });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns onPromptIntercepted and onFileDetected callbacks', () => {
    const adapter = createMockAdapter();
    const ctx = createMockContext();
    const orchestrator = createOrchestrator(adapter, ctx);

    expect(typeof orchestrator.onPromptIntercepted).toBe('function');
    expect(typeof orchestrator.onFileDetected).toBe('function');
  });

  describe('clean prompts (no findings)', () => {
    it('returns release for clean text', async () => {
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      const result = await onPromptIntercepted(
        'How do I sort an array in JavaScript?',
        'chatgpt',
      );

      expect(result).toBe('release');
    });

    it('logs clean prompt to stats', async () => {
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      await onPromptIntercepted(
        'What is the capital of France?',
        'chatgpt',
      );

      expect(logCleanPrompt).toHaveBeenCalled();
    });

    it('does not show overlay for clean text', async () => {
      const mockShow = vi.fn().mockResolvedValue('cancel');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      await onPromptIntercepted('Just a question', 'chatgpt');

      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('prompts with findings', () => {
    it('shows overlay when email is detected', async () => {
      const mockShow = vi.fn().mockResolvedValue('cancel');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      await onPromptIntercepted(
        'Email john@example.com about this',
        'chatgpt',
      );

      expect(mockShow).toHaveBeenCalled();
      const findings = mockShow.mock.calls[0]?.[0];
      expect(findings).toHaveLength(1);
      expect(findings?.[0]?.type).toBe('email');
    });

    it('returns block when user cancels', async () => {
      const mockShow = vi.fn().mockResolvedValue('cancel');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      const result = await onPromptIntercepted(
        'Contact john@example.com',
        'chatgpt',
      );

      expect(result).toBe('block');
    });

    it('returns release when user chooses send-anyway', async () => {
      const mockShow = vi.fn().mockResolvedValue('send-anyway');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      const result = await onPromptIntercepted(
        'Contact john@example.com',
        'chatgpt',
      );

      expect(result).toBe('release');
    });

    it('logs flagged event on send-anyway', async () => {
      const mockShow = vi.fn().mockResolvedValue('send-anyway');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      await onPromptIntercepted('Contact john@example.com', 'chatgpt');

      expect(logFlaggedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'chatgpt',
          action: 'sent-anyway',
          categories: expect.arrayContaining(['email']),
        }),
      );
    });

    it('performs redaction and returns redact on redact action', async () => {
      const mockShow = vi.fn().mockResolvedValue('redact');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const mockSetText = vi.fn();
      const input = document.createElement('div');
      const adapter = createMockAdapter({
        findInput: () => input,
        setText: mockSetText,
      });
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      const result = await onPromptIntercepted(
        'Contact john@example.com for help',
        'chatgpt',
      );

      expect(result).toBe('redact');
      expect(mockSetText).toHaveBeenCalledWith(
        input,
        'Contact [EMAIL_1] for help',
      );
    });

    it('returns block on edit action and focuses input', async () => {
      const mockShow = vi.fn().mockResolvedValue('edit');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const input = document.createElement('div');
      document.body.appendChild(input);
      const focusSpy = vi.spyOn(input, 'focus');
      const adapter = createMockAdapter({ findInput: () => input });
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      const result = await onPromptIntercepted(
        'Contact john@example.com',
        'chatgpt',
      );

      expect(result).toBe('block');
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('extension enabled toggle', () => {
    it('releases without classification when extension is disabled', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        enabled: false,
        interventionMode: 'warn',
      });

      const mockShow = vi.fn().mockResolvedValue('cancel');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      const result = await onPromptIntercepted(
        'Contact john@example.com',
        'chatgpt',
      );

      expect(result).toBe('release');
      expect(mockShow).not.toHaveBeenCalled();
      expect(logFlaggedEvent).not.toHaveBeenCalled();
      expect(logCleanPrompt).not.toHaveBeenCalled();
    });
  });

  describe('log-only mode', () => {
    it('logs event but does not show overlay in log-only mode', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        enabled: true,
        interventionMode: 'log-only',
      });

      const mockShow = vi.fn().mockResolvedValue('cancel');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      const result = await onPromptIntercepted(
        'Contact john@example.com',
        'chatgpt',
      );

      expect(result).toBe('release');
      expect(mockShow).not.toHaveBeenCalled();
      expect(logFlaggedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sent-anyway',
          categories: expect.arrayContaining(['email']),
        }),
      );
    });

    it('releases clean prompts normally in log-only mode', async () => {
      vi.mocked(getExtensionSettings).mockResolvedValue({
        enabled: true,
        interventionMode: 'log-only',
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      const result = await onPromptIntercepted(
        'What is the meaning of life?',
        'chatgpt',
      );

      expect(result).toBe('release');
      expect(logCleanPrompt).toHaveBeenCalled();
      expect(logFlaggedEvent).not.toHaveBeenCalled();
    });
  });

  describe('enabledDetectors passthrough', () => {
    it('does not flag emails when email detection is disabled', async () => {
      const disabledEmail: DetectionSettings = {
        ...DEFAULT_DETECTION_SETTINGS,
        email: false,
      };
      vi.mocked(getDetectionSettings).mockResolvedValue(disabledEmail);

      const mockShow = vi.fn().mockResolvedValue('cancel');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      const result = await onPromptIntercepted(
        'Contact john@example.com',
        'chatgpt',
      );

      expect(result).toBe('release');
      expect(mockShow).not.toHaveBeenCalled();
      expect(logCleanPrompt).toHaveBeenCalled();
    });

    it('still flags other types when only email is disabled', async () => {
      const disabledEmail: DetectionSettings = {
        ...DEFAULT_DETECTION_SETTINGS,
        email: false,
      };
      vi.mocked(getDetectionSettings).mockResolvedValue(disabledEmail);

      const mockShow = vi.fn().mockResolvedValue('cancel');
      vi.mocked(createOverlayController).mockReturnValue({
        show: mockShow,
        hide: vi.fn(),
        destroy: vi.fn(),
        state: { mounted: false, container: null },
      });

      const adapter = createMockAdapter();
      const ctx = createMockContext();
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);
      await flushSettingsInit();

      // SSN should still be detected
      const result = await onPromptIntercepted(
        'My SSN is 123-45-6789',
        'chatgpt',
      );

      expect(result).toBe('block');
      expect(mockShow).toHaveBeenCalled();
      const findings = mockShow.mock.calls[0]?.[0];
      expect(findings?.some((f: { type: string }) => f.type === 'ssn')).toBe(true);
      expect(findings?.some((f: { type: string }) => f.type === 'email')).toBe(false);
    });
  });

  describe('context invalidation', () => {
    it('returns release when context is invalid', async () => {
      const adapter = createMockAdapter();
      const ctx = createMockContext();
      ctx.isInvalid = true;
      const { onPromptIntercepted } = createOrchestrator(adapter, ctx);

      const result = await onPromptIntercepted(
        'Contact john@example.com',
        'chatgpt',
      );

      expect(result).toBe('release');
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
