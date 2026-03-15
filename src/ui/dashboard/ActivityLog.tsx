import type { JSX } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { ChevronDown } from 'lucide-preact';
import type { FlaggedEvent, ProviderGuidanceSettings } from '../../storage/types';
import { RecoveryDetail } from './RecoveryDetail';
import {
  toolLabel, toolColor, toolBgColor,
  actionLabel, actionColor,
  categoryColor, categoryBgColor, categoryLabel,
} from '../format';

export interface ActivityLogProps {
  readonly events: ReadonlyArray<FlaggedEvent>;
  readonly providerGuidance: ProviderGuidanceSettings;
  readonly recoveryAssistanceEnabled: boolean;
}

type DatePreset = '7d' | '30d' | 'all';

function resolveInitialToolFilter(): string {
  const [, query = ''] = window.location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const tool = params.get('tool');

  return tool === 'chatgpt' || tool === 'claude' || tool === 'gemini'
    ? tool
    : 'all';
}

export function ActivityLog({
  events,
  providerGuidance,
  recoveryAssistanceEnabled,
}: ActivityLogProps): JSX.Element {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [toolFilter, setToolFilter] = useState<string>(resolveInitialToolFilter);
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
    if (!recoveryAssistanceEnabled) return null;
    const current = filteredEvents.find((event) => event.id === selectedEventId);
    return current ?? filteredEvents[0] ?? null;
  }, [filteredEvents, recoveryAssistanceEnabled, selectedEventId]);

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

      <div className="activity-table-meta">
        <div>
          <p className="activity-table-meta__title">Recent flagged events</p>
          <p className="activity-table-meta__hint">
            {recoveryAssistanceEnabled
              ? 'Select a row to open recovery detail and next-step guidance.'
              : 'Recovery assistance is currently in development. Activity remains available as a lightweight history only.'}
          </p>
        </div>
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
          filteredEvents.map((event) => {
            const isSelected = selectedEvent?.id === event.id;

            return (
              <div key={event.id} className="activity-entry">
                <button
                  type="button"
                  className={`activity-row ${isSelected ? 'activity-row--selected' : ''} ${!recoveryAssistanceEnabled ? 'activity-row--static' : ''}`}
                  onClick={recoveryAssistanceEnabled ? (): void => setSelectedEventId(event.id) : undefined}
                  aria-label={recoveryAssistanceEnabled
                    ? `Open recovery detail for ${toolLabel(event.tool)} on ${formatDateTime(event.timestamp)}`
                    : `${toolLabel(event.tool)} event on ${formatDateTime(event.timestamp)}`}
                  aria-expanded={recoveryAssistanceEnabled ? isSelected : undefined}
                  aria-pressed={recoveryAssistanceEnabled ? isSelected : undefined}
                  disabled={!recoveryAssistanceEnabled}
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

                {recoveryAssistanceEnabled && isSelected && (
                  <div className="activity-row-detail">
                    <RecoveryDetail event={event} providerGuidance={providerGuidance} />
                  </div>
                )}
              </div>
            );
          })
        )}
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
