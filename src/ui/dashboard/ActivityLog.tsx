import type { JSX } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { ChevronDown } from 'lucide-preact';
import type { FlaggedEvent } from '../../storage/types';
import { RecoveryDetail } from './RecoveryDetail';
import {
  toolLabel, toolColor, toolBgColor,
  actionLabel, actionColor,
  categoryColor, categoryBgColor, categoryLabel,
} from '../format';

export interface ActivityLogProps {
  readonly events: ReadonlyArray<FlaggedEvent>;
}

type DatePreset = '7d' | '30d' | 'all';

export function ActivityLog({ events }: ActivityLogProps): JSX.Element {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.id ?? null);

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

  const selectedEvent = useMemo(() => {
    const current = filteredEvents.find((event) => event.id === selectedEventId);
    return current ?? filteredEvents[0] ?? null;
  }, [filteredEvents, selectedEventId]);

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p>No flagged events yet.</p>
      </div>
    );
  }

  return (
    <div className="activity-layout">
      {/* Filters row */}
      <div className="activity-filters">
        <div className="chart-toggle">
          <button
            className={`chart-toggle__btn ${datePreset === '7d' ? 'chart-toggle__btn--active' : ''}`}
            onClick={(): void => setDatePreset('7d')}
          >
            7 days
          </button>
          <button
            className={`chart-toggle__btn ${datePreset === '30d' ? 'chart-toggle__btn--active' : ''}`}
            onClick={(): void => setDatePreset('30d')}
          >
            30 days
          </button>
          <button
            className={`chart-toggle__btn ${datePreset === 'all' ? 'chart-toggle__btn--active' : ''}`}
            onClick={(): void => setDatePreset('all')}
          >
            All
          </button>
        </div>

        <div className="activity-dropdown-wrap">
          <select
            value={toolFilter}
            onChange={(e: Event): void => setToolFilter((e.target as HTMLSelectElement).value)}
            aria-label="Filter by AI tool"
            className="activity-dropdown"
          >
            <option value="all">All tools</option>
            <option value="chatgpt">ChatGPT</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
          <ChevronDown size={14} className="activity-dropdown__icon" />
        </div>

        <div className="activity-filters__spacer" />

        <span className="activity-filters__count">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table card */}
      <div className="activity-table-card">
        <div className="activity-thead">
          <span className="activity-th activity-th--date">Date &amp; Time</span>
          <span className="activity-th activity-th--tool">Tool</span>
          <span className="activity-th activity-th--cat">Categories</span>
          <span className="activity-th activity-th--findings">Findings</span>
          <span className="activity-th activity-th--action">Action</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="activity-empty">
            No events match the current filters.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className={`activity-row ${selectedEvent?.id === event.id ? 'activity-row--selected' : ''}`}
              onClick={(): void => setSelectedEventId(event.id)}
            >
              <span className="activity-cell activity-cell--date">
                {formatDateTime(event.timestamp)}
              </span>
              <span className="activity-cell activity-cell--tool">
                <span
                  className="pill"
                  style={{ background: toolBgColor(event.tool) }}
                >
                  <span className="pill__dot" style={{ background: toolColor(event.tool) }} />
                  <span style={{ color: toolColor(event.tool) }}>
                    {toolLabel(event.tool)}
                  </span>
                </span>
              </span>
              <span className="activity-cell activity-cell--cat">
                {event.categories.map((cat) => (
                  <span
                    key={cat}
                    className="pill"
                    style={{ background: categoryBgColor(cat) }}
                  >
                    <span className="pill__dot" style={{ background: categoryColor(cat, true) }} />
                    <span style={{ color: categoryColor(cat, true) }}>
                      {categoryLabel(cat)}
                    </span>
                  </span>
                ))}
              </span>
              <span className="activity-cell activity-cell--findings">
                {event.findingCount}
              </span>
              <span
                className="activity-cell activity-cell--action"
                style={{ color: actionColor(event.action, true) }}
              >
                {actionLabel(event.action)}
              </span>
            </button>
          ))
        )}
      </div>

      {selectedEvent && <RecoveryDetail event={selectedEvent} />}
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
