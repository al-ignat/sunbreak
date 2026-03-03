import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { DetectionToggles } from '../../../../src/ui/dashboard/DetectionToggles';
import { DEFAULT_DETECTION_SETTINGS, DETECTION_CATEGORIES } from '../../../../src/storage/types';

describe('DetectionToggles', () => {
  it('renders all detection categories', () => {
    const { container } = render(
      <DetectionToggles
        settings={DEFAULT_DETECTION_SETTINGS}
        onToggle={vi.fn()}
      />,
    );
    for (const cat of DETECTION_CATEGORIES) {
      expect(container.textContent).toContain(cat.label);
    }
  });

  it('shows descriptions in non-compact mode', () => {
    const { container } = render(
      <DetectionToggles
        settings={DEFAULT_DETECTION_SETTINGS}
        onToggle={vi.fn()}
        compact={false}
      />,
    );
    expect(container.textContent).toContain('Detects email addresses');
  });

  it('hides descriptions in compact mode', () => {
    const { container } = render(
      <DetectionToggles
        settings={DEFAULT_DETECTION_SETTINGS}
        onToggle={vi.fn()}
        compact={true}
      />,
    );
    expect(container.textContent).not.toContain('Detects email addresses');
  });

  it('calls onToggle when a checkbox is clicked', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <DetectionToggles
        settings={DEFAULT_DETECTION_SETTINGS}
        onToggle={onToggle}
      />,
    );

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(DETECTION_CATEGORIES.length);

    // Toggle the first one off
    fireEvent.click(checkboxes[0] as HTMLInputElement);
    expect(onToggle).toHaveBeenCalledWith('email', false);
  });

  it('reflects disabled state', () => {
    const settings = { ...DEFAULT_DETECTION_SETTINGS, email: false };
    const { container } = render(
      <DetectionToggles settings={settings} onToggle={vi.fn()} />,
    );

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
  });
});
