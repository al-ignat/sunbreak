import type { JSX } from 'preact';
import type { AggregatedStats } from '../../storage/types';

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
      <div style={cardStyle}>
        <p style={{ color: '#888', fontSize: '13px', margin: 0, textAlign: 'center' }}>
          No activity yet. Start using AI tools and your stats will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: '13px', color: '#555', margin: '0 0 8px' }}>
        {periodLabel}:{' '}
        <strong>{stats.totalInteractions}</strong> AI interactions,{' '}
        <strong>{stats.flaggedCount}</strong> flagged,{' '}
        <strong>{stats.redactedCount}</strong> redacted.{' '}
        Compliance rate: <strong>{compliance}</strong>
      </p>
      {Object.keys(stats.byTool).length > 0 && (
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#888' }}>
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

function toolLabel(tool: string): string {
  switch (tool) {
    case 'chatgpt': return 'ChatGPT';
    case 'claude': return 'Claude';
    case 'gemini': return 'Gemini';
    default: return tool;
  }
}

const cardStyle: JSX.CSSProperties = {
  padding: '12px',
  background: '#FAFAFA',
  borderRadius: '8px',
  border: '1px solid #E0E0E0',
};
