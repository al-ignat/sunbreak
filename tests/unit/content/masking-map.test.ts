import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMaskingMap } from '../../../src/content/masking-map';

describe('MaskingMap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set / get', () => {
    it('stores and retrieves a token → value pair', () => {
      const mm = createMaskingMap();
      mm.set('«email-j.smith»', 'john.smith@acme.com');
      expect(mm.get('«email-j.smith»')).toBe('john.smith@acme.com');
      mm.destroy();
    });

    it('returns undefined for unknown token', () => {
      const mm = createMaskingMap();
      expect(mm.get('«unknown»')).toBeUndefined();
      mm.destroy();
    });

    it('overwrites existing token with new value', () => {
      const mm = createMaskingMap();
      mm.set('«email-j.smith»', 'john@acme.com');
      mm.set('«email-j.smith»', 'john@other.com');
      expect(mm.get('«email-j.smith»')).toBe('john@other.com');
      expect(mm.size).toBe(1);
      mm.destroy();
    });
  });

  describe('setAll', () => {
    it('stores multiple pairs at once', () => {
      const mm = createMaskingMap();
      mm.setAll([
        { token: '«email-j.smith»', originalValue: 'john@acme.com' },
        { token: '«phone-US-555»', originalValue: '+1-555-123-4567' },
      ]);
      expect(mm.get('«email-j.smith»')).toBe('john@acme.com');
      expect(mm.get('«phone-US-555»')).toBe('+1-555-123-4567');
      expect(mm.size).toBe(2);
      mm.destroy();
    });
  });

  describe('size', () => {
    it('reflects current mapping count', () => {
      const mm = createMaskingMap();
      expect(mm.size).toBe(0);
      mm.set('a', '1');
      expect(mm.size).toBe(1);
      mm.set('b', '2');
      expect(mm.size).toBe(2);
      mm.clear();
      expect(mm.size).toBe(0);
      mm.destroy();
    });
  });

  describe('restore', () => {
    it('replaces all known tokens in text', () => {
      const mm = createMaskingMap();
      mm.setAll([
        { token: '«email-j.smith»', originalValue: 'john@acme.com' },
        { token: '«phone-US-555»', originalValue: '+1-555-123-4567' },
      ]);

      const result = mm.restore(
        'Contact «email-j.smith» or call «phone-US-555» for info.',
      );
      expect(result.restored).toBe(
        'Contact john@acme.com or call +1-555-123-4567 for info.',
      );
      expect(result.count).toBe(2);
      mm.destroy();
    });

    it('returns original text and count 0 when no tokens found', () => {
      const mm = createMaskingMap();
      mm.set('«email-j.smith»', 'john@acme.com');
      const result = mm.restore('No tokens in this text.');
      expect(result.restored).toBe('No tokens in this text.');
      expect(result.count).toBe(0);
      mm.destroy();
    });

    it('returns original text and count 0 when map is empty', () => {
      const mm = createMaskingMap();
      const result = mm.restore('Some text here.');
      expect(result.restored).toBe('Some text here.');
      expect(result.count).toBe(0);
      mm.destroy();
    });

    it('replaces multiple occurrences of the same token', () => {
      const mm = createMaskingMap();
      mm.set('«email-j.smith»', 'john@acme.com');
      const result = mm.restore(
        '«email-j.smith» said hello to «email-j.smith»',
      );
      expect(result.restored).toBe(
        'john@acme.com said hello to john@acme.com',
      );
      expect(result.count).toBe(2);
      mm.destroy();
    });
  });

  describe('subscribe', () => {
    it('fires on set()', () => {
      const mm = createMaskingMap();
      const listener = vi.fn();
      mm.subscribe(listener);
      mm.set('a', '1');
      expect(listener).toHaveBeenCalledTimes(1);
      mm.destroy();
    });

    it('fires on setAll()', () => {
      const mm = createMaskingMap();
      const listener = vi.fn();
      mm.subscribe(listener);
      mm.setAll([
        { token: 'a', originalValue: '1' },
        { token: 'b', originalValue: '2' },
      ]);
      expect(listener).toHaveBeenCalledTimes(1);
      mm.destroy();
    });

    it('fires on clear()', () => {
      const mm = createMaskingMap();
      mm.set('a', '1');
      const listener = vi.fn();
      mm.subscribe(listener);
      mm.clear();
      expect(listener).toHaveBeenCalledTimes(1);
      mm.destroy();
    });

    it('fires on TTL expiry', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      mm.set('a', '1');
      const listener = vi.fn();
      mm.subscribe(listener);
      vi.advanceTimersByTime(5000);
      expect(listener).toHaveBeenCalledTimes(1);
      mm.destroy();
    });

    it('unsubscribe stops notifications', () => {
      const mm = createMaskingMap();
      const listener = vi.fn();
      const unsub = mm.subscribe(listener);
      unsub();
      mm.set('a', '1');
      expect(listener).not.toHaveBeenCalled();
      mm.destroy();
    });
  });

  describe('TTL expiry', () => {
    it('clears all mappings after configured duration', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      mm.set('a', '1');
      mm.set('b', '2');
      expect(mm.size).toBe(2);

      vi.advanceTimersByTime(5000);
      expect(mm.size).toBe(0);
      expect(mm.get('a')).toBeUndefined();
      mm.destroy();
    });

    it('set() resets the TTL timer', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      mm.set('a', '1');

      // Advance 3s — not expired yet
      vi.advanceTimersByTime(3000);
      expect(mm.size).toBe(1);

      // set() resets the timer
      mm.set('b', '2');

      // Advance another 3s — only 3s since last set, not expired
      vi.advanceTimersByTime(3000);
      expect(mm.size).toBe(2);

      // Advance remaining 2s — now 5s since last set, expired
      vi.advanceTimersByTime(2000);
      expect(mm.size).toBe(0);
      mm.destroy();
    });

    it('setAll() resets the TTL timer', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      mm.set('a', '1');

      vi.advanceTimersByTime(3000);
      mm.setAll([{ token: 'b', originalValue: '2' }]);

      vi.advanceTimersByTime(3000);
      expect(mm.size).toBe(2);

      vi.advanceTimersByTime(2000);
      expect(mm.size).toBe(0);
      mm.destroy();
    });

    it('uses default 30 min TTL when no option provided', () => {
      const mm = createMaskingMap();
      mm.set('a', '1');

      // 29 minutes — not expired
      vi.advanceTimersByTime(29 * 60 * 1000);
      expect(mm.size).toBe(1);

      // 1 more minute — expired
      vi.advanceTimersByTime(60 * 1000);
      expect(mm.size).toBe(0);
      mm.destroy();
    });
  });

  describe('entries', () => {
    it('returns all token → value pairs', () => {
      const mm = createMaskingMap();
      mm.set('[email]', 'john@acme.com');
      mm.set('[phone]', '+1-555-0123');
      const entries = mm.entries();
      expect(entries).toHaveLength(2);
      expect(entries).toContainEqual({ token: '[email]', originalValue: 'john@acme.com' });
      expect(entries).toContainEqual({ token: '[phone]', originalValue: '+1-555-0123' });
      mm.destroy();
    });

    it('returns empty array when no mappings', () => {
      const mm = createMaskingMap();
      expect(mm.entries()).toHaveLength(0);
      mm.destroy();
    });
  });

  describe('expiresAt', () => {
    it('is null when no mappings exist', () => {
      const mm = createMaskingMap();
      expect(mm.expiresAt).toBeNull();
      mm.destroy();
    });

    it('returns a future timestamp after set()', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      const before = Date.now();
      mm.set('a', '1');
      const expiresAt = mm.expiresAt;
      if (expiresAt === null) throw new Error('expiresAt should not be null');
      expect(expiresAt).toBeGreaterThanOrEqual(before + 5000);
      mm.destroy();
    });

    it('resets after set() call', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      mm.set('a', '1');
      const first = mm.expiresAt;

      vi.advanceTimersByTime(2000);
      mm.set('b', '2');
      const second = mm.expiresAt;

      if (first === null) throw new Error('first expiresAt should not be null');
      if (second === null) throw new Error('second expiresAt should not be null');
      expect(second).toBeGreaterThan(first);
      mm.destroy();
    });

    it('is null after clear()', () => {
      const mm = createMaskingMap();
      mm.set('a', '1');
      expect(mm.expiresAt).not.toBeNull();
      mm.clear();
      expect(mm.expiresAt).toBeNull();
      mm.destroy();
    });

    it('is null after TTL expiry', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      mm.set('a', '1');
      vi.advanceTimersByTime(5000);
      expect(mm.expiresAt).toBeNull();
      mm.destroy();
    });
  });

  describe('clear', () => {
    it('removes all mappings and cancels timer', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      mm.set('a', '1');
      mm.set('b', '2');
      mm.clear();

      expect(mm.size).toBe(0);
      expect(mm.get('a')).toBeUndefined();

      // Timer was cancelled — advancing should not trigger expiry listener
      const listener = vi.fn();
      mm.subscribe(listener);
      vi.advanceTimersByTime(5000);
      expect(listener).not.toHaveBeenCalled();
      mm.destroy();
    });
  });

  describe('destroy', () => {
    it('cancels timer and clears listeners', () => {
      const mm = createMaskingMap({ ttlMs: 5000 });
      const listener = vi.fn();
      mm.subscribe(listener);
      mm.set('a', '1');
      listener.mockClear();

      mm.destroy();

      // Advancing timer should not fire listener
      vi.advanceTimersByTime(5000);
      expect(listener).not.toHaveBeenCalled();
      expect(mm.size).toBe(0);
    });
  });
});
