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
  function handleDetectionToggle(type: FindingType, enabled: boolean): void {
    const updated = { ...detectionSettings, [type]: enabled };
    void setDetectionSettings(updated).then(onDataChange);
  }

  function handleEnabledToggle(e: Event): void {
    const enabled = (e.target as HTMLInputElement).checked;
    void setExtensionSettings({ enabled }).then(onDataChange);
  }

  function handleModeChange(e: Event): void {
    const mode = (e.target as HTMLSelectElement).value as ExtensionSettings['interventionMode'];
    void setExtensionSettings({ interventionMode: mode }).then(onDataChange);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Extension Toggle */}
      <section style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Extension</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={extensionSettings.enabled}
            onChange={handleEnabledToggle}
            aria-label="Enable or disable extension"
            style={{ width: '18px', height: '18px', accentColor: '#FF9800', cursor: 'pointer' }}
          />
          <span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
              Extension {extensionSettings.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>
              {extensionSettings.enabled
                ? 'Monitoring prompts on AI tool pages'
                : 'Extension is paused. No prompts will be classified.'}
            </span>
          </span>
        </label>
      </section>

      {/* Intervention Mode */}
      <section style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Intervention Mode</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={extensionSettings.interventionMode}
            onChange={handleModeChange}
            aria-label="Intervention mode"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid #DDD',
              borderRadius: '6px',
              background: 'white',
            }}
          >
            <option value="warn">Warn before sending</option>
            <option value="log-only">Log only (no overlay)</option>
          </select>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {extensionSettings.interventionMode === 'warn'
              ? 'Shows a warning overlay when sensitive data is detected.'
              : 'Classifies and logs events silently without interrupting your workflow.'}
          </span>
        </div>
      </section>

      {/* Detection Categories */}
      <section style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Detection Categories</h3>
        <DetectionToggles
          settings={detectionSettings}
          onToggle={handleDetectionToggle}
        />
      </section>
    </div>
  );
}

const sectionStyle: JSX.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #E0E0E0',
  padding: '20px',
};

const sectionHeaderStyle: JSX.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#333',
  margin: '0 0 12px',
};
