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
    <div className={`detection-list ${compact ? 'detection-list--compact' : 'detection-list--full'}`}>
      {DETECTION_CATEGORIES.map((cat) => (
        <label
          key={cat.type}
          className={`detection-item ${compact ? 'detection-item--compact' : 'detection-item--full'}`}
        >
          <input
            type="checkbox"
            checked={settings[cat.type] ?? true}
            onChange={(e: Event): void => {
              const target = e.target as HTMLInputElement;
              onToggle(cat.type, target.checked);
            }}
            aria-label={`Toggle ${cat.label} detection`}
            className="detection-checkbox"
          />
          <span className="detection-item__label">
            <span className={`detection-item__name ${compact ? 'detection-item__name--compact' : 'detection-item__name--full'}`}>
              {cat.label}
            </span>
            {!compact && (
              <span className="detection-item__desc">
                {cat.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
