import type { Finding } from '../classifier/types';

/** Status of a tracked finding in the inline detection flow */
export type FindingStatus = 'active' | 'fixed' | 'ignored';

/** A finding enriched with tracking state */
export interface TrackedFinding {
  /** Stable identifier for this tracked finding */
  readonly id: string;
  /** The underlying classifier finding */
  readonly finding: Finding;
  /** Current status */
  readonly status: FindingStatus;
}

/** Snapshot of the current findings state */
export interface FindingsSnapshot {
  readonly tracked: ReadonlyArray<TrackedFinding>;
  readonly activeCount: number;
}

/** Callback invoked when findings state changes */
export type FindingsListener = (snapshot: FindingsSnapshot) => void;

/** Counter for generating stable IDs */
let nextId = 0;

function generateId(): string {
  return `tf-${++nextId}`;
}

/** Build a stable key for diffing: type + value */
function findingKey(f: Finding): string {
  return `${f.type}:${f.value}`;
}

/**
 * Reactive state manager for tracked findings.
 *
 * Holds the current set of findings with their statuses (active/fixed/ignored).
 * When new classifier results arrive, diffs against previous state to preserve
 * user actions (fix/ignore) on findings that are still present.
 *
 * Matching strategy: type + value with occurrence-order tiebreaker.
 * This avoids 100% churn on every keystroke (index-based matching would).
 */
export interface FindingsState {
  /** Push new classifier results. Diffs against current state. */
  update(findings: ReadonlyArray<Finding>): void;
  /** Get current snapshot */
  getSnapshot(): FindingsSnapshot;
  /** Mark a finding as fixed */
  fix(id: string): void;
  /** Mark a finding as ignored */
  ignore(id: string): void;
  /** Fix all active findings. Returns the list that were fixed. */
  fixAll(): ReadonlyArray<TrackedFinding>;
  /** Ignore all active findings of a given type */
  ignoreAllOfType(type: string): void;
  /** Subscribe to state changes */
  subscribe(listener: FindingsListener): () => void;
  /** Reset all state */
  clear(): void;
}

/**
 * Create a new FindingsState instance.
 */
export function createFindingsState(): FindingsState {
  let tracked: TrackedFinding[] = [];
  const listeners = new Set<FindingsListener>();

  function snapshot(): FindingsSnapshot {
    return {
      tracked: [...tracked],
      activeCount: tracked.filter((t) => t.status === 'active').length,
    };
  }

  function notify(): void {
    const snap = snapshot();
    for (const listener of listeners) {
      listener(snap);
    }
  }

  function update(findings: ReadonlyArray<Finding>): void {
    // Build a map of previous tracked findings grouped by key
    // Each key maps to a queue (FIFO) of tracked findings
    const prevByKey = new Map<string, TrackedFinding[]>();
    for (const tf of tracked) {
      const key = findingKey(tf.finding);
      const queue = prevByKey.get(key);
      if (queue) {
        queue.push(tf);
      } else {
        prevByKey.set(key, [tf]);
      }
    }

    // Build new tracked list by matching new findings against previous state
    const newTracked: TrackedFinding[] = [];
    for (const finding of findings) {
      const key = findingKey(finding);
      const queue = prevByKey.get(key);
      const prev = queue?.shift(); // FIFO: consume first matching previous

      if (prev) {
        // Carry forward status and id, update finding (indices may have shifted)
        newTracked.push({
          id: prev.id,
          finding,
          status: prev.status,
        });
      } else {
        // New finding — default to active
        newTracked.push({
          id: generateId(),
          finding,
          status: 'active',
        });
      }
    }

    tracked = newTracked;
    notify();
  }

  function fix(id: string): void {
    const idx = tracked.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const tf = tracked[idx];
    if (!tf || tf.status !== 'active') return;
    tracked[idx] = { ...tf, status: 'fixed' };
    notify();
  }

  function ignore(id: string): void {
    const idx = tracked.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const tf = tracked[idx];
    if (!tf || tf.status !== 'active') return;
    tracked[idx] = { ...tf, status: 'ignored' };
    notify();
  }

  function fixAll(): ReadonlyArray<TrackedFinding> {
    const toFix: TrackedFinding[] = [];
    tracked = tracked.map((tf) => {
      if (tf.status === 'active') {
        toFix.push(tf);
        return { ...tf, status: 'fixed' as const };
      }
      return tf;
    });
    if (toFix.length > 0) {
      notify();
    }
    return toFix;
  }

  function ignoreAllOfType(type: string): void {
    let changed = false;
    tracked = tracked.map((tf) => {
      if (tf.status === 'active' && tf.finding.type === type) {
        changed = true;
        return { ...tf, status: 'ignored' as const };
      }
      return tf;
    });
    if (changed) {
      notify();
    }
  }

  function subscribe(listener: FindingsListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function clear(): void {
    tracked = [];
    notify();
  }

  return { update, getSnapshot, fix, ignore, fixAll, ignoreAllOfType, subscribe, clear };

  function getSnapshot(): FindingsSnapshot {
    return snapshot();
  }
}
