import type { OnboardingState, OnboardingStatus } from './types';

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  status: 'not-started',
};

/**
 * Read onboarding state from storage.
 * Handles backward compatibility: existing users with flagged events
 * are auto-migrated to 'completed' so they never see onboarding.
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const data = await chrome.storage.local.get(['onboarding', 'flaggedEvents']);
  const stored = data['onboarding'] as OnboardingState | undefined;

  if (stored && isValidStatus(stored.status)) {
    return stored;
  }

  // Migration: existing users with flagged events skip onboarding
  const events = data['flaggedEvents'] as unknown[] | undefined;
  if (Array.isArray(events) && events.length > 0) {
    const migrated: OnboardingState = { status: 'completed' };
    await chrome.storage.local.set({ onboarding: migrated });
    return migrated;
  }

  return { ...DEFAULT_ONBOARDING_STATE };
}

/** Mark onboarding as completed with a timestamp. */
export async function completeOnboarding(): Promise<void> {
  const state: OnboardingState = {
    status: 'completed',
    completedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ onboarding: state });
}

/** Mark onboarding as skipped with a timestamp. */
export async function skipOnboarding(): Promise<void> {
  const state: OnboardingState = {
    status: 'skipped',
    completedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ onboarding: state });
}

const VALID_STATUSES: ReadonlySet<OnboardingStatus> = new Set([
  'not-started',
  'completed',
  'skipped',
]);

function isValidStatus(value: unknown): value is OnboardingStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value as OnboardingStatus);
}
