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
    fixedCount: 0,
    ignoredCount: 0,
    byTool: { chatgpt: 12, claude: 8 },
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

  it('renders metric cards with correct values', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    expect(container.textContent).toContain('Total Flagged');
    expect(container.textContent).toContain('Redacted');
    expect(container.textContent).toContain('Sent Anyway');
    // Values from makeStats
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('2');
  });

  it('renders div-based bar chart when data exists', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    const bars = container.querySelectorAll('.chart-bar');
    expect(bars.length).toBe(2);
  });

  it('renders hidden accessibility table', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    const table = container.querySelector('table[aria-label="Daily interaction data"]');
    expect(table).not.toBeNull();
    const rows = table?.querySelectorAll('tbody tr') ?? [];
    expect(rows.length).toBe(2);
  });

  it('shows legend with Clean prompts and Flagged prompts labels', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    expect(container.textContent).toContain('Clean prompts');
    expect(container.textContent).toContain('Flagged prompts');
  });

  it('shows inline period toggle buttons', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    expect(container.textContent).toContain('7 days');
    expect(container.textContent).toContain('30 days');
  });

  it('renders tool breakdown cards', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    expect(container.textContent).toContain('ChatGPT');
    expect(container.textContent).toContain('Claude');
    const toolCards = container.querySelectorAll('.tool-card');
    expect(toolCards.length).toBe(2);
  });

  it('shows fix rate for redacted metric', () => {
    const stats = makeStats();
    const { container } = render(<BarChart stats7={stats} stats30={stats} />);
    expect(container.textContent).toContain('fix rate');
  });
});
