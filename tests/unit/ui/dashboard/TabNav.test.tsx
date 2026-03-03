import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { TabNav } from '../../../../src/ui/dashboard/TabNav';

describe('TabNav', () => {
  it('renders all five tabs', () => {
    const { container } = render(
      <TabNav activeTab="overview" onTabChange={vi.fn()} />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Overview');
    expect(text).toContain('Activity Log');
    expect(text).toContain('Settings');
    expect(text).toContain('Keywords');
    expect(text).toContain('Report Cards');
  });

  it('marks the active tab with aria-selected', () => {
    const { container } = render(
      <TabNav activeTab="settings" onTabChange={vi.fn()} />,
    );
    const buttons = container.querySelectorAll('[role="tab"]');
    const settingsTab = Array.from(buttons).find(
      (b) => b.textContent === 'Settings',
    );
    expect(settingsTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    const { container } = render(
      <TabNav activeTab="overview" onTabChange={onTabChange} />,
    );
    const buttons = container.querySelectorAll('[role="tab"]');
    const keywordsTab = Array.from(buttons).find(
      (b) => b.textContent === 'Keywords',
    );
    fireEvent.click(keywordsTab!);
    expect(onTabChange).toHaveBeenCalledWith('keywords');
  });
});
