import type { JSX } from 'preact';
import type { AggregatedStats } from '../../storage/types';
import { toolLabel } from '../format';

export interface StatsCardProps {
  readonly stats: AggregatedStats;
  readonly periodLabel: string;
}

export function StatsCard({ stats, periodLabel }: StatsCardProps): JSX.Element {
  const compliance =
    stats.complianceRate !== null
      ? `${stats.complianceRate.toFixed(1)}%`
      : '\u2014';

  if (stats.totalInteractions === 0) {
    return (
      <div className="stats-card">
        <p className="stats-card__empty">
          No activity yet. Start using AI tools and your stats will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <p className="stats-card__text">
        {periodLabel}:{' '}
        <strong>{stats.totalInteractions}</strong> AI interactions,{' '}
        <strong>{stats.flaggedCount}</strong> flagged,{' '}
        <strong>{stats.redactedCount}</strong> redacted.{' '}
        Compliance rate: <strong>{compliance}</strong>
      </p>
      {Object.keys(stats.byTool).length > 0 && (
        <div className="stats-card__tools">
          {Object.entries(stats.byTool).map(([tool, count]) => (
            <span key={tool}>
              {toolLabel(tool)}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
