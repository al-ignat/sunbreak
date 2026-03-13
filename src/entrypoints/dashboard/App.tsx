import type { JSX } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { Sun, Download } from 'lucide-preact';
import { TabNav } from '../../ui/dashboard/TabNav';
import type { TabId } from '../../ui/dashboard/TabNav';
import { BarChart } from '../../ui/dashboard/BarChart';
import { ActivityLog } from '../../ui/dashboard/ActivityLog';
import { SettingsPanel } from '../../ui/dashboard/SettingsPanel';
import { KeywordManager } from '../../ui/dashboard/KeywordManager';
import { CustomPatternManager } from '../../ui/dashboard/CustomPatternManager';
import { ReportCards } from '../../ui/dashboard/ReportCards';
import type {
  AggregatedStats,
  CustomPattern,
  FlaggedEvent,
  DetectionSettings,
  ExtensionSettings,
} from '../../storage/types';
import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
} from '../../storage/types';
import {
  getWeeklyStats,
  getFlaggedEvents,
  getDetectionSettings,
  getExtensionSettings,
  getKeywords,
  getCustomPatterns,
} from '../../storage/dashboard';

export default function App(): JSX.Element {
  // Resolve initial tab from URL hash
  const initialTab = resolveTabFromHash();

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [stats7, setStats7] = useState<AggregatedStats | null>(null);
  const [stats30, setStats30] = useState<AggregatedStats | null>(null);
  const [events, setEvents] = useState<ReadonlyArray<FlaggedEvent>>([]);
  const [detectionSettings, setDetectionSettingsLocal] = useState<DetectionSettings>(
    { ...DEFAULT_DETECTION_SETTINGS },
  );
  const [extensionSettings, setExtensionSettingsLocal] = useState<ExtensionSettings>(
    { ...DEFAULT_EXTENSION_SETTINGS },
  );
  const [keywords, setKeywordsLocal] = useState<ReadonlyArray<string>>([]);
  const [customPatterns, setCustomPatternsLocal] = useState<ReadonlyArray<CustomPattern>>([]);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [s7, s30, evts, ds, es, kw, patterns] = await Promise.all([
        getWeeklyStats(7),
        getWeeklyStats(30),
        getFlaggedEvents(),
        getDetectionSettings(),
        getExtensionSettings(),
        getKeywords(),
        getCustomPatterns(),
      ]);
      setStats7(s7);
      setStats30(s30);
      setEvents(evts);
      setDetectionSettingsLocal(ds);
      setExtensionSettingsLocal(es);
      setKeywordsLocal(kw);
      setCustomPatternsLocal(patterns);
    } catch {
      // Storage errors should not crash the dashboard
    }
  }, []);

  const refreshStats = useCallback(async (): Promise<void> => {
    try {
      const [s7, s30] = await Promise.all([getWeeklyStats(7), getWeeklyStats(30)]);
      setStats7(s7);
      setStats30(s30);
    } catch { /* ignore */ }
  }, []);

  const refreshEvents = useCallback(async (): Promise<void> => {
    try {
      setEvents(await getFlaggedEvents());
    } catch { /* ignore */ }
  }, []);

  const refreshSettings = useCallback(async (): Promise<void> => {
    try {
      const [ds, es] = await Promise.all([getDetectionSettings(), getExtensionSettings()]);
      setDetectionSettingsLocal(ds);
      setExtensionSettingsLocal(es);
    } catch { /* ignore */ }
  }, []);

  const refreshKeywords = useCallback(async (): Promise<void> => {
    try {
      setKeywordsLocal(await getKeywords());
    } catch { /* ignore */ }
  }, []);

  const refreshCustomPatterns = useCallback(async (): Promise<void> => {
    try {
      setCustomPatternsLocal(await getCustomPatterns());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void loadData();

    // Selectively refresh only the data that changed
    const listener = (changes: Record<string, chrome.storage.StorageChange>): void => {
      const keys = Object.keys(changes);
      if (keys.includes('dailyStats') || keys.includes('flaggedEvents')) {
        void refreshStats();
        void refreshEvents();
      }
      if (keys.includes('detectionSettings') || keys.includes('settings')) {
        void refreshSettings();
      }
      if (keys.includes('keywords')) {
        void refreshKeywords();
      }
      if (keys.includes('customPatterns')) {
        void refreshCustomPatterns();
      }
    };

    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(listener);
    }

    return (): void => {
      if (chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(listener);
      }
    };
  }, [loadData, refreshStats, refreshEvents, refreshSettings, refreshKeywords, refreshCustomPatterns]);

  function handleTabChange(tab: TabId): void {
    setActiveTab(tab);
    window.location.hash = tab;
  }

  return (
    <div>
      <header className="dash-header">
        <div className="dash-header__brand">
          <div className="dash-header__title-row">
            <Sun size={22} color="var(--color-warning)" aria-hidden="true" />
            <h1 className="dash-header__title">Sunbreak</h1>
          </div>
          <span className="dash-header__subtitle">Personal Dashboard</span>
        </div>
        {activeTab === 'overview' && (
          <div className="dash-header__actions">
            <button className="dash-header__export-btn" type="button">
              <Download size={14} />
              Export
            </button>
          </div>
        )}
      </header>

      <TabNav activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="dash-content">
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={activeTab}
        >
          {activeTab === 'overview' && (
            <BarChart stats7={stats7} stats30={stats30} />
          )}
          {activeTab === 'activity' && (
            <ActivityLog events={events} />
          )}
          {activeTab === 'settings' && (
            <SettingsPanel
              detectionSettings={detectionSettings}
              extensionSettings={extensionSettings}
              onDataChange={loadData}
            />
          )}
          {activeTab === 'keywords' && (
            <>
              <KeywordManager
                keywords={keywords}
                onDataChange={loadData}
              />
              <CustomPatternManager
                patterns={customPatterns}
                onDataChange={loadData}
              />
            </>
          )}
          {activeTab === 'reports' && <ReportCards />}
        </div>
      </main>
    </div>
  );
}

function resolveTabFromHash(): TabId {
  const hash = window.location.hash.slice(1);
  const valid: TabId[] = ['overview', 'activity', 'settings', 'keywords', 'reports'];
  return valid.includes(hash as TabId) ? (hash as TabId) : 'overview';
}
