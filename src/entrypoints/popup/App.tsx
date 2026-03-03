import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { AggregatedStats, FlaggedEvent, DetectionSettings } from '../../storage/types';
import { DEFAULT_DETECTION_SETTINGS } from '../../storage/types';
import type { FindingType } from '../../classifier/types';
import { getWeeklyStats, getFlaggedEvents, getDetectionSettings, setDetectionSettings } from '../../storage/dashboard';
import { StatsCard } from '../../ui/dashboard/StatsCard';
import { DetectionToggles } from '../../ui/dashboard/DetectionToggles';
import { toolLabel, toolColor, actionLabel, actionColor } from '../../ui/format';

export default function App(): JSX.Element {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<ReadonlyArray<FlaggedEvent>>([]);
  const [detectionSettings, setDetectionSettingsState] = useState<DetectionSettings>(
    { ...DEFAULT_DETECTION_SETTINGS },
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(): Promise<void> {
    try {
      const [weeklyStats, events, settings] = await Promise.all([
        getWeeklyStats(7),
        getFlaggedEvents({ days: 30 }),
        getDetectionSettings(),
      ]);
      setStats(weeklyStats);
      setRecentEvents(events.slice(0, 5));
      setDetectionSettingsState(settings);
    } catch {
      // Storage errors should not crash the popup
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(type: FindingType, enabled: boolean): void {
    const updated = { ...detectionSettings, [type]: enabled };
    setDetectionSettingsState(updated);
    void setDetectionSettings(updated);
  }

  function openDashboard(tab?: string): void {
    const url = tab
      ? chrome.runtime.getURL(`dashboard.html#${tab}`)
      : chrome.runtime.getURL('dashboard.html');
    void chrome.tabs.create({ url });
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#888', fontSize: '13px', textAlign: 'center' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h1 style={{ fontSize: '16px', margin: 0, color: '#333' }}>Secure BYOAI</h1>
        <button
          onClick={(): void => openDashboard('settings')}
          title="Settings"
          aria-label="Open settings"
          style={gearButtonStyle}
        >
          &#9881;
        </button>
      </div>

      {/* Stats Summary */}
      {stats && <StatsCard stats={stats} periodLabel="This week" />}

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <h2 style={sectionHeaderStyle}>Recent Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recentEvents.map((event) => (
              <div key={event.id} style={eventRowStyle}>
                <span style={{ fontSize: '11px', color: '#888', minWidth: '60px' }}>
                  {formatDate(event.timestamp)}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: toolColor(event.tool), minWidth: '55px' }}>
                  {toolLabel(event.tool)}
                </span>
                <span style={{ fontSize: '11px', color: '#555', flex: 1 }}>
                  {event.categories.join(', ')}
                </span>
                <span style={{ fontSize: '11px', color: actionColor(event.action), fontWeight: 500 }}>
                  {actionLabel(event.action)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Settings */}
      <div style={{ marginTop: '12px' }}>
        <h2 style={sectionHeaderStyle}>Detection Categories</h2>
        <DetectionToggles settings={detectionSettings} onToggle={handleToggle} compact={true} />
      </div>

      {/* Dashboard Link */}
      <button
        onClick={(): void => openDashboard()}
        style={dashboardLinkStyle}
      >
        View full dashboard
      </button>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

const containerStyle: JSX.CSSProperties = {
  padding: '16px',
  maxHeight: '500px',
  overflowY: 'auto',
};

const gearButtonStyle: JSX.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  color: '#888',
  padding: '4px',
  borderRadius: '4px',
};

const sectionHeaderStyle: JSX.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const eventRowStyle: JSX.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '4px 0',
  borderBottom: '1px solid #F0F0F0',
};

const dashboardLinkStyle: JSX.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '16px',
  padding: '10px',
  background: '#FF9800',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
};
