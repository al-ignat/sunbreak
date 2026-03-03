import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { BarChart } from '../../../../src/ui/dashboard/BarChart';
import type { AggregatedStats } from '../../../../src/storage/types';

function makeStats(overrides: Partial<AggregatedStats> = {}): AggregatedStats {
  return {
    totalInteractions: 20,
    flaggedCount: 3,
    redactedCount: 2,
    sentAnywayCount: 1,
    cancelledCount: 0,
    editedCount: 0,
    byTool: {},
    dailyBreakdown: [
      { date: '2026-03-01', total: 10, flagged: 2, clean: 8, byTool: {} },
      { date: '2026-03-02', total: 10, flagged: 1, clean: 9, byTool: {} },
    ],
    complianceRate: 95.0,
    ...overrides,
  };
}

describe('BarChart', () => {
  it('shows loading when stats are null', () => {
    const { container } = render(<BarChart stats7={null} stats30={null} />);
    expect(container.textContent).toContain('Loading');
  });

  it('shows empty state when no interactions', () => {
    const emptyStats = makeStats({
      totalInteractions: 0,
      dailyBreakdown: [],
    });
    const { container } = render(
      <BarChart stats7={emptyStats} stats30={emptyStats} />,
    );
    expect(container.textContent).toContain('No data yet');
  });

  it('renders SVG chart when data exists', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders hidden accessibility table', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    const table = container.querySelector('table[aria-label="Daily interaction data"]');
    expect(table).not.toBeNull();
    const rows = table?.querySelectorAll('tbody tr') ?? [];
    expect(rows.length).toBe(2);
  });

  it('shows legend with Clean and Flagged labels', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    expect(container.textContent).toContain('Clean');
    expect(container.textContent).toContain('Flagged');
  });

  it('shows period toggle buttons', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    expect(container.textContent).toContain('Last 7 Days');
    expect(container.textContent).toContain('Last 30 Days');
  });
});
