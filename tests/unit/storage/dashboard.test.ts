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
  getCustomPatterns,
  upsertCustomPattern,
  removeCustomPattern,
  importCustomPatterns,
  exportCustomPatterns,
  pruneOldStats,
  toEnabledDetectors,
  getExtensionSettings,
  setExtensionSettings,
} from '../../../src/storage/dashboard';
import type { CustomPattern, FlaggedEvent, DailyStats } from '../../../src/storage/types';
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

function makeCustomPattern(overrides: Partial<CustomPattern> = {}): CustomPattern {
  return {
    id: 'pattern-1',
    label: 'Employee ID',
    description: 'Matches EMP-12345 style references',
    enabled: true,
    severity: 'warning',
    category: 'internal-identifier',
    sourceMode: 'template',
    templateId: 'employee-id',
    pattern: 'EMP-[0-9]{5}',
    flags: 'gi',
    samples: {
      positive: ['Employee ID EMP-12345'],
      negative: ['No company identifier here'],
    },
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
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
      expect(settings.maskingEnabled).toBe(true);
    });

    it('partially updates settings', async () => {
      await setExtensionSettings({ interventionMode: 'log-only' });
      const settings = await getExtensionSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.interventionMode).toBe('log-only');
      expect(settings.maskingEnabled).toBe(true);
    });

    it('toggles masking setting independently', async () => {
      await setExtensionSettings({ maskingEnabled: false });
      const settings = await getExtensionSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.maskingEnabled).toBe(false);
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

  describe('custom pattern storage', () => {
    it('returns empty array when no custom patterns exist', async () => {
      const patterns = await getCustomPatterns();
      expect(patterns).toHaveLength(0);
    });

    it('normalizes stored custom patterns with defaults', async () => {
      storageData['customPatterns'] = [
        {
          id: 'pattern-1',
          label: 'Invoice',
          pattern: 'INV-[0-9]{6}',
        },
      ];

      const patterns = await getCustomPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual(expect.objectContaining({
        id: 'pattern-1',
        label: 'Invoice',
        pattern: 'INV-[0-9]{6}',
        enabled: true,
        severity: 'warning',
        category: 'other',
        sourceMode: 'advanced-regex',
        templateId: null,
        flags: 'gi',
      }));
    });

    it('creates a new custom pattern with normalized defaults', async () => {
      const created = await upsertCustomPattern({
        label: 'Project Code',
        pattern: 'PROJ-[A-Z]{3}',
      });

      const stored = storageData['customPatterns'] as CustomPattern[];
      expect(stored).toHaveLength(1);
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.flags).toBe('gi');
      expect(created.enabled).toBe(true);
    });

    it('updates an existing custom pattern while preserving createdAt', async () => {
      storageData['customPatterns'] = [makeCustomPattern()];

      const updated = await upsertCustomPattern({
        id: 'pattern-1',
        label: 'Employee Badge ID',
        pattern: 'EMP-[0-9]{5}',
        severity: 'concern',
      });

      expect(updated.label).toBe('Employee Badge ID');
      expect(updated.severity).toBe('concern');
      expect(updated.createdAt).toBe('2026-03-14T00:00:00.000Z');
    });

    it('removes a custom pattern by id', async () => {
      storageData['customPatterns'] = [
        makeCustomPattern(),
        makeCustomPattern({ id: 'pattern-2', label: 'Invoice ID' }),
      ];

      await removeCustomPattern('pattern-1');

      expect(storageData['customPatterns']).toEqual([
        expect.objectContaining({ id: 'pattern-2' }),
      ]);
    });

    it('imports versioned custom pattern bundles', async () => {
      storageData['customPatterns'] = [makeCustomPattern()];

      const result = await importCustomPatterns(JSON.stringify({
        version: 1,
        exportedAt: '2026-03-14T00:00:00.000Z',
        patterns: [
          makeCustomPattern({ id: 'pattern-1', label: 'Employee Identifier' }),
          makeCustomPattern({ id: 'pattern-2', label: 'Invoice ID', templateId: 'invoice-number' }),
        ],
      }));

      expect(result).toEqual({ added: 1, updated: 1, skipped: 0 });
      const stored = storageData['customPatterns'] as CustomPattern[];
      expect(stored).toHaveLength(2);
      expect(stored[0]?.label).toBe('Employee Identifier');
    });

    it('exports custom patterns as versioned JSON', async () => {
      storageData['customPatterns'] = [makeCustomPattern()];

      const exported = await exportCustomPatterns();
      const parsed = JSON.parse(exported) as {
        version: number;
        exportedAt: string;
        patterns: CustomPattern[];
      };

      expect(parsed.version).toBe(1);
      expect(parsed.exportedAt).toMatch(/^2026-/);
      expect(parsed.patterns).toHaveLength(1);
      expect(parsed.patterns[0]?.label).toBe('Employee ID');
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
