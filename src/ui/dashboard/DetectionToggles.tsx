import type { JSX } from 'preact';
import { DETECTION_CATEGORIES } from '../../storage/types';
import type { DetectionSettings } from '../../storage/types';
import type { FindingType } from '../../classifier/types';

export interface DetectionTogglesProps {
  readonly settings: DetectionSettings;
  readonly onToggle: (type: FindingType, enabled: boolean) => void;
  readonly compact?: boolean;
}

/** Severity dot color per detection type */
const SEVERITY_DOT: Record<string, string> = {
  'api-key': '#F87171',
  'ssn': '#FB923C',
  'credit-card': '#FB923C',
  'cpr': '#FB923C',
  'ni-number': '#FB923C',
  'email': '#FBBF24',
  'phone': '#FBBF24',
  'ip-address': '#FBBF24',
  'keyword': '#60A5FA',
};

export function DetectionToggles({
  settings,
  onToggle,
  compact = false,
}: DetectionTogglesProps): JSX.Element {
  return (
    <div className="detection-list">
      {DETECTION_CATEGORIES.map((cat, i) => {
        const isOn = settings[cat.type] ?? true;
        const isLast = i === DETECTION_CATEGORIES.length - 1;
        return (
          <div
            key={cat.type}
            className={`detection-item ${isLast ? '' : 'detection-item--bordered'}`}
          >
            <div className="detection-item__info">
              <div className="detection-item__name-row">
                <span
                  className="detection-item__dot"
                  style={{ background: SEVERITY_DOT[cat.type] ?? '#FBBF24' }}
                />
                <span className="detection-item__name">{cat.label}</span>
              </div>
              {!compact && (
                <span className="detection-item__desc">{cat.description}</span>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isOn}
              aria-label={`Toggle ${cat.label} detection`}
              className={`toggle-switch ${isOn ? 'toggle-switch--on' : ''}`}
              onClick={(): void => onToggle(cat.type, !isOn)}
            >
              <span className="toggle-switch__thumb" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
