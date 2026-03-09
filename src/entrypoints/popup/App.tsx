import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Sun, Settings, ArrowRight } from 'lucide-preact';
import type { AggregatedStats, FlaggedEvent } from '../../storage/types';
import { getWeeklyStats, getFlaggedEvents } from '../../storage/dashboard';
import { ComplianceGauge } from '../../ui/popup/ComplianceGauge';
import { toolLabel, toolColor, toolBgColor, actionLabel, actionColor, categoryColor, categoryBgColor } from '../../ui/format';

export default function App(): JSX.Element {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<ReadonlyArray<FlaggedEvent>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(): Promise<void> {
    try {
      const [weeklyStats, events] = await Promise.all([
        getWeeklyStats(7),
        getFlaggedEvents({ days: 30 }),
      ]);
      setStats(weeklyStats);
      setRecentEvents(events.slice(0, 3));
    } catch {
      // Storage errors should not crash the popup
    } finally {
      setLoading(false);
    }
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
        <div className="popup-brand">
          <Sun size={20} color="var(--color-warning)" aria-hidden="true" />
          <span className="popup-title">Sunbreak</span>
        </div>
        <button
          onClick={(): void => openUrl(settingsUrl)}
          title="Settings"
          aria-label="Open settings"
          className="popup-gear-btn"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Stats Summary */}
      <div className="popup-stats">
        <ComplianceGauge rate={complianceRate} size={64} />
        <div className="popup-stats__numbers">
          <div className="popup-stats__row">
            <span className="popup-stats__label">Flagged</span>
            <span className="popup-stats__value popup-stats__value--orange">
              {stats?.flaggedCount ?? 0}
            </span>
          </div>
          <div className="popup-stats__row">
            <span className="popup-stats__label">Redacted</span>
            <span className="popup-stats__value popup-stats__value--green">
              {stats?.redactedCount ?? 0}
            </span>
          </div>
          <div className="popup-stats__row">
            <span className="popup-stats__label">Sent anyway</span>
            <span className="popup-stats__value popup-stats__value--red">
              {stats?.sentAnywayCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <div className="popup-section">
          <h2 className="popup-section-header">Recent Activity</h2>
          <div className="popup-events">
            {recentEvents.map((event) => (
              <div key={event.id} className="popup-event-row">
                <span className="popup-event__date">
                  {formatTimeAgo(event.timestamp)}
                </span>
                <span
                  className="popup-event__tool-pill"
                  style={{
                    background: toolBgColor(event.tool),
                  }}
                >
                  <span
                    className="popup-event__dot"
                    style={{ background: toolColor(event.tool, true) }}
                  />
                  <span style={{ color: toolColor(event.tool, true) }}>
                    {toolLabel(event.tool)}
                  </span>
                </span>
                {event.categories.slice(0, 1).map((cat) => (
                  <span
                    key={cat}
                    className="popup-event__cat-pill"
                    style={{
                      background: categoryBgColor(cat),
                      color: categoryColor(cat, true),
                    }}
                  >
                    <span
                      className="popup-event__dot"
                      style={{ background: categoryColor(cat, true) }}
                    />
                    {formatCategory(cat)}
                  </span>
                ))}
                <span className="popup-event__spacer" />
                <span
                  className="popup-event__action"
                  style={{ color: actionColor(event.action, true) }}
                >
                  {actionLabel(event.action)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Link */}
      <div className="popup-footer">
        <a
          href={dashboardUrl}
          onClick={(e: MouseEvent): void => {
            e.preventDefault();
            openUrl(dashboardUrl);
          }}
          className="popup-dashboard-link"
        >
          Open Dashboard
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
