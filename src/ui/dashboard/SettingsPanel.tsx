import type { JSX } from 'preact';
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

  async function handleEnabledToggle(e: Event): Promise<void> {
    const enabled = (e.target as HTMLInputElement).checked;
    await setExtensionSettings({ enabled });
    await onDataChange();
  }

  async function handleModeChange(e: Event): Promise<void> {
    const value = (e.target as HTMLSelectElement).value;
    const mode: ExtensionSettings['interventionMode'] =
      value === 'log-only' ? 'log-only' : 'warn';
    await setExtensionSettings({ interventionMode: mode });
    await onDataChange();
  }

  return (
    <div className="settings-layout">
      <section className="section">
        <h3 className="section-header">Extension</h3>
        <label className="settings-label">
          <input
            type="checkbox"
            checked={extensionSettings.enabled}
            onChange={handleEnabledToggle}
            aria-label="Enable or disable extension"
            className="settings-checkbox"
          />
          <span>
            <span className="settings-label__text">
              Extension {extensionSettings.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className="settings-label__desc">
              {extensionSettings.enabled
                ? 'Monitoring prompts on AI tool pages'
                : 'Extension is paused. No prompts will be classified.'}
            </span>
          </span>
        </label>
      </section>

      <section className="section">
        <h3 className="section-header">Intervention Mode</h3>
        <div className="settings-mode-row">
          <select
            value={extensionSettings.interventionMode}
            onChange={handleModeChange}
            aria-label="Intervention mode"
            className="settings-select"
          >
            <option value="warn">Warn before sending</option>
            <option value="log-only">Log only (no overlay)</option>
          </select>
          <span className="settings-mode-desc">
            {extensionSettings.interventionMode === 'warn'
              ? 'Shows a warning overlay when sensitive data is detected.'
              : 'Classifies and logs events silently without interrupting your workflow.'}
          </span>
        </div>
      </section>

      <section className="section">
        <h3 className="section-header">Detection Categories</h3>
        <DetectionToggles
          settings={detectionSettings}
          onToggle={handleDetectionToggle}
        />
      </section>
    </div>
  );
}
