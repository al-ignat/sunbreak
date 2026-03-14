import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import { SettingsPanel } from '../../../../src/ui/dashboard/SettingsPanel';
import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
} from '../../../../src/storage/types';

vi.mock('../../../../src/storage/dashboard', () => ({
  setDetectionSettings: vi.fn().mockResolvedValue(undefined),
  setExtensionSettings: vi.fn().mockResolvedValue(undefined),
}));

import { setExtensionSettings } from '../../../../src/storage/dashboard';

describe('SettingsPanel', () => {
  const onDataChange = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a single provider guidance mode without dropping others', async () => {
    render(
      <SettingsPanel
        detectionSettings={DEFAULT_DETECTION_SETTINGS}
        extensionSettings={DEFAULT_EXTENSION_SETTINGS}
        onDataChange={onDataChange}
      />,
    );

    const select = screen.getByLabelText('claude guidance mode') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'enterprise' } });

    await vi.waitFor(() => {
      expect(setExtensionSettings).toHaveBeenCalledWith({
        providerGuidance: {
          chatgpt: 'general',
          claude: 'enterprise',
          gemini: 'general',
        },
      });
    });
  });
});
