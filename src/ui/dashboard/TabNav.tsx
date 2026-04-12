import type { JSX } from 'preact';

export type TabId = 'overview' | 'activity' | 'settings' | 'sandbox' | 'keywords' | 'reports';

export interface TabNavProps {
  readonly activeTab: TabId;
  readonly onTabChange: (tab: TabId) => void;
}

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'settings', label: 'Settings' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'reports', label: 'Report Cards' },
];

export function TabNav({ activeTab, onTabChange }: TabNavProps): JSX.Element {
  return (
    <nav
      role="tablist"
      aria-label="Dashboard sections"
      className="tab-bar"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          onClick={(): void => onTabChange(tab.id)}
          className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
