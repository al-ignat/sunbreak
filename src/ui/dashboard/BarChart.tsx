import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { Shield, ShieldCheck, TriangleAlert, TrendingUp, TrendingDown } from 'lucide-preact';
import type { AggregatedStats } from '../../storage/types';
import { toolLabel } from '../format';

export interface BarChartProps {
  readonly stats7: AggregatedStats | null;
  readonly stats30: AggregatedStats | null;
}

type ChartPeriod = '7d' | '30d';

/** Brand dot colors for each tool */
const TOOL_DOT: Record<string, string> = {
  chatgpt: '#10A37F',
  claude: '#D97706',
  gemini: '#4285F4',
};

export function BarChart({ stats7, stats30 }: BarChartProps): JSX.Element {
  const [period, setPeriod] = useState<ChartPeriod>('7d');

  const stats = period === '7d' ? stats7 : stats30;

  if (!stats) {
    return <p className="chart-loading">Loading...</p>;
  }

  if (stats.totalInteractions === 0) {
    return (
      <div className="empty-state">
        <p>No data yet. Start using AI tools and your charts will appear here.</p>
      </div>
    );
  }

  const fixRate =
    stats.flaggedCount > 0
      ? Math.round((stats.redactedCount / stats.flaggedCount) * 100)
      : null;

  return (
    <div className="overview-layout">
      {/* Metric cards */}
      <div className="metrics-row">
        <MetricCard
          label="Total Flagged"
          value={stats.flaggedCount}
          icon={<Shield size={16} />}
          iconColor="var(--color-warning)"
          subtitle={<TrendLine stats7={stats7} stats30={stats30} field="flaggedCount" />}
        />
        <MetricCard
          label="Redacted"
          value={stats.redactedCount}
          icon={<ShieldCheck size={16} />}
          iconColor="var(--color-safe)"
          subtitle={
            fixRate !== null ? (
              <span className="metric-card__subtitle metric-card__subtitle--muted">
                {fixRate}% fix rate
              </span>
            ) : null
          }
        />
        <MetricCard
          label="Sent Anyway"
          value={stats.sentAnywayCount}
          icon={<TriangleAlert size={16} />}
          iconColor="var(--color-danger)"
          subtitle={<TrendLine stats7={stats7} stats30={stats30} field="sentAnywayCount" invert />}
        />
      </div>

      {/* Chart card */}
      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">Interactions over time</h3>
          <div className="chart-toggle">
            <button
              className={`chart-toggle__btn ${period === '7d' ? 'chart-toggle__btn--active' : ''}`}
              onClick={(): void => setPeriod('7d')}
            >
              7 days
            </button>
            <button
              className={`chart-toggle__btn ${period === '30d' ? 'chart-toggle__btn--active' : ''}`}
              onClick={(): void => setPeriod('30d')}
            >
              30 days
            </button>
          </div>
        </div>

        <BarChartVisual breakdown={stats.dailyBreakdown} />

        <div className="chart-legend">
          <span className="chart-legend__item">
            <span className="chart-legend__dot chart-legend__dot--clean" />
            Clean prompts
          </span>
          <span className="chart-legend__item">
            <span className="chart-legend__dot chart-legend__dot--flagged" />
            Flagged prompts
          </span>
        </div>

        {/* Accessibility: hidden data table */}
        <table aria-label="Daily interaction data" className="visually-hidden">
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

      {/* Tool breakdown */}
      <div className="tool-row">
        {Object.entries(stats.byTool).map(([tool, count]) => (
          <div key={tool} className="tool-card">
            <div className="tool-card__header">
              <span
                className="tool-card__dot"
                style={{ background: TOOL_DOT[tool] ?? 'var(--color-text-muted)' }}
              />
              <span className="tool-card__name">{toolLabel(tool)}</span>
            </div>
            <span className="tool-card__value">{count}</span>
            <span className="tool-card__label">interactions</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Metric Card ---- */

interface MetricCardProps {
  readonly label: string;
  readonly value: number;
  readonly icon: JSX.Element;
  readonly iconColor: string;
  readonly subtitle: JSX.Element | null;
}

function MetricCard({ label, value, icon, iconColor, subtitle }: MetricCardProps): JSX.Element {
  return (
    <div className="metric-card">
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <span className="metric-card__value">{value}</span>
      {subtitle}
    </div>
  );
}

/* ---- Trend Line ---- */

interface TrendLineProps {
  readonly stats7: AggregatedStats | null;
  readonly stats30: AggregatedStats | null;
  readonly field: 'flaggedCount' | 'sentAnywayCount';
  readonly invert?: boolean;
}

function TrendLine({ stats7, stats30, field, invert }: TrendLineProps): JSX.Element | null {
  if (!stats7 || !stats30 || stats30[field] === 0) return null;

  // Compare 7d count against what 7 days' worth of 30d would be
  const dailyAvg30 = stats30[field] / 30;
  const expected7 = dailyAvg30 * 7;
  if (expected7 === 0) return null;

  const pctChange = Math.round(((stats7[field] - expected7) / expected7) * 100);
  const isDown = pctChange < 0;
  // For "sent anyway", going down is good
  const isGood = invert ? isDown : !isDown;

  if (pctChange === 0) return null;

  return (
    <span className={`metric-card__trend ${isGood ? 'metric-card__trend--good' : 'metric-card__trend--bad'}`}>
      {isDown ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
      {isDown ? '' : '+'}{pctChange}% this week
    </span>
  );
}

/* ---- Bar Chart Visual (div-based) ---- */

interface BarChartVisualProps {
  readonly breakdown: AggregatedStats['dailyBreakdown'];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_LABELS[d.getDay()] ?? dateStr.slice(5);
}

function BarChartVisual({ breakdown }: BarChartVisualProps): JSX.Element {
  const maxVal = Math.max(1, ...breakdown.map((d) => d.total));

  return (
    <div>
      <div className="chart-bars" role="img" aria-label="Daily interaction bar chart">
        {breakdown.map((day) => {
          const cleanPct = (day.clean / maxVal) * 100;
          const flaggedPct = (day.flagged / maxVal) * 100;
          return (
            <div key={day.date} className="chart-bar">
              <div className="chart-bar__stack">
                {day.flagged > 0 && (
                  <div
                    className="chart-bar__segment chart-bar__segment--flagged"
                    style={{ height: `${flaggedPct}%` }}
                  />
                )}
                {day.clean > 0 && (
                  <div
                    className="chart-bar__segment chart-bar__segment--clean"
                    style={{ height: `${cleanPct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chart-labels">
        {breakdown.map((day) => (
          <span key={day.date} className="chart-labels__item">
            {formatDayLabel(day.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
