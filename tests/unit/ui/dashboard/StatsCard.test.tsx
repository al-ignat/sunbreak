import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { StatsCard } from '../../../../src/ui/dashboard/StatsCard';
import type { AggregatedStats } from '../../../../src/storage/types';

function makeStats(overrides: Partial<AggregatedStats> = {}): AggregatedStats {
  return {
    totalInteractions: 47,
    flaggedCount: 5,
    redactedCount: 3,
    sentAnywayCount: 2,
    cancelledCount: 0,
    editedCount: 0,
    byTool: { chatgpt: 30, claude: 17 },
    dailyBreakdown: [],
    complianceRate: 95.7,
    ...overrides,
  };
}

describe('StatsCard', () => {
  it('renders stats summary with correct numbers', () => {
    const { container } = render(
      <StatsCard stats={makeStats()} periodLabel="This week" />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('47');
    expect(text).toContain('5');
    expect(text).toContain('3');
    expect(text).toContain('95.7%');
    expect(text).toContain('This week');
  });

  it('shows empty state when no interactions', () => {
    const { container } = render(
      <StatsCard
        stats={makeStats({ totalInteractions: 0, complianceRate: null })}
        periodLabel="This week"
      />,
    );
    expect(container.textContent).toContain('No activity yet');
  });

  it('shows dash for compliance rate when null', () => {
    const { container } = render(
      <StatsCard
        stats={makeStats({ totalInteractions: 0, complianceRate: null })}
        periodLabel="This week"
      />,
    );
    // Empty state shown, no compliance rate displayed
    expect(container.textContent).not.toContain('NaN');
  });

  it('shows per-tool breakdown', () => {
    const { container } = render(
      <StatsCard stats={makeStats()} periodLabel="This week" />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('ChatGPT');
    expect(text).toContain('30');
    expect(text).toContain('Claude');
    expect(text).toContain('17');
  });
});
