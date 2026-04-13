import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/preact';

vi.mock('../../../../src/storage/onboarding', () => ({
  getOnboardingState: vi.fn(),
  completeOnboarding: vi.fn(() => Promise.resolve()),
  skipOnboarding: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../src/storage/dashboard', () => ({
  getExtensionSettings: vi.fn(),
  getWeeklyStats: vi.fn(),
}));

import App from '../../../../src/entrypoints/popup/App';
import { getOnboardingState } from '../../../../src/storage/onboarding';
import { getExtensionSettings, getWeeklyStats } from '../../../../src/storage/dashboard';
import type { AggregatedStats, ExtensionSettings } from '../../../../src/storage/types';

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  maskingEnabled: true,
  recoveryAssistanceEnabled: false,
  providerGuidance: { chatgpt: 'general', claude: 'general', gemini: 'general' },
};

function makeStats(overrides: Partial<AggregatedStats> = {}): AggregatedStats {
  return {
    totalInteractions: 10,
    flaggedCount: 3,
    redactedCount: 2,
    sentAnywayCount: 1,
    cancelledCount: 0,
    editedCount: 0,
    fixedCount: 0,
    ignoredCount: 0,
    fileWarningCount: 0,
    byTool: {},
    dailyBreakdown: [],
    complianceRate: 90,
    ...overrides,
  };
}

describe('Popup App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows onboarding flow for new users', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue({ status: 'not-started' });

    const { container } = render(<App />);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Welcome to Sunbreak');
    });
  });

  it('shows protection status for completed users', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue({
      status: 'completed',
      completedAt: '2026-04-09T00:00:00.000Z',
    });
    vi.mocked(getExtensionSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(getWeeklyStats).mockResolvedValue(makeStats({ flaggedCount: 5 }));

    const { container } = render(<App />);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Protection active');
      expect(container.textContent).toContain('5 findings caught this week');
    });
  });

  it('shows protection status for skipped users', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue({ status: 'skipped' });
    vi.mocked(getExtensionSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(getWeeklyStats).mockResolvedValue(makeStats());

    const { container } = render(<App />);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Protection active');
    });
  });

  it('shows paused state when extension is disabled', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue({ status: 'completed' });
    vi.mocked(getExtensionSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      enabled: false,
    });
    vi.mocked(getWeeklyStats).mockResolvedValue(makeStats());

    const { container } = render(<App />);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Protection paused');
    });
  });

  it('shows all clear when no findings this week', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue({ status: 'completed' });
    vi.mocked(getExtensionSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(getWeeklyStats).mockResolvedValue(makeStats({ flaggedCount: 0 }));

    const { container } = render(<App />);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('All clear this week');
    });
  });

  it('renders action buttons', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue({ status: 'completed' });
    vi.mocked(getExtensionSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(getWeeklyStats).mockResolvedValue(makeStats());

    const { container } = render(<App />);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Open Dashboard');
      expect(container.textContent).toContain('Try Sandbox');
      expect(container.textContent).toContain('Settings');
    });
  });

  it('shows trust footer', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue({ status: 'completed' });
    vi.mocked(getExtensionSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(getWeeklyStats).mockResolvedValue(makeStats());

    const { container } = render(<App />);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Local-only scanning');
    });
  });

  it('recovers gracefully on storage error', async () => {
    vi.mocked(getOnboardingState).mockRejectedValue(new Error('storage error'));

    const { container } = render(<App />);
    // Should not crash — falls back to completed state
    await vi.waitFor(() => {
      // Should show something, not remain in loading forever
      expect(container.querySelector('.popup-loading')).toBeNull();
    });
  });
});
