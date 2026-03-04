import type { JSX } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import type { FlaggedEvent } from '../../storage/types';
import { toolLabel, toolColor, actionLabel, actionColor, categoryColor } from '../format';
import { ToggleButton } from './ToggleButton';

export interface ActivityLogProps {
  readonly events: ReadonlyArray<FlaggedEvent>;
}

type DatePreset = '7d' | '30d' | 'all';

export function ActivityLog({ events }: ActivityLogProps): JSX.Element {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (datePreset !== 'all') {
      const days = datePreset === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();
      filtered = filtered.filter((e) => e.timestamp >= cutoffIso);
    }

    if (toolFilter !== 'all') {
      filtered = filtered.filter((e) => e.tool === toolFilter);
    }

    return filtered;
  }, [events, datePreset, toolFilter]);

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p>No flagged events yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="activity-filters">
        <div className="activity-filters__group">
          <ToggleButton active={datePreset === '7d'} onClick={(): void => setDatePreset('7d')}>
            Last 7 days
          </ToggleButton>
          <ToggleButton active={datePreset === '30d'} onClick={(): void => setDatePreset('30d')}>
            Last 30 days
          </ToggleButton>
          <ToggleButton active={datePreset === 'all'} onClick={(): void => setDatePreset('all')}>
            All time
          </ToggleButton>
        </div>

        <select
          value={toolFilter}
          onChange={(e: Event): void => setToolFilter((e.target as HTMLSelectElement).value)}
          aria-label="Filter by AI tool"
          className="activity-select"
        >
          <option value="all">All tools</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
        </select>

        <span className="activity-filters__count">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="activity-table-wrapper">
        <table className="activity-table">
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Tool</th>
              <th>Categories</th>
              <th>Findings</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="activity-table__empty-cell">
                  No events match the current filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.timestamp)}</td>
                  <td>
                    <span style={{ color: toolColor(event.tool, true), fontWeight: 500 }}>
                      {toolLabel(event.tool)}
                    </span>
                  </td>
                  <td>
                    {event.categories.map((cat) => (
                      <span
                        key={cat}
                        className="category-badge"
                        style={{
                          background: `${categoryColor(cat, true)}20`,
                          color: categoryColor(cat, true),
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </td>
                  <td>{event.findingCount}</td>
                  <td>
                    <span style={{ color: actionColor(event.action, true), fontWeight: 500 }}>
                      {actionLabel(event.action)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
