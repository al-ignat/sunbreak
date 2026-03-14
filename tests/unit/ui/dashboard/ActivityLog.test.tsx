import { afterEach, describe, it, expect } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { ActivityLog } from '../../../../src/ui/dashboard/ActivityLog';
import type { FlaggedEvent, ProviderGuidanceSettings } from '../../../../src/storage/types';

const providerGuidance: ProviderGuidanceSettings = {
  chatgpt: 'general',
  claude: 'business',
  gemini: 'workspace',
};

function makeEvent(overrides: Partial<FlaggedEvent> = {}): FlaggedEvent {
  return {
    id: 'evt-1',
    timestamp: new Date().toISOString(),
    tool: 'chatgpt',
    categories: ['email'],
    findingCount: 1,
    action: 'redacted',
    source: 'prompt',
    maskingAvailable: true,
    maskingUsed: true,
    needsAttention: false,
    guidanceVersion: 1,
    ...overrides,
  };
}

describe('ActivityLog', () => {
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('shows empty state when no events', () => {
    const { container } = render(<ActivityLog events={[]} providerGuidance={providerGuidance} />);
    expect(container.textContent).toContain('No flagged events yet');
  });

  it('renders events in a table', () => {
    const events = [
      makeEvent({ id: 'e1', tool: 'chatgpt', categories: ['email'], action: 'redacted' }),
      makeEvent({ id: 'e2', tool: 'claude', categories: ['api-key'], action: 'sent-anyway' }),
    ];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);
    expect(container.textContent).toContain('ChatGPT');
    expect(container.textContent).toContain('Claude');
    expect(container.textContent).toContain('Redacted');
    expect(container.textContent).toContain('Sent Anyway');
  });

  it('shows event count', () => {
    const events = [makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);
    expect(container.textContent).toContain('2 events');
  });

  it('filters by tool', () => {
    const events = [
      makeEvent({ id: 'e1', tool: 'chatgpt' }),
      makeEvent({ id: 'e2', tool: 'claude' }),
    ];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);

    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'claude' } });

    // After filtering, should show 1 event
    expect(container.textContent).toContain('1 event');
    expect(container.textContent).toContain('Claude');
  });

  it('reads an initial tool filter from the dashboard hash', () => {
    window.location.hash = '#activity?tool=claude';

    const events = [
      makeEvent({ id: 'e1', tool: 'chatgpt' }),
      makeEvent({ id: 'e2', tool: 'claude' }),
    ];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);

    expect(container.textContent).toContain('1 event');
    expect(container.textContent).toContain('Claude');
    const rows = container.querySelectorAll('.activity-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain('Claude');

  });

  it('renders category pill badges with formatted labels', () => {
    const events = [
      makeEvent({ id: 'e1', categories: ['email', 'api_key'] }),
    ];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);
    expect(container.textContent).toContain('Email');
    expect(container.textContent).toContain('API Key');
  });

  it('shows recovery detail for the selected event', () => {
    const events = [
      makeEvent({
        id: 'e1',
        action: 'redacted',
        maskingUsed: true,
      }),
      makeEvent({
        id: 'e2',
        tool: 'claude',
        action: 'sent-anyway',
        maskingUsed: false,
        needsAttention: true,
        categories: ['api-key'],
      }),
    ];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);

    expect(container.textContent).toContain('Recovery detail');
    expect(container.textContent).toContain('Sensitive content was masked before the prompt was sent');

    const rows = container.querySelectorAll('.activity-row');
    fireEvent.click(rows[1] as HTMLButtonElement);

    expect(container.textContent).toContain('Sensitive content was detected, but the prompt was still sent');
    expect(container.textContent).toContain('Rotate any exposed credential, token, or security identifier');
    expect(container.textContent).toContain('Claude recovery path');
  });

  it('shows file-upload limitation guidance for file events', () => {
    const events = [
      makeEvent({
        id: 'file-1',
        source: 'file-upload',
        needsAttention: true,
        maskingAvailable: false,
        maskingUsed: false,
      }),
    ];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);
    expect(container.textContent).toContain('A file was sent and should be reviewed manually');
    expect(container.textContent).toContain('Sunbreak can detect the upload event, but it cannot inspect file contents');
  });

  it('formats custom pattern categories in recovery detail', () => {
    const events = [
      makeEvent({
        id: 'cp-1',
        categories: ['custom-pattern:hr'],
        needsAttention: true,
      }),
    ];
    const { container } = render(<ActivityLog events={events} providerGuidance={providerGuidance} />);
    expect(container.textContent).toContain('Company Pattern: Hr');
    expect(container.textContent).toContain('company-specific identifiers');
  });
});
