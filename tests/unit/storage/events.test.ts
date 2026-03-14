import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logFlaggedEvent, logCleanPrompt } from '../../../src/storage/events';
import type { FlaggedEvent } from '../../../src/storage/types';

function createMockEvent(
  overrides: Partial<FlaggedEvent> = {},
): FlaggedEvent {
  return {
    id: 'test-id-1',
    timestamp: '2026-03-03T12:00:00Z',
    tool: 'chatgpt',
    categories: ['email'],
    findingCount: 1,
    action: 'redacted',
    source: 'prompt',
    maskingAvailable: true,
    maskingUsed: true,
    needsAttention: false,
    guidanceVersion: 1,
    ...overrides,
  };
}

describe('logFlaggedEvent', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    vi.spyOn(chrome.storage.local, 'get').mockImplementation(
      (key: unknown) => {
        const k = key as string;
        return Promise.resolve(
          k in storageData ? { [k]: storageData[k] } : {},
        );
      },
    );
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(
      (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
        return Promise.resolve();
      },
    );
  });

  it('stores a new flagged event', async () => {
    const event = createMockEvent();
    logFlaggedEvent(event);

    // Wait for the async storage operations
    await vi.waitFor(() => {
      const events = storageData['flaggedEvents'] as FlaggedEvent[];
      expect(events).toBeDefined();
      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe('test-id-1');
      expect(events[0]?.guidanceVersion).toBe(1);
    });
  });

  it('appends to existing events', async () => {
    storageData['flaggedEvents'] = [createMockEvent({ id: 'existing' })];

    logFlaggedEvent(createMockEvent({ id: 'new-event' }));

    await vi.waitFor(() => {
      const events = storageData['flaggedEvents'] as FlaggedEvent[];
      expect(events).toHaveLength(2);
      expect(events[1]?.id).toBe('new-event');
    });
  });

  it('maintains FIFO cap of 1000 events', async () => {
    // Pre-fill with 1000 events
    const existing = Array.from({ length: 1000 }, (_, i) =>
      createMockEvent({ id: `event-${i}` }),
    );
    storageData['flaggedEvents'] = existing;

    logFlaggedEvent(createMockEvent({ id: 'overflow-event' }));

    await vi.waitFor(() => {
      const events = storageData['flaggedEvents'] as FlaggedEvent[];
      expect(events).toHaveLength(1000);
      expect(events[0]?.id).toBe('event-1'); // first event trimmed
      expect(events[999]?.id).toBe('overflow-event'); // new event at end
    });
  });

  it('increments daily stats for flagged event', async () => {
    logFlaggedEvent(createMockEvent({ action: 'redacted' }));

    await vi.waitFor(() => {
      const dailyStats = storageData['dailyStats'] as Record<
        string,
        Record<string, number>
      >;
      expect(dailyStats).toBeDefined();
      const today = new Date().toISOString().slice(0, 10);
      const stats = dailyStats[today];
      expect(stats).toBeDefined();
      expect(stats?.['totalInteractions']).toBe(1);
      expect(stats?.['flaggedCount']).toBe(1);
      expect(stats?.['redactedCount']).toBe(1);
    });
  });

  it('does not throw on storage error', () => {
    vi.spyOn(chrome.storage.local, 'get').mockRejectedValue(
      new Error('quota exceeded'),
    );

    // Should not throw
    expect(() => logFlaggedEvent(createMockEvent())).not.toThrow();
  });
});

describe('logCleanPrompt', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    vi.spyOn(chrome.storage.local, 'get').mockImplementation(
      (key: unknown) => {
        const k = key as string;
        return Promise.resolve(
          k in storageData ? { [k]: storageData[k] } : {},
        );
      },
    );
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(
      (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
        return Promise.resolve();
      },
    );
  });

  it('increments daily interaction counter', async () => {
    logCleanPrompt('chatgpt');

    await vi.waitFor(() => {
      const dailyStats = storageData['dailyStats'] as Record<
        string,
        Record<string, number>
      >;
      expect(dailyStats).toBeDefined();
      const today = new Date().toISOString().slice(0, 10);
      const stats = dailyStats[today];
      expect(stats?.['totalInteractions']).toBe(1);
      expect(stats?.['flaggedCount']).toBe(0);
    });
  });

  it('does not throw on storage error', () => {
    vi.spyOn(chrome.storage.local, 'get').mockRejectedValue(
      new Error('storage error'),
    );

    expect(() => logCleanPrompt('chatgpt')).not.toThrow();
  });
});
