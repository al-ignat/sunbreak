import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { AggregatedStats } from '../../storage/types';
import { StatsCard } from './StatsCard';
import { ToggleButton } from './ToggleButton';
import { emptyStateStyle } from './styles';

export interface BarChartProps {
  readonly stats7: AggregatedStats | null;
  readonly stats30: AggregatedStats | null;
}

type ChartPeriod = '7d' | '30d';

export function BarChart({ stats7, stats30 }: BarChartProps): JSX.Element {
  const [period, setPeriod] = useState<ChartPeriod>('7d');

  const stats = period === '7d' ? stats7 : stats30;

  if (!stats) {
    return <p style={{ color: '#888', textAlign: 'center' }}>Loading...</p>;
  }

  return (
    <div>
      <StatsCard
        stats={stats}
        periodLabel={period === '7d' ? 'Last 7 days' : 'Last 30 days'}
      />

      {/* Period Toggle */}
      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        <ToggleButton active={period === '7d'} onClick={(): void => setPeriod('7d')}>
          Last 7 Days
        </ToggleButton>
        <ToggleButton active={period === '30d'} onClick={(): void => setPeriod('30d')}>
          Last 30 Days
        </ToggleButton>
      </div>

      {/* Chart */}
      {stats.totalInteractions === 0 ? (
        <div style={emptyStateStyle}>
          <p>No data yet. Start using AI tools and your charts will appear here.</p>
        </div>
      ) : (
        <div>
          <InteractionChart breakdown={stats.dailyBreakdown} />

          {/* Accessibility: hidden data table */}
          <table
            aria-label="Daily interaction data"
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
          >
            <thead>
              <tr>
                <th>Date</th>
                <th>Total</th>
                <th>Flagged</th>
                <th>Clean</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyBreakdown.map((day) => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  <td>{day.total}</td>
                  <td>{day.flagged}</td>
                  <td>{day.clean}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface InteractionChartProps {
  readonly breakdown: AggregatedStats['dailyBreakdown'];
}

function InteractionChart({ breakdown }: InteractionChartProps): JSX.Element {
  const maxVal = Math.max(1, ...breakdown.map((d) => d.total));
  const chartHeight = 200;
  const chartWidth = Math.max(400, breakdown.length * 28);
  const barWidth = Math.min(20, (chartWidth - 60) / breakdown.length - 4);
  const leftPad = 40;
  const bottomPad = 40;

  // Y-axis ticks
  const tickCount = 4;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(Math.round((maxVal / tickCount) * i));
  }

  return (
    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E0E0E0', padding: '16px', overflowX: 'auto' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#333', margin: '0 0 12px' }}>
        Daily Interactions
      </h3>
      <svg
        width={chartWidth}
        height={chartHeight + bottomPad}
        role="img"
        aria-label="Daily interaction bar chart"
      >
        {/* Y-axis ticks */}
        {ticks.map((tick) => {
          const y = chartHeight - (tick / maxVal) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={leftPad}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#F0F0F0"
                stroke-width="1"
              />
              <text
                x={leftPad - 6}
                y={y + 4}
                text-anchor="end"
                fill="#888"
                font-size="10"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {breakdown.map((day, i) => {
          const x = leftPad + i * (barWidth + 4) + 2;
          const cleanHeight = (day.clean / maxVal) * chartHeight;
          const flaggedHeight = (day.flagged / maxVal) * chartHeight;
          const dateLabel = day.date.slice(5); // MM-DD

          return (
            <g key={day.date}>
              {/* Clean bar (bottom) */}
              <rect
                x={x}
                y={chartHeight - cleanHeight - flaggedHeight}
                width={barWidth}
                height={cleanHeight}
                fill="#66BB6A"
                rx="2"
              />
              {/* Flagged bar (top, stacked) */}
              {flaggedHeight > 0 && (
                <rect
                  x={x}
                  y={chartHeight - flaggedHeight}
                  width={barWidth}
                  height={flaggedHeight}
                  fill="#FF9800"
                  rx="2"
                />
              )}
              {/* Date label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                text-anchor="middle"
                fill="#888"
                font-size="9"
                transform={`rotate(-45 ${x + barWidth / 2} ${chartHeight + 16})`}
              >
                {dateLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: '#66BB6A', borderRadius: '2px', display: 'inline-block' }} />
          Clean
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: '#FF9800', borderRadius: '2px', display: 'inline-block' }} />
          Flagged
        </span>
      </div>
    </div>
  );
}

