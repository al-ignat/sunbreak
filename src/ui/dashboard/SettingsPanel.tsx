import type { JSX } from 'preact';
import { ChevronDown } from 'lucide-preact';
import type { DetectionSettings, ExtensionSettings } from '../../storage/types';
import type { ProviderGuidanceMode } from '../../storage/types';
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
  const guidanceOptions: ReadonlyArray<{
    readonly value: ProviderGuidanceMode;
    readonly label: string;
  }> = [
    { value: 'general', label: 'General / unknown' },
    { value: 'consumer', label: 'Consumer account' },
    { value: 'business', label: 'Business / team' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'api', label: 'API usage' },
    { value: 'workspace', label: 'Workspace / school' },
  ];

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

  async function handleProviderGuidanceChange(tool: 'chatgpt' | 'claude' | 'gemini', value: string): Promise<void> {
    const mode = (guidanceOptions.find((option) => option.value === value)?.value ?? 'general') as ProviderGuidanceMode;
    await setExtensionSettings({
      providerGuidance: {
        ...extensionSettings.providerGuidance,
        [tool]: mode,
      },
    });
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

      <div className="settings-card">
        <div className="settings-card__header">
          <span className="settings-row__title">Provider Guidance Mode</span>
          <span className="settings-row__desc">
            Tell Sunbreak which account context to assume when showing provider-specific recovery guidance.
          </span>
        </div>

        {(['chatgpt', 'claude', 'gemini'] as const).map((tool) => (
          <div key={tool}>
            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__title">{tool === 'chatgpt' ? 'ChatGPT' : tool === 'claude' ? 'Claude' : 'Gemini'}</span>
                <span className="settings-row__desc">
                  Guidance stays generic unless you choose a more specific mode here.
                </span>
              </div>
              <div className="settings-dropdown-wrap">
                <select
                  value={extensionSettings.providerGuidance[tool]}
                  onChange={(e: Event): Promise<void> => handleProviderGuidanceChange(tool, (e.target as HTMLSelectElement).value)}
                  aria-label={`${tool} guidance mode`}
                  className="settings-dropdown"
                >
                  {guidanceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="settings-dropdown__icon" />
              </div>
            </div>
            {tool !== 'gemini' && <div className="settings-divider" />}
          </div>
        ))}
      </div>
    </div>
  );
}
