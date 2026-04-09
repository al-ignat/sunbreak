import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOnboardingState,
  completeOnboarding,
  skipOnboarding,
} from '../../../src/storage/onboarding';

describe('onboarding storage', () => {
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

  describe('getOnboardingState', () => {
    it('returns not-started for a fresh install', async () => {
      const state = await getOnboardingState();
      expect(state.status).toBe('not-started');
      expect(state.completedAt).toBeUndefined();
    });

    it('returns stored state when onboarding key exists', async () => {
      storageData['onboarding'] = {
        status: 'completed',
        completedAt: '2026-04-09T12:00:00.000Z',
      };
      const state = await getOnboardingState();
      expect(state.status).toBe('completed');
      expect(state.completedAt).toBe('2026-04-09T12:00:00.000Z');
    });

    it('returns stored skipped state', async () => {
      storageData['onboarding'] = { status: 'skipped', completedAt: '2026-04-09T12:00:00.000Z' };
      const state = await getOnboardingState();
      expect(state.status).toBe('skipped');
    });

    it('auto-migrates to completed when flagged events exist', async () => {
      storageData['flaggedEvents'] = [
        { id: 'evt-1', timestamp: '2026-04-01T00:00:00.000Z', tool: 'chatgpt', action: 'redacted' },
      ];
      const state = await getOnboardingState();
      expect(state.status).toBe('completed');
      // Should persist the migration
      expect(storageData['onboarding']).toEqual({ status: 'completed' });
    });

    it('does not auto-migrate when flagged events array is empty', async () => {
      storageData['flaggedEvents'] = [];
      const state = await getOnboardingState();
      expect(state.status).toBe('not-started');
      expect(storageData['onboarding']).toBeUndefined();
    });

    it('ignores invalid status values and falls back to migration check', async () => {
      storageData['onboarding'] = { status: 'invalid-value' };
      const state = await getOnboardingState();
      expect(state.status).toBe('not-started');
    });

    it('ignores non-array flaggedEvents', async () => {
      storageData['flaggedEvents'] = 'not-an-array';
      const state = await getOnboardingState();
      expect(state.status).toBe('not-started');
    });
  });

  describe('completeOnboarding', () => {
    it('writes completed status with timestamp', async () => {
      await completeOnboarding();
      const stored = storageData['onboarding'] as Record<string, unknown>;
      expect(stored['status']).toBe('completed');
      expect(typeof stored['completedAt']).toBe('string');
      expect(new Date(stored['completedAt'] as string).getTime()).not.toBeNaN();
    });
  });

  describe('skipOnboarding', () => {
    it('writes skipped status with timestamp', async () => {
      await skipOnboarding();
      const stored = storageData['onboarding'] as Record<string, unknown>;
      expect(stored['status']).toBe('skipped');
      expect(typeof stored['completedAt']).toBe('string');
      expect(new Date(stored['completedAt'] as string).getTime()).not.toBeNaN();
    });
  });

  describe('round-trip', () => {
    it('completeOnboarding then getOnboardingState returns completed', async () => {
      await completeOnboarding();
      const state = await getOnboardingState();
      expect(state.status).toBe('completed');
      expect(state.completedAt).toBeDefined();
    });

    it('skipOnboarding then getOnboardingState returns skipped', async () => {
      await skipOnboarding();
      const state = await getOnboardingState();
      expect(state.status).toBe('skipped');
      expect(state.completedAt).toBeDefined();
    });
  });
});
