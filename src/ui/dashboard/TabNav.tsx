import type { JSX } from 'preact';

export type TabId = 'overview' | 'activity' | 'settings' | 'keywords' | 'reports';

export interface TabNavProps {
  readonly activeTab: TabId;
  readonly onTabChange: (tab: TabId) => void;
}

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'settings', label: 'Settings' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'reports', label: 'Report Cards' },
];

export function TabNav({ activeTab, onTabChange }: TabNavProps): JSX.Element {
  return (
    <nav
      role="tablist"
      aria-label="Dashboard sections"
      style={{
        display: 'flex',
        borderBottom: '2px solid #E0E0E0',
        background: 'white',
        padding: '0 24px',
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          onClick={(): void => onTabChange(tab.id)}
          style={{
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? '#FF9800' : '#666',
            borderBottom: activeTab === tab.id ? '2px solid #FF9800' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
