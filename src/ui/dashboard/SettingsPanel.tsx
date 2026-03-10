import type { JSX } from 'preact';
import { ChevronDown } from 'lucide-preact';
import type { DetectionSettings, ExtensionSettings } from '../../storage/types';
import type { FindingType } from '../../classifier/types';
import { setDetectionSettings, setExtensionSettings } from '../../storage/dashboard';
import { DetectionToggles } from './DetectionToggles';

export interface SettingsPanelProps {
  readonly detectionSettings: DetectionSettings;
  readonly extensionSettings: ExtensionSettings;
  readonly onDataChange: () => Promise<void>;
}

export function SettingsPanel({
  detectionSettings,
  extensionSettings,
  onDataChange,
}: SettingsPanelProps): JSX.Element {
  async function handleDetectionToggle(type: FindingType, enabled: boolean): Promise<void> {
    const updated = { ...detectionSettings, [type]: enabled };
    await setDetectionSettings(updated);
    await onDataChange();
  }

  async function handleEnabledToggle(): Promise<void> {
    await setExtensionSettings({ enabled: !extensionSettings.enabled });
    await onDataChange();
  }

  async function handleModeChange(e: Event): Promise<void> {
    const value = (e.target as HTMLSelectElement).value;
    const mode: ExtensionSettings['interventionMode'] =
      value === 'log-only' ? 'log-only' : 'warn';
    await setExtensionSettings({ interventionMode: mode });
    await onDataChange();
  }

  async function handleMaskingToggle(): Promise<void> {
    await setExtensionSettings({ maskingEnabled: !extensionSettings.maskingEnabled });
    await onDataChange();
  }

  return (
    <div className="settings-layout">
      {/* Extension + Intervention Mode card */}
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__title">
              Extension {extensionSettings.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className="settings-row__desc">
              {extensionSettings.enabled
                ? 'Sunbreak is actively scanning prompts on supported AI tools.'
                : 'Extension is paused. No prompts will be classified.'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={extensionSettings.enabled}
            aria-label="Enable or disable extension"
            className={`toggle-switch ${extensionSettings.enabled ? 'toggle-switch--on' : ''}`}
            onClick={handleEnabledToggle}
          >
            <span className="toggle-switch__thumb" />
          </button>
        </div>

        <div className="settings-divider" />

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__title">Intervention Mode</span>
            <span className="settings-row__desc">
              How Sunbreak responds when sensitive data is detected.
            </span>
          </div>
          <div className="settings-dropdown-wrap">
            <select
              value={extensionSettings.interventionMode}
              onChange={handleModeChange}
              aria-label="Intervention mode"
              className="settings-dropdown"
            >
              <option value="warn">Warn before sending</option>
              <option value="log-only">Log only (no overlay)</option>
            </select>
            <ChevronDown size={14} className="settings-dropdown__icon" />
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__title">
              Smart Masking {extensionSettings.maskingEnabled ? 'On' : 'Off'}
            </span>
            <span className="settings-row__desc">
              {extensionSettings.maskingEnabled
                ? 'Fix replaces sensitive data with descriptive tokens. Copy AI responses to restore originals.'
                : 'Fix removes sensitive data without reversible tokens.'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={extensionSettings.maskingEnabled}
            aria-label="Enable or disable smart masking"
            className={`toggle-switch ${extensionSettings.maskingEnabled ? 'toggle-switch--on' : ''}`}
            onClick={handleMaskingToggle}
          >
            <span className="toggle-switch__thumb" />
          </button>
        </div>
      </div>

      {/* Detection Types card */}
      <div className="settings-card">
        <div className="settings-card__header">
          <span className="settings-row__title">Detection Types</span>
          <span className="settings-row__desc">
            Choose which types of sensitive data to detect.
          </span>
        </div>
        <DetectionToggles
          settings={detectionSettings}
          onToggle={handleDetectionToggle}
        />
      </div>
    </div>
  );
}
