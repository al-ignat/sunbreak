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

  it('calls onToggle when a toggle switch is clicked', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <DetectionToggles
        settings={DEFAULT_DETECTION_SETTINGS}
        onToggle={onToggle}
      />,
    );

    const switches = container.querySelectorAll('[role="switch"]');
    expect(switches.length).toBe(DETECTION_CATEGORIES.length);

    // Toggle the first one off (email is currently on)
    fireEvent.click(switches[0] as HTMLButtonElement);
    expect(onToggle).toHaveBeenCalledWith('email', false);
  });

  it('reflects disabled state via aria-checked', () => {
    const settings = { ...DEFAULT_DETECTION_SETTINGS, email: false };
    const { container } = render(
      <DetectionToggles settings={settings} onToggle={vi.fn()} />,
    );

    const switches = container.querySelectorAll('[role="switch"]');
    expect((switches[0] as HTMLButtonElement).getAttribute('aria-checked')).toBe('false');
    expect((switches[1] as HTMLButtonElement).getAttribute('aria-checked')).toBe('true');
  });

  it('renders severity dots for each category', () => {
    const { container } = render(
      <DetectionToggles
        settings={DEFAULT_DETECTION_SETTINGS}
        onToggle={vi.fn()}
      />,
    );
    const dots = container.querySelectorAll('.detection-item__dot');
    expect(dots.length).toBe(DETECTION_CATEGORIES.length);
  });
});
