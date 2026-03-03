import type { FlaggedEvent, DailyStats } from './types';

/** Maximum number of flagged events to keep in storage */
const MAX_FLAGGED_EVENTS = 1000;

/** Get today's date as YYYY-MM-DD */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Serial write queue to prevent concurrent read-modify-write races.
 * All storage mutations flow through this chain.
 */
let writeQueue: Promise<void> = Promise.resolve();

function enqueue(fn: () => Promise<void>): void {
  writeQueue = writeQueue.then(fn).catch(() => {
    // Storage errors must not crash the extension
  });
}

/**
 * Log a flagged event to chrome.storage.local.
 * Fire-and-forget: errors are silently caught.
 * Maintains a FIFO cap of 1000 events.
 * Write-serialized to prevent concurrent clobber.
 */
export function logFlaggedEvent(event: FlaggedEvent): void {
  enqueue(async () => {
    const data = await chrome.storage.local.get('flaggedEvents');
    const events = (data['flaggedEvents'] as FlaggedEvent[] | undefined) ?? [];
    events.push(event);

    // FIFO: trim oldest events if over cap
    while (events.length > MAX_FLAGGED_EVENTS) {
      events.shift();
    }

    await chrome.storage.local.set({ flaggedEvents: events });

    // Update daily stats within the same serialized chain
    await doIncrementDailyStat(event.action, event.tool);
  });
}

/**
 * Log a clean prompt interaction (no findings).
 * Fire-and-forget: errors are silently caught.
 * Write-serialized to prevent concurrent clobber.
 */
export function logCleanPrompt(tool: string): void {
  enqueue(async () => {
    await doIncrementDailyStat('clean', tool);
  });
}

/** Increment a daily stat counter (must be called within the write queue) */
async function doIncrementDailyStat(
  action: FlaggedEvent['action'] | 'clean',
  tool: string,
): Promise<void> {
  const key = todayKey();
  const storageKey = 'dailyStats';

  const data = await chrome.storage.local.get(storageKey);
  const allStats =
    (data[storageKey] as Record<string, DailyStats> | undefined) ?? {};
  const today: DailyStats = allStats[key] ?? {
    totalInteractions: 0,
    flaggedCount: 0,
    redactedCount: 0,
    sentAnywayCount: 0,
    cancelledCount: 0,
    editedCount: 0,
    byTool: {},
  };

  const byTool = { ...today.byTool };
  byTool[tool] = (byTool[tool] ?? 0) + 1;

  const updated: DailyStats = {
    totalInteractions: today.totalInteractions + 1,
    flaggedCount:
      today.flaggedCount + (action !== 'clean' ? 1 : 0),
    redactedCount:
      today.redactedCount + (action === 'redacted' ? 1 : 0),
    sentAnywayCount:
      today.sentAnywayCount + (action === 'sent-anyway' ? 1 : 0),
    cancelledCount:
      today.cancelledCount + (action === 'cancelled' ? 1 : 0),
    editedCount:
      today.editedCount + (action === 'edited' ? 1 : 0),
    byTool,
  };

  allStats[key] = updated;
  await chrome.storage.local.set({ [storageKey]: allStats });
}
