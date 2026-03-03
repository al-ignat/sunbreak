import type { JSX } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import type { FlaggedEvent } from '../../storage/types';

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
      <div style={emptyStateStyle}>
        <p>No flagged events yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <FilterButton active={datePreset === '7d'} onClick={(): void => setDatePreset('7d')}>
            Last 7 days
          </FilterButton>
          <FilterButton active={datePreset === '30d'} onClick={(): void => setDatePreset('30d')}>
            Last 30 days
          </FilterButton>
          <FilterButton active={datePreset === 'all'} onClick={(): void => setDatePreset('all')}>
            All time
          </FilterButton>
        </div>

        <select
          value={toolFilter}
          onChange={(e: Event): void => setToolFilter((e.target as HTMLSelectElement).value)}
          aria-label="Filter by AI tool"
          style={selectStyle}
        >
          <option value="all">All tools</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
        </select>

        <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FAFAFA' }}>
              <th style={thStyle}>Date / Time</th>
              <th style={thStyle}>Tool</th>
              <th style={thStyle}>Categories</th>
              <th style={thStyle}>Findings</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  No events match the current filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id} style={{ borderTop: '1px solid #F0F0F0' }}>
                  <td style={tdStyle}>{formatDateTime(event.timestamp)}</td>
                  <td style={tdStyle}>
                    <span style={{ color: toolColor(event.tool), fontWeight: 500 }}>
                      {toolLabel(event.tool)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {event.categories.map((cat) => (
                      <span key={cat} style={categoryBadgeStyle}>
                        {cat}
                      </span>
                    ))}
                  </td>
                  <td style={tdStyle}>{event.findingCount}</td>
                  <td style={tdStyle}>
                    <span style={{ color: actionColor(event.action), fontWeight: 500 }}>
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

function toolLabel(tool: string): string {
  switch (tool) {
    case 'chatgpt': return 'ChatGPT';
    case 'claude': return 'Claude';
    case 'gemini': return 'Gemini';
    default: return tool;
  }
}

function toolColor(tool: string): string {
  switch (tool) {
    case 'chatgpt': return '#10A37F';
    case 'claude': return '#D97706';
    case 'gemini': return '#4285F4';
    default: return '#555';
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case 'redacted': return 'Redacted';
    case 'sent-anyway': return 'Sent Anyway';
    case 'cancelled': return 'Cancelled';
    case 'edited': return 'Edited';
    default: return action;
  }
}

function actionColor(action: string): string {
  switch (action) {
    case 'redacted': return '#2E7D32';
    case 'sent-anyway': return '#E65100';
    case 'cancelled': return '#888';
    case 'edited': return '#1565C0';
    default: return '#555';
  }
}

interface FilterButtonProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: string;
}

function FilterButton({ active, onClick, children }: FilterButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        background: active ? '#FF9800' : 'white',
        color: active ? 'white' : '#666',
        border: `1px solid ${active ? '#FF9800' : '#DDD'}`,
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

const thStyle: JSX.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle: JSX.CSSProperties = {
  padding: '10px 12px',
  fontSize: '13px',
};

const selectStyle: JSX.CSSProperties = {
  padding: '5px 8px',
  fontSize: '12px',
  border: '1px solid #DDD',
  borderRadius: '4px',
  background: 'white',
  color: '#555',
};

const categoryBadgeStyle: JSX.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  margin: '1px 2px',
  fontSize: '10px',
  background: '#FFF3E0',
  color: '#E65100',
  borderRadius: '3px',
};

const emptyStateStyle: JSX.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#888',
  fontSize: '14px',
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #E0E0E0',
};
