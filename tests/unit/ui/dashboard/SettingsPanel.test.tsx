import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { SettingsPanel } from '../../../../src/ui/dashboard/SettingsPanel';
import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
} from '../../../../src/storage/types';

vi.mock('../../../../src/storage/dashboard', () => ({
  setDetectionSettings: vi.fn().mockResolvedValue(undefined),
  setExtensionSettings: vi.fn().mockResolvedValue(undefined),
}));

describe('SettingsPanel', () => {
  const onDataChange = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows recovery assistance as disabled and in development', async () => {
    render(
      <SettingsPanel
        detectionSettings={DEFAULT_DETECTION_SETTINGS}
        extensionSettings={DEFAULT_EXTENSION_SETTINGS}
        onDataChange={onDataChange}
      />,
    );

    expect(screen.getByText('Recovery Assistance Off')).toBeTruthy();
    expect(screen.getByText(/still in development/i)).toBeTruthy();
    expect(screen.queryByLabelText('claude guidance mode')).toBeNull();
    expect(screen.getByLabelText('Recovery assistance is currently unavailable')).toBeTruthy();
  });
});
