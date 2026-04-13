import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/preact';
import { RecoveryDetail } from '../../../../src/ui/dashboard/RecoveryDetail';
import type { FlaggedEvent, ProviderGuidanceSettings } from '../../../../src/storage/types';

const providerGuidance: ProviderGuidanceSettings = {
  chatgpt: 'general',
  claude: 'business',
  gemini: 'workspace',
};

function makeEvent(overrides: Partial<FlaggedEvent> = {}): FlaggedEvent {
  return {
    id: 'evt-1',
    timestamp: '2026-03-14T10:00:00Z',
    tool: 'chatgpt',
    categories: ['email'],
    findingCount: 1,
    action: 'sent-anyway-click',
    source: 'prompt',
    maskingAvailable: true,
    maskingUsed: false,
    needsAttention: true,
    guidanceVersion: 1,
    ...overrides,
  };
}

describe('RecoveryDetail', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders provider-specific recovery titles for supported tools', () => {
    const { rerender } = render(
      <RecoveryDetail event={makeEvent({ tool: 'chatgpt' })} providerGuidance={providerGuidance} />,
    );
    expect(screen.getByText('ChatGPT recovery path')).toBeTruthy();

    rerender(
      <RecoveryDetail event={makeEvent({ tool: 'claude' })} providerGuidance={providerGuidance} />,
    );
    expect(screen.getByText('Claude recovery path')).toBeTruthy();

    rerender(
      <RecoveryDetail event={makeEvent({ tool: 'gemini' })} providerGuidance={providerGuidance} />,
    );
    expect(screen.getByText('Gemini recovery path')).toBeTruthy();
  });

  it('shows configured mode notes only when the selected mode is specific', () => {
    const { rerender, container } = render(
      <RecoveryDetail event={makeEvent({ tool: 'chatgpt' })} providerGuidance={providerGuidance} />,
    );
    expect(container.textContent).not.toContain('Configured as consumer ChatGPT guidance');

    rerender(
      <RecoveryDetail event={makeEvent({ tool: 'gemini' })} providerGuidance={providerGuidance} />,
    );
    expect(container.textContent).toContain('Configured as Google Workspace guidance');
  });

  it('falls back safely when no provider guidance exists', () => {
    const { container } = render(
      <RecoveryDetail
        event={makeEvent({ tool: 'unknown-tool' })}
        providerGuidance={providerGuidance}
      />,
    );

    expect(container.textContent).not.toContain('recovery path');
    expect(container.textContent).not.toContain('Verified against official provider sources');
  });

  it('links recovery detail back to the reports tab', () => {
    render(
      <RecoveryDetail event={makeEvent({ tool: 'claude' })} providerGuidance={providerGuidance} />,
    );

    const link = screen.getAllByText('Open provider guidance in Reports')[0];
    expect(link.getAttribute('href')).toBe('#reports');
  });
});
