import type { JSX } from 'preact';
import { DETECTION_CATEGORIES } from '../../storage/types';
import type { DetectionSettings } from '../../storage/types';
import type { FindingType } from '../../classifier/types';

export interface DetectionTogglesProps {
  readonly settings: DetectionSettings;
  readonly onToggle: (type: FindingType, enabled: boolean) => void;
  readonly compact?: boolean;
}

export function DetectionToggles({
  settings,
  onToggle,
  compact = false,
}: DetectionTogglesProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '10px' }}>
      {DETECTION_CATEGORIES.map((cat) => (
        <label
          key={cat.type}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: compact ? '4px 0' : '6px 0',
          }}
        >
          <input
            type="checkbox"
            checked={settings[cat.type] ?? true}
            onChange={(e: Event): void => {
              const target = e.target as HTMLInputElement;
              onToggle(cat.type, target.checked);
            }}
            aria-label={`Toggle ${cat.label} detection`}
            style={{ width: '16px', height: '16px', accentColor: '#FF9800', cursor: 'pointer' }}
          />
          <span style={{ flex: 1 }}>
            <span style={{ fontSize: compact ? '12px' : '13px', fontWeight: 500, color: '#333' }}>
              {cat.label}
            </span>
            {!compact && (
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: '#888',
                  marginTop: '1px',
                }}
              >
                {cat.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
