import type { JSX } from 'preact';
import type { DetectionSettings, ExtensionSettings } from '../../storage/types';
import type { FindingType } from '../../classifier/types';
import { setDetectionSettings, setExtensionSettings } from '../../storage/dashboard';
import { DetectionToggles } from './DetectionToggles';
import { sectionStyle, sectionHeaderStyle } from './styles';

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

