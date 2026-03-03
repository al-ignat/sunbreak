import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { ActivityLog } from '../../../../src/ui/dashboard/ActivityLog';
import type { FlaggedEvent } from '../../../../src/storage/types';

function makeEvent(overrides: Partial<FlaggedEvent> = {}): FlaggedEvent {
  return {
    id: 'evt-1',
    timestamp: new Date().toISOString(),
    tool: 'chatgpt',
    categories: ['email'],
    findingCount: 1,
    action: 'redacted',
    ...overrides,
  };
}

describe('ActivityLog', () => {
  it('shows empty state when no events', () => {
    const { container } = render(<ActivityLog events={[]} />);
    expect(container.textContent).toContain('No flagged events yet');
  });

  it('renders events in a table', () => {
    const events = [
      makeEvent({ id: 'e1', tool: 'chatgpt', categories: ['email'], action: 'redacted' }),
      makeEvent({ id: 'e2', tool: 'claude', categories: ['api-key'], action: 'sent-anyway' }),
    ];
    const { container } = render(<ActivityLog events={events} />);
    expect(container.textContent).toContain('ChatGPT');
    expect(container.textContent).toContain('Claude');
    expect(container.textContent).toContain('Redacted');
    expect(container.textContent).toContain('Sent Anyway');
  });

  it('shows event count', () => {
    const events = [makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })];
    const { container } = render(<ActivityLog events={events} />);
    expect(container.textContent).toContain('2 events');
  });

  it('filters by tool', () => {
    const events = [
      makeEvent({ id: 'e1', tool: 'chatgpt' }),
      makeEvent({ id: 'e2', tool: 'claude' }),
    ];
    const { container } = render(<ActivityLog events={events} />);

    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'claude' } });

    // After filtering, should show 1 event
    expect(container.textContent).toContain('1 event');
    expect(container.textContent).toContain('Claude');
  });

  it('renders category badges', () => {
    const events = [
      makeEvent({ id: 'e1', categories: ['email', 'api-key'] }),
    ];
    const { container } = render(<ActivityLog events={events} />);
    expect(container.textContent).toContain('email');
    expect(container.textContent).toContain('api-key');
  });
});
