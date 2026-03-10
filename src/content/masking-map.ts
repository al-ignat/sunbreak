/** In-memory token → original value mapping with TTL auto-expiry. */

export interface MaskingMap {
  /** Add a token → original value mapping. Resets the expiry timer. */
  set(token: string, originalValue: string): void;

  /** Add multiple mappings at once (for Fix All). Resets the expiry timer. */
  setAll(entries: ReadonlyArray<{ token: string; originalValue: string }>): void;

  /** Get the original value for a token, or undefined. */
  get(token: string): string | undefined;

  /** Scan text for all known tokens. Returns restored text and count of replacements. */
  restore(text: string): { restored: string; count: number };

  /** Number of active mappings. */
  readonly size: number;

  /** Subscribe to changes (for badge rendering). Returns unsubscribe function. */
  subscribe(listener: () => void): () => void;

  /** Return all token → original value entries. */
  entries(): ReadonlyArray<{ token: string; originalValue: string }>;

  /** Timestamp (ms since epoch) when the mapping auto-expires, or null if empty. */
  readonly expiresAt: number | null;

  /** Clear all mappings and cancel the expiry timer. */
  clear(): void;

  /** Destroy the instance (cancel timers, clear listeners). */
  destroy(): void;
}

export interface MaskingMapOptions {
  /** Time-to-live in milliseconds. Default: 30 minutes. */
  readonly ttlMs?: number;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createMaskingMap(options?: MaskingMapOptions): MaskingMap {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const map = new Map<string, string>();
  const listeners = new Set<() => void>();
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let expiresAtMs: number | null = null;

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function resetTimer(): void {
    if (expiryTimer !== null) {
      clearTimeout(expiryTimer);
    }
    expiresAtMs = Date.now() + ttlMs;
    expiryTimer = setTimeout(() => {
      map.clear();
      expiryTimer = null;
      expiresAtMs = null;
      notify();
    }, ttlMs);
  }

  function cancelTimer(): void {
    if (expiryTimer !== null) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
      expiresAtMs = null;
    }
  }

  return {
    set(token: string, originalValue: string): void {
      map.set(token, originalValue);
      resetTimer();
      notify();
    },

    setAll(entries: ReadonlyArray<{ token: string; originalValue: string }>): void {
      for (const { token, originalValue } of entries) {
        map.set(token, originalValue);
      }
      resetTimer();
      notify();
    },

    get(token: string): string | undefined {
      return map.get(token);
    },

    restore(text: string): { restored: string; count: number } {
      if (map.size === 0) return { restored: text, count: 0 };

      let restored = text;
      let count = 0;

      for (const [token, original] of map) {
        let idx = restored.indexOf(token);
        while (idx !== -1) {
          restored = restored.slice(0, idx) + original + restored.slice(idx + token.length);
          count++;
          // Continue searching after the replacement
          idx = restored.indexOf(token, idx + original.length);
        }
      }

      return { restored, count };
    },

    get size(): number {
      return map.size;
    },

    entries(): ReadonlyArray<{ token: string; originalValue: string }> {
      return Array.from(map, ([token, originalValue]) => ({ token, originalValue }));
    },

    get expiresAt(): number | null {
      return expiresAtMs;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    clear(): void {
      map.clear();
      cancelTimer();
      notify();
    },

    destroy(): void {
      map.clear();
      cancelTimer();
      listeners.clear();
    },
  };
}
