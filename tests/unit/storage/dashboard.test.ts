import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getWeeklyStats,
  getFlaggedEvents,
  getDetectionSettings,
  setDetectionSettings,
  getKeywords,
  addKeyword,
  removeKeyword,
  importKeywords,
  exportKeywords,
  pruneOldStats,
  toEnabledDetectors,
  getExtensionSettings,
  setExtensionSettings,
} from '../../../src/storage/dashboard';
import type { FlaggedEvent, DailyStats } from '../../../src/storage/types';
import { DEFAULT_DETECTION_SETTINGS } from '../../../src/storage/types';

function dateKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function makeDailyStats(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    totalInteractions: 10,
    flaggedCount: 2,
    redactedCount: 1,
    sentAnywayCount: 1,
    cancelledCount: 0,
    editedCount: 0,
    byTool: { chatgpt: 6, claude: 4 },
    ...overrides,
  };
}

function makeFlaggedEvent(
  overrides: Partial<FlaggedEvent> = {},
): FlaggedEvent {
  return {
    id: 'evt-1',
    timestamp: new Date().toISOString(),
    tool: 'chatgpt',
    categories: ['email'],
    findingCount: 1,
    action: 'redacted',
    ...overrides,
  };
}

describe('dashboard storage wrapper', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    vi.spyOn(chrome.storage.local, 'get').mockImplementation(
      (keys: unknown) => {
        if (typeof keys === 'string') {
          return Promise.resolve(
            keys in storageData ? { [keys]: storageData[keys] } : {},
          );
        }
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const k of keys as string[]) {
            if (k in storageData) result[k] = storageData[k];
          }
          return Promise.resolve(result);
        }
        return Promise.resolve({});
      },
    );
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(
      (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
        return Promise.resolve();
      },
    );
  });

  describe('getWeeklyStats', () => {
    it('returns zero stats when no data exists', async () => {
      const stats = await getWeeklyStats();
      expect(stats.totalInteractions).toBe(0);
      expect(stats.flaggedCount).toBe(0);
      expect(stats.complianceRate).toBeNull();
      expect(stats.dailyBreakdown).toHaveLength(7);
    });

    it('aggregates stats for the last 7 days', async () => {
      storageData['dailyStats'] = {
        [dateKey(0)]: makeDailyStats({ totalInteractions: 5, sentAnywayCount: 1 }),
        [dateKey(1)]: makeDailyStats({ totalInteractions: 3, sentAnywayCount: 0 }),
      };

      const stats = await getWeeklyStats();
      expect(stats.totalInteractions).toBe(8);
      expect(stats.complianceRate).toBeCloseTo(87.5); // (8-1)/8 * 100
    });

    it('excludes data older than the window', async () => {
      storageData['dailyStats'] = {
        [dateKey(0)]: makeDailyStats({ totalInteractions: 5 }),
        [dateKey(10)]: makeDailyStats({ totalInteractions: 100 }),
      };

      const stats = await getWeeklyStats(7);
      expect(stats.totalInteractions).toBe(5);
    });

    it('returns daily breakdown with empty days filled as zero', async () => {
      storageData['dailyStats'] = {
        [dateKey(0)]: makeDailyStats({ totalInteractions: 5, flaggedCount: 1 }),
      };

      const stats = await getWeeklyStats(3);
      expect(stats.dailyBreakdown).toHaveLength(3);
      // Most recent day should have data
      const lastDay = stats.dailyBreakdown[stats.dailyBreakdown.length - 1];
      expect(lastDay?.total).toBe(5);
    });

    it('calculates compliance rate correctly', async () => {
      storageData['dailyStats'] = {
        [dateKey(0)]: makeDailyStats({
          totalInteractions: 100,
          sentAnywayCount: 5,
        }),
      };

      const stats = await getWeeklyStats();
      expect(stats.complianceRate).toBe(95);
    });

    it('aggregates byTool across days', async () => {
      storageData['dailyStats'] = {
        [dateKey(0)]: makeDailyStats({ byTool: { chatgpt: 3 } }),
        [dateKey(1)]: makeDailyStats({ byTool: { chatgpt: 2, claude: 1 } }),
      };

      const stats = await getWeeklyStats();
      expect(stats.byTool['chatgpt']).toBe(5);
      expect(stats.byTool['claude']).toBe(1);
    });
  });

  describe('getFlaggedEvents', () => {
    it('returns empty array when no events', async () => {
      const events = await getFlaggedEvents();
      expect(events).toHaveLength(0);
    });

    it('returns events in reverse chronological order', async () => {
      storageData['flaggedEvents'] = [
        makeFlaggedEvent({ id: 'old', timestamp: '2026-03-01T12:00:00Z' }),
        makeFlaggedEvent({ id: 'new', timestamp: '2026-03-03T12:00:00Z' }),
      ];

      const events = await getFlaggedEvents();
      expect(events[0]?.id).toBe('new');
      expect(events[1]?.id).toBe('old');
    });

    it('filters by days', async () => {
      const recent = new Date();
      const old = new Date();
      old.setDate(old.getDate() - 10);

      storageData['flaggedEvents'] = [
        makeFlaggedEvent({ id: 'old', timestamp: old.toISOString() }),
        makeFlaggedEvent({ id: 'recent', timestamp: recent.toISOString() }),
      ];

      const events = await getFlaggedEvents({ days: 7 });
      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe('recent');
    });

    it('filters by tool', async () => {
      storageData['flaggedEvents'] = [
        makeFlaggedEvent({ id: 'gpt', tool: 'chatgpt' }),
        makeFlaggedEvent({ id: 'claude', tool: 'claude' }),
      ];

      const events = await getFlaggedEvents({ tool: 'claude' });
      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe('claude');
    });
  });

  describe('getDetectionSettings / setDetectionSettings', () => {
    it('returns defaults when no settings stored', async () => {
      const settings = await getDetectionSettings();
      expect(settings).toEqual(DEFAULT_DETECTION_SETTINGS);
    });

    it('stores and retrieves settings', async () => {
      const custom = { ...DEFAULT_DETECTION_SETTINGS, email: false };
      await setDetectionSettings(custom);
      const settings = await getDetectionSettings();
      expect(settings.email).toBe(false);
      expect(settings.phone).toBe(true);
    });
  });

  describe('toEnabledDetectors', () => {
    it('converts settings to a Set of enabled types', () => {
      const settings = { ...DEFAULT_DETECTION_SETTINGS, email: false, phone: false };
      const enabled = toEnabledDetectors(settings);
      expect(enabled.has('email')).toBe(false);
      expect(enabled.has('phone')).toBe(false);
      expect(enabled.has('api-key')).toBe(true);
    });
  });

  describe('getExtensionSettings / setExtensionSettings', () => {
    it('returns defaults when no settings stored', async () => {
      const settings = await getExtensionSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.interventionMode).toBe('warn');
    });

    it('partially updates settings', async () => {
      await setExtensionSettings({ interventionMode: 'log-only' });
      const settings = await getExtensionSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.interventionMode).toBe('log-only');
    });
  });

  describe('keyword CRUD', () => {
    it('returns empty array when no keywords', async () => {
      const keywords = await getKeywords();
      expect(keywords).toHaveLength(0);
    });

    it('adds a keyword', async () => {
      const error = await addKeyword('confidential');
      expect(error).toBeNull();
      expect(storageData['keywords']).toEqual(['confidential']);
    });

    it('trims whitespace from keywords', async () => {
      await addKeyword('  spaced  ');
      expect(storageData['keywords']).toEqual(['spaced']);
    });

    it('rejects empty keyword', async () => {
      const error = await addKeyword('   ');
      expect(error).toBe('Keyword cannot be empty');
    });

    it('rejects keyword over 100 chars', async () => {
      const error = await addKeyword('a'.repeat(101));
      expect(error).toContain('100 characters');
    });

    it('rejects duplicate keyword (case-insensitive)', async () => {
      storageData['keywords'] = ['Secret'];
      const error = await addKeyword('secret');
      expect(error).toBe('Keyword already exists');
    });

    it('rejects when at max keywords', async () => {
      storageData['keywords'] = Array.from({ length: 500 }, (_, i) => `kw-${i}`);
      const error = await addKeyword('one-more');
      expect(error).toContain('500');
    });

    it('removes a keyword (case-insensitive)', async () => {
      storageData['keywords'] = ['Secret', 'Public'];
      await removeKeyword('secret');
      expect(storageData['keywords']).toEqual(['Public']);
    });
  });

  describe('importKeywords', () => {
    it('imports new keywords', async () => {
      const result = await importKeywords(['alpha', 'beta']);
      expect(result.added).toBe(2);
      expect(result.skipped).toBe(0);
      expect(storageData['keywords']).toEqual(['alpha', 'beta']);
    });

    it('skips duplicates and empty lines', async () => {
      storageData['keywords'] = ['alpha'];
      const result = await importKeywords(['alpha', '', 'beta', '  ']);
      expect(result.added).toBe(1);
      expect(result.skipped).toBe(3);
    });

    it('respects max keyword limit during import', async () => {
      storageData['keywords'] = Array.from({ length: 499 }, (_, i) => `kw-${i}`);
      const result = await importKeywords(['new-1', 'new-2', 'new-3']);
      expect(result.added).toBe(1);
      expect(result.skipped).toBe(2);
    });
  });

  describe('exportKeywords', () => {
    it('returns empty string for no keywords', async () => {
      const exported = await exportKeywords();
      expect(exported).toBe('');
    });

    it('returns newline-separated keywords', async () => {
      storageData['keywords'] = ['alpha', 'beta', 'gamma'];
      const exported = await exportKeywords();
      expect(exported).toBe('alpha\nbeta\ngamma');
    });
  });

  describe('pruneOldStats', () => {
    it('returns 0 when no stats exist', async () => {
      const pruned = await pruneOldStats(90);
      expect(pruned).toBe(0);
    });

    it('prunes stats older than maxAgeDays', async () => {
      storageData['dailyStats'] = {
        [dateKey(100)]: makeDailyStats(),
        [dateKey(95)]: makeDailyStats(),
        [dateKey(10)]: makeDailyStats(),
        [dateKey(0)]: makeDailyStats(),
      };

      const pruned = await pruneOldStats(90);
      expect(pruned).toBe(2);
      const remaining = storageData['dailyStats'] as Record<string, DailyStats>;
      expect(Object.keys(remaining)).toHaveLength(2);
    });

    it('preserves all stats within the window', async () => {
      storageData['dailyStats'] = {
        [dateKey(0)]: makeDailyStats(),
        [dateKey(30)]: makeDailyStats(),
        [dateKey(89)]: makeDailyStats(),
      };

      const pruned = await pruneOldStats(90);
      expect(pruned).toBe(0);
    });
  });
});
