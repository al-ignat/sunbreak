import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { AggregatedStats, FlaggedEvent, DetectionSettings } from '../../storage/types';
import { DEFAULT_DETECTION_SETTINGS } from '../../storage/types';
import type { FindingType } from '../../classifier/types';
import { getWeeklyStats, getFlaggedEvents, getDetectionSettings, setDetectionSettings } from '../../storage/dashboard';
import { ComplianceGauge } from '../../ui/popup/ComplianceGauge';
import { DetectionToggles } from '../../ui/dashboard/DetectionToggles';
import { GearIcon } from '../../ui/icons/GearIcon';
import { ArrowRightIcon } from '../../ui/icons/ArrowRightIcon';
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

  const dashboardUrl = chrome.runtime.getURL('dashboard.html');
  const settingsUrl = chrome.runtime.getURL('dashboard.html#settings');

  function openUrl(url: string): void {
    void chrome.tabs.create({ url });
  }

  if (loading) {
    return (
      <div className="popup-container">
        <p className="popup-loading">Loading...</p>
      </div>
    );
  }

  const complianceRate = stats ? stats.complianceRate : null;

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <h1 className="popup-title">Secure BYOAI</h1>
        <button
          onClick={(): void => openUrl(settingsUrl)}
          title="Settings"
          aria-label="Open settings"
          className="popup-gear-btn"
        >
          <GearIcon size={16} />
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="popup-stats">
          <ComplianceGauge rate={complianceRate} />
          <div className="popup-stats__numbers">
            <div className="popup-stats__row">
              <span className="popup-stats__value">{stats.totalFlagged}</span>
              <span className="popup-stats__label">flagged</span>
            </div>
            <span className="popup-stats__sub">
              {stats.totalRedacted} redacted &middot; {stats.totalSentAnyway} sent anyway
            </span>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <div className="popup-section">
          <h2 className="popup-section-header">Recent Activity</h2>
          <div className="popup-events">
            {recentEvents.map((event) => (
              <div key={event.id} className="popup-event-row">
                <span className="popup-event__date">
                  {formatDate(event.timestamp)}
                </span>
                <span className="popup-event__tool" style={{ color: toolColor(event.tool) }}>
                  {toolLabel(event.tool)}
                </span>
                <span className="popup-event__categories">
                  {event.categories.join(', ')}
                </span>
                <span className="popup-event__action" style={{ color: actionColor(event.action) }}>
                  {actionLabel(event.action)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Settings */}
      <div className="popup-section">
        <h2 className="popup-section-header">Detection Categories</h2>
        <DetectionToggles settings={detectionSettings} onToggle={handleToggle} compact={true} />
      </div>

      {/* Dashboard Link */}
      <a
        href={dashboardUrl}
        onClick={(e: MouseEvent): void => {
          e.preventDefault();
          openUrl(dashboardUrl);
        }}
        className="popup-dashboard-link"
      >
        Dashboard
        <ArrowRightIcon size={12} />
      </a>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}
