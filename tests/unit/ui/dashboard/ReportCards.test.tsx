import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/preact';
import { ReportCards } from '../../../../src/ui/dashboard/ReportCards';
import type { FlaggedEvent, ProviderGuidanceSettings } from '../../../../src/storage/types';

const providerGuidance: ProviderGuidanceSettings = {
  chatgpt: 'general',
  claude: 'business',
  gemini: 'workspace',
};

const events: ReadonlyArray<FlaggedEvent> = [
  {
    id: 'evt-1',
    timestamp: '2026-03-14T10:00:00Z',
    tool: 'claude',
    categories: ['api-key'],
    findingCount: 1,
    action: 'sent-anyway',
    source: 'prompt',
    maskingAvailable: true,
    maskingUsed: false,
    needsAttention: true,
    guidanceVersion: 1,
  },
];

describe('ReportCards', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all supported provider cards from the guidance model', () => {
    render(<ReportCards providerGuidance={providerGuidance} events={events} />);

    expect(screen.getByText('ChatGPT')).toBeTruthy();
    expect(screen.getByText('Claude')).toBeTruthy();
    expect(screen.getByText('Gemini')).toBeTruthy();
  });

  it('shows verification date and official source links', () => {
    render(<ReportCards providerGuidance={providerGuidance} events={events} />);

    expect(screen.getAllByText(/Verified against official sources on 2026-03-14/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('How to Delete and Archive Chats in ChatGPT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('How can I delete or rename a conversation?').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gemini Apps Privacy Hub').length).toBeGreaterThan(0);
  });

  it('shows configured guidance modes and mode-specific notes', () => {
    render(<ReportCards providerGuidance={providerGuidance} events={events} />);

    expect(screen.getAllByText('Configured guidance mode: business').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configured guidance mode: workspace').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Workspace administrators may manage activity, retention, and access controls/).length,
    ).toBeGreaterThan(0);
  });

  it('links provider guidance back to recent activity context', () => {
    render(<ReportCards providerGuidance={providerGuidance} events={events} />);

    expect(screen.getAllByText('1 recent Claude flagged event recorded, 1 needing follow-up.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No recent ChatGPT flagged events recorded in this browser.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Review activity log').length).toBe(3);
  });
});
