import { describe, it, expect, vi } from 'vitest';
import { createFindingsState } from '../../../src/content/findings-state';
import type { TrackedFinding } from '../../../src/content/findings-state';
import type { Finding } from '../../../src/classifier/types';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    type: 'email',
    value: 'john@example.com',
    startIndex: 0,
    endIndex: 16,
    confidence: 'HIGH',
    label: 'Email Address',
    placeholder: '[EMAIL_1]',
    ...overrides,
  };
}

/** Safely get the id of a tracked finding at index, throwing descriptive error */
function idAt(tracked: ReadonlyArray<TrackedFinding>, index: number): string {
  const tf = tracked[index];
  if (!tf) throw new Error(`No tracked finding at index ${index}`);
  return tf.id;
}

describe('FindingsState', () => {
  describe('update', () => {
    it('adds new findings as active', () => {
      const state = createFindingsState();
      const finding = makeFinding();
      state.update([finding]);

      const snap = state.getSnapshot();
      expect(snap.tracked).toHaveLength(1);
      expect(snap.tracked[0]?.status).toBe('active');
      expect(snap.tracked[0]?.finding).toEqual(finding);
      expect(snap.activeCount).toBe(1);
    });

    it('clears findings when updated with empty array', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      state.update([]);

      const snap = state.getSnapshot();
      expect(snap.tracked).toHaveLength(0);
      expect(snap.activeCount).toBe(0);
    });

    it('preserves status when same type+value persists', () => {
      const state = createFindingsState();
      const f1 = makeFinding({ startIndex: 5, endIndex: 21 });
      state.update([f1]);

      // Fix it
      const id = idAt(state.getSnapshot().tracked, 0);
      state.fix(id);
      expect(state.getSnapshot().tracked[0]?.status).toBe('fixed');

      // Update with same type+value but shifted indices
      const f2 = makeFinding({ startIndex: 10, endIndex: 26 });
      state.update([f2]);

      const snap = state.getSnapshot();
      expect(snap.tracked).toHaveLength(1);
      expect(snap.tracked[0]?.status).toBe('fixed');
      expect(snap.tracked[0]?.id).toBe(id);
      expect(snap.tracked[0]?.finding.startIndex).toBe(10);
    });

    it('preserves id across updates for same type+value', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      const id1 = idAt(state.getSnapshot().tracked, 0);

      state.update([makeFinding({ startIndex: 5, endIndex: 21 })]);
      const id2 = idAt(state.getSnapshot().tracked, 0);

      expect(id1).toBe(id2);
    });

    it('handles multiple findings with same type+value (occurrence order)', () => {
      const state = createFindingsState();
      const f1 = makeFinding({ startIndex: 0, endIndex: 16 });
      const f2 = makeFinding({ startIndex: 30, endIndex: 46 });
      state.update([f1, f2]);

      // Fix the first one
      const snap1 = state.getSnapshot();
      state.fix(idAt(snap1.tracked, 0));

      // Update: same values, shifted indices
      const f3 = makeFinding({ startIndex: 5, endIndex: 21 });
      const f4 = makeFinding({ startIndex: 35, endIndex: 51 });
      state.update([f3, f4]);

      const snap2 = state.getSnapshot();
      expect(snap2.tracked).toHaveLength(2);
      // First should stay fixed (FIFO matching)
      expect(snap2.tracked[0]?.status).toBe('fixed');
      // Second should stay active
      expect(snap2.tracked[1]?.status).toBe('active');
    });

    it('removes findings that disappear from text', () => {
      const state = createFindingsState();
      state.update([
        makeFinding({ value: 'a@b.com', startIndex: 0, endIndex: 7 }),
        makeFinding({ value: 'c@d.com', startIndex: 10, endIndex: 17 }),
      ]);
      expect(state.getSnapshot().tracked).toHaveLength(2);

      // Only first remains
      state.update([
        makeFinding({ value: 'a@b.com', startIndex: 0, endIndex: 7 }),
      ]);
      const snap = state.getSnapshot();
      expect(snap.tracked).toHaveLength(1);
      expect(snap.tracked[0]?.finding.value).toBe('a@b.com');
    });

    it('adds new findings that appear from edits', () => {
      const state = createFindingsState();
      state.update([makeFinding({ value: 'a@b.com' })]);

      state.update([
        makeFinding({ value: 'a@b.com', startIndex: 0, endIndex: 7 }),
        makeFinding({ type: 'phone', value: '+4512345678', startIndex: 10, endIndex: 21 }),
      ]);

      const snap = state.getSnapshot();
      expect(snap.tracked).toHaveLength(2);
      expect(snap.tracked[1]?.status).toBe('active');
    });

    it('differentiates by type when values collide', () => {
      const state = createFindingsState();
      // Same value matched by different detectors
      const emailFinding = makeFinding({ type: 'email', value: 'test' });
      const keywordFinding = makeFinding({ type: 'keyword', value: 'test' });
      state.update([emailFinding, keywordFinding]);

      state.fix(idAt(state.getSnapshot().tracked, 0));

      // Re-classify: same two findings
      state.update([
        makeFinding({ type: 'email', value: 'test' }),
        makeFinding({ type: 'keyword', value: 'test' }),
      ]);

      const snap = state.getSnapshot();
      expect(snap.tracked[0]?.status).toBe('fixed');
      expect(snap.tracked[1]?.status).toBe('active');
    });
  });

  describe('fix', () => {
    it('marks an active finding as fixed', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      const id = idAt(state.getSnapshot().tracked, 0);

      state.fix(id);
      expect(state.getSnapshot().tracked[0]?.status).toBe('fixed');
      expect(state.getSnapshot().activeCount).toBe(0);
    });

    it('does nothing for non-existent id', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      state.fix('nonexistent');
      expect(state.getSnapshot().tracked[0]?.status).toBe('active');
    });

    it('does nothing for already fixed finding', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      const id = idAt(state.getSnapshot().tracked, 0);
      state.fix(id);

      const listener = vi.fn();
      state.subscribe(listener);
      state.fix(id);
      // Should not notify since nothing changed
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('ignore', () => {
    it('marks an active finding as ignored', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      const id = idAt(state.getSnapshot().tracked, 0);

      state.ignore(id);
      expect(state.getSnapshot().tracked[0]?.status).toBe('ignored');
      expect(state.getSnapshot().activeCount).toBe(0);
    });

    it('does nothing for already ignored finding', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      const id = idAt(state.getSnapshot().tracked, 0);
      state.ignore(id);

      const listener = vi.fn();
      state.subscribe(listener);
      state.ignore(id);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('fixAll', () => {
    it('fixes all active findings', () => {
      const state = createFindingsState();
      state.update([
        makeFinding({ value: 'a@b.com' }),
        makeFinding({ value: 'c@d.com' }),
      ]);

      const fixed = state.fixAll();
      expect(fixed).toHaveLength(2);

      const snap = state.getSnapshot();
      expect(snap.activeCount).toBe(0);
      expect(snap.tracked.every((t) => t.status === 'fixed')).toBe(true);
    });

    it('skips already fixed/ignored findings', () => {
      const state = createFindingsState();
      state.update([
        makeFinding({ value: 'a@b.com' }),
        makeFinding({ value: 'c@d.com' }),
        makeFinding({ value: 'e@f.com' }),
      ]);

      const ids = state.getSnapshot().tracked;
      state.fix(idAt(ids, 0));
      state.ignore(idAt(ids, 1));

      const fixed = state.fixAll();
      // Only the third one should be newly fixed
      expect(fixed).toHaveLength(1);
      expect(fixed[0]?.finding.value).toBe('e@f.com');
    });

    it('does not notify when no active findings exist', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      state.fix(idAt(state.getSnapshot().tracked, 0));

      const listener = vi.fn();
      state.subscribe(listener);
      state.fixAll();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('notifies on update', () => {
      const state = createFindingsState();
      const listener = vi.fn();
      state.subscribe(listener);

      state.update([makeFinding()]);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ activeCount: 1 }),
      );
    });

    it('notifies on fix', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);
      const id = idAt(state.getSnapshot().tracked, 0);

      const listener = vi.fn();
      state.subscribe(listener);
      state.fix(id);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ activeCount: 0 }),
      );
    });

    it('unsubscribes correctly', () => {
      const state = createFindingsState();
      const listener = vi.fn();
      const unsub = state.subscribe(listener);

      state.update([makeFinding()]);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      state.update([]);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('removes all tracked findings', () => {
      const state = createFindingsState();
      state.update([makeFinding(), makeFinding({ value: 'x@y.com' })]);
      expect(state.getSnapshot().tracked).toHaveLength(2);

      state.clear();
      expect(state.getSnapshot().tracked).toHaveLength(0);
      expect(state.getSnapshot().activeCount).toBe(0);
    });

    it('notifies subscribers', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);

      const listener = vi.fn();
      state.subscribe(listener);
      state.clear();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
