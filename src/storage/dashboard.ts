import type { FindingType } from '../classifier/types';
import { normalizeCustomPattern, normalizeCustomPatterns } from '../classifier/custom-patterns';
import type {
  FlaggedEvent,
  DailyStats,
  ExtensionSettings,
  DetectionSettings,
  EventFilter,
  AggregatedStats,
  CustomPattern,
  CustomPatternBundle,
} from './types';
import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
  normalizeFlaggedEvent,
} from './types';

/**
 * Get aggregated stats for the last N days (rolling window).
 * Defaults to 7 days.
 */
export async function getWeeklyStats(days = 7): Promise<AggregatedStats> {
  const data = await chrome.storage.local.get('dailyStats');
  const allStats =
    (data['dailyStats'] as Record<string, DailyStats> | undefined) ?? {};

  const today = new Date();
  const dateKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateKeys.push(d.toISOString().slice(0, 10));
  }

  let totalInteractions = 0;
  let flaggedCount = 0;
  let redactedCount = 0;
  let sentAnywayCount = 0;
  let cancelledCount = 0;
  let editedCount = 0;
  let fixedCount = 0;
  let ignoredCount = 0;
  const byTool: Record<string, number> = {};
  const dailyBreakdown: AggregatedStats['dailyBreakdown'][number][] = [];

  // Process from oldest to newest for chronological order
  for (const dateKey of dateKeys.reverse()) {
    const day = allStats[dateKey];
    if (day) {
      totalInteractions += day.totalInteractions;
      flaggedCount += day.flaggedCount;
      redactedCount += day.redactedCount;
      sentAnywayCount += day.sentAnywayCount;
      cancelledCount += day.cancelledCount;
      editedCount += day.editedCount;
      fixedCount += (day.fixedCount ?? 0);
      ignoredCount += (day.ignoredCount ?? 0);

      for (const [tool, count] of Object.entries(day.byTool ?? {})) {
        byTool[tool] = (byTool[tool] ?? 0) + count;
      }

      dailyBreakdown.push({
        date: dateKey,
        total: day.totalInteractions,
        flagged: day.flaggedCount,
        clean: day.totalInteractions - day.flaggedCount,
        byTool: day.byTool ?? {},
      });
    } else {
      dailyBreakdown.push({
        date: dateKey,
        total: 0,
        flagged: 0,
        clean: 0,
        byTool: {},
      });
    }
  }

  const complianceRate =
    totalInteractions > 0
      ? ((totalInteractions - sentAnywayCount) / totalInteractions) * 100
      : null;

  return {
    totalInteractions,
    flaggedCount,
    redactedCount,
    sentAnywayCount,
    cancelledCount,
    editedCount,
    fixedCount,
    ignoredCount,
    byTool,
    dailyBreakdown,
    complianceRate,
  };
}

/** Get flagged events, optionally filtered by days and tool */
export async function getFlaggedEvents(
  filter?: EventFilter,
): Promise<ReadonlyArray<FlaggedEvent>> {
  const data = await chrome.storage.local.get('flaggedEvents');
  let events = Array.isArray(data['flaggedEvents'])
    ? (data['flaggedEvents'] as unknown[])
      .map((event) => normalizeFlaggedEvent(event))
      .filter((event): event is FlaggedEvent => event !== null)
    : [];

  if (filter?.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.days);
    const cutoffIso = cutoff.toISOString();
    events = events.filter((e) => e.timestamp >= cutoffIso);
  }

  if (filter?.tool) {
    events = events.filter((e) => e.tool === filter.tool);
  }

  // Return newest first
  return [...events].reverse();
}

/** Get a single flagged event by id, normalized for current recovery consumers. */
export async function getFlaggedEventById(id: string): Promise<FlaggedEvent | null> {
  const events = await getFlaggedEvents();
  return events.find((event) => event.id === id) ?? null;
}

/** Get current detection settings */
export async function getDetectionSettings(): Promise<DetectionSettings> {
  const data = await chrome.storage.local.get('detectionSettings');
  const stored = data['detectionSettings'] as
    | Partial<DetectionSettings>
    | undefined;

  if (!stored) return { ...DEFAULT_DETECTION_SETTINGS };

  // Merge with defaults to handle any missing keys
  return { ...DEFAULT_DETECTION_SETTINGS, ...stored };
}

/** Update detection settings */
export async function setDetectionSettings(
  settings: DetectionSettings,
): Promise<void> {
  await chrome.storage.local.set({ detectionSettings: settings });
}

/** Convert DetectionSettings to a Set of enabled FindingTypes */
export function toEnabledDetectors(
  settings: DetectionSettings,
): Set<FindingType> {
  const enabled = new Set<FindingType>();
  for (const [type, on] of Object.entries(settings)) {
    if (on) {
      enabled.add(type as FindingType);
    }
  }
  return enabled;
}

/** Get current extension settings */
export async function getExtensionSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.local.get('settings');
  const stored = data['settings'] as
    | Partial<ExtensionSettings>
    | undefined;

  if (!stored) return { ...DEFAULT_EXTENSION_SETTINGS };

  return { ...DEFAULT_EXTENSION_SETTINGS, ...stored };
}

/** Update extension settings */
export async function setExtensionSettings(
  settings: Partial<ExtensionSettings>,
): Promise<void> {
  const current = await getExtensionSettings();
  await chrome.storage.local.set({
    settings: { ...current, ...settings },
  });
}

/** Get the user's custom keyword list */
export async function getKeywords(): Promise<ReadonlyArray<string>> {
  const data = await chrome.storage.local.get('keywords');
  return (data['keywords'] as string[] | undefined) ?? [];
}

/** Maximum number of keywords allowed */
const MAX_KEYWORDS = 500;

/** Maximum length of a single keyword */
const MAX_KEYWORD_LENGTH = 100;
const CUSTOM_PATTERNS_KEY = 'customPatterns';

/** Add a single keyword. Returns error string on failure, null on success. */
export async function addKeyword(
  value: string,
): Promise<string | null> {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'Keyword cannot be empty';
  if (trimmed.length > MAX_KEYWORD_LENGTH)
    return `Keyword must be ${MAX_KEYWORD_LENGTH} characters or less`;

  const data = await chrome.storage.local.get('keywords');
  const keywords = (data['keywords'] as string[] | undefined) ?? [];

  if (keywords.length >= MAX_KEYWORDS)
    return `Maximum of ${MAX_KEYWORDS} keywords reached`;

  const lowerTrimmed = trimmed.toLowerCase();
  if (keywords.some((k) => k.toLowerCase() === lowerTrimmed))
    return 'Keyword already exists';

  keywords.push(trimmed);
  await chrome.storage.local.set({ keywords });
  return null;
}

/** Remove a keyword by value */
export async function removeKeyword(value: string): Promise<void> {
  const data = await chrome.storage.local.get('keywords');
  const keywords = (data['keywords'] as string[] | undefined) ?? [];
  const lowerValue = value.toLowerCase();
  const filtered = keywords.filter(
    (k) => k.toLowerCase() !== lowerValue,
  );
  await chrome.storage.local.set({ keywords: filtered });
}

/** Import keywords from an array. Returns counts of added and skipped. */
export async function importKeywords(
  values: ReadonlyArray<string>,
): Promise<{ added: number; skipped: number }> {
  const data = await chrome.storage.local.get('keywords');
  const existing = (data['keywords'] as string[] | undefined) ?? [];
  const existingLower = new Set(existing.map((k) => k.toLowerCase()));

  let added = 0;
  let skipped = 0;

  for (const raw of values) {
    const trimmed = raw.trim();
    if (
      trimmed.length === 0 ||
      trimmed.length > MAX_KEYWORD_LENGTH
    ) {
      skipped++;
      continue;
    }

    if (existingLower.has(trimmed.toLowerCase())) {
      skipped++;
      continue;
    }

    if (existing.length >= MAX_KEYWORDS) {
      skipped += values.length - added - skipped;
      break;
    }

    existing.push(trimmed);
    existingLower.add(trimmed.toLowerCase());
    added++;
  }

  await chrome.storage.local.set({ keywords: existing });
  return { added, skipped };
}

/** Export keywords as a newline-separated string */
export async function exportKeywords(): Promise<string> {
  const keywords = await getKeywords();
  return keywords.join('\n');
}

/** Get stored company-specific custom patterns. */
export async function getCustomPatterns(): Promise<ReadonlyArray<CustomPattern>> {
  const data = await chrome.storage.local.get(CUSTOM_PATTERNS_KEY);
  return normalizeCustomPatterns(data[CUSTOM_PATTERNS_KEY]);
}

/** Create or update a company-specific custom pattern. */
export async function upsertCustomPattern(
  input: Partial<CustomPattern> & Pick<CustomPattern, 'label' | 'pattern'>,
): Promise<CustomPattern> {
  const existing = await getCustomPatterns();
  const current = input.id
    ? existing.find((pattern) => pattern.id === input.id)
    : undefined;

  const next = normalizeCustomPattern({
    ...current,
    ...input,
    label: input.label,
    pattern: input.pattern,
    createdAt: current?.createdAt,
  });

  const updated = current
    ? existing.map((pattern) => pattern.id === next.id ? next : pattern)
    : [...existing, next];

  await chrome.storage.local.set({ [CUSTOM_PATTERNS_KEY]: updated });
  return next;
}

/** Remove a company-specific custom pattern by id. */
export async function removeCustomPattern(id: string): Promise<void> {
  const existing = await getCustomPatterns();
  const filtered = existing.filter((pattern) => pattern.id !== id);
  await chrome.storage.local.set({ [CUSTOM_PATTERNS_KEY]: filtered });
}

/** Import custom patterns from a JSON bundle. */
export async function importCustomPatterns(
  json: string,
): Promise<{ added: number; updated: number; skipped: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { added: 0, updated: 0, skipped: 1 };
  }

  const incoming = Array.isArray(parsed)
    ? normalizeCustomPatterns(parsed)
    : normalizeCustomPatterns((parsed as CustomPatternBundle | null)?.patterns);

  const existing = await getCustomPatterns();
  const byId = new Map(existing.map((pattern) => [pattern.id, pattern] as const));

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const pattern of incoming) {
    if (pattern.label.length === 0 || pattern.pattern.length === 0) {
      skipped++;
      continue;
    }

    if (byId.has(pattern.id)) {
      byId.set(pattern.id, pattern);
      updated++;
    } else {
      byId.set(pattern.id, pattern);
      added++;
    }
  }

  await chrome.storage.local.set({
    [CUSTOM_PATTERNS_KEY]: Array.from(byId.values()),
  });

  return { added, updated, skipped };
}

/** Export custom patterns as a versioned JSON bundle. */
export async function exportCustomPatterns(): Promise<string> {
  const patterns = await getCustomPatterns();
  const bundle: CustomPatternBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    patterns,
  };
  return JSON.stringify(bundle, null, 2);
}

/** Clear all flagged events from storage */
export async function clearFlaggedEvents(): Promise<void> {
  await chrome.storage.local.set({ flaggedEvents: [] });
}

/** Reset all settings and keywords to defaults */
export async function resetToDefaults(): Promise<void> {
  await chrome.storage.local.set({
    detectionSettings: DEFAULT_DETECTION_SETTINGS,
    settings: DEFAULT_EXTENSION_SETTINGS,
    keywords: [],
    [CUSTOM_PATTERNS_KEY]: [],
  });
}

/**
 * Prune daily stats older than maxAgeDays.
 * Returns the number of entries pruned.
 */
export async function pruneOldStats(maxAgeDays = 90): Promise<number> {
  const data = await chrome.storage.local.get('dailyStats');
  const allStats =
    (data['dailyStats'] as Record<string, DailyStats> | undefined) ?? {};

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  let pruned = 0;
  const kept: Record<string, DailyStats> = {};

  for (const [dateKey, stats] of Object.entries(allStats)) {
    if (dateKey < cutoffKey) {
      pruned++;
    } else {
      kept[dateKey] = stats;
    }
  }

  if (pruned > 0) {
    await chrome.storage.local.set({ dailyStats: kept });
  }

  return pruned;
}
