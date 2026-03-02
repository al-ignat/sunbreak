import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOrchestrator } from '../../../src/content/orchestrator';
import type { SiteAdapter } from '../../../src/types';

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

import { createOverlayController } from '../../../src/ui/overlay/overlay-controller';
import { logFlaggedEvent, logCleanPrompt } from '../../../src/storage/events';

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

describe('createOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
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
