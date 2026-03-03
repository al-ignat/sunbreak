import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { KeywordManager } from '../../../../src/ui/dashboard/KeywordManager';

// Mock storage functions
vi.mock('../../../../src/storage/dashboard', () => ({
  addKeyword: vi.fn(),
  removeKeyword: vi.fn(),
  importKeywords: vi.fn(),
  exportKeywords: vi.fn(),
}));

import {
  addKeyword,
  removeKeyword,
} from '../../../../src/storage/dashboard';

describe('KeywordManager', () => {
  const onDataChange = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (addKeyword as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (removeKeyword as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('shows empty state when no keywords', () => {
    const { container } = render(
      <KeywordManager keywords={[]} onDataChange={onDataChange} />,
    );
    expect(container.textContent).toContain('No custom keywords');
  });

  it('renders keyword badges', () => {
    const { container } = render(
      <KeywordManager
        keywords={['secret', 'confidential']}
        onDataChange={onDataChange}
      />,
    );
    expect(container.textContent).toContain('secret');
    expect(container.textContent).toContain('confidential');
  });

  it('shows keyword count', () => {
    const { container } = render(
      <KeywordManager
        keywords={['alpha', 'beta']}
        onDataChange={onDataChange}
      />,
    );
    expect(container.textContent).toContain('2/500');
  });

  it('calls addKeyword and refreshes on add', async () => {
    const { container } = render(
      <KeywordManager keywords={[]} onDataChange={onDataChange} />,
    );

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'new-keyword' } });

    const addButton = container.querySelector('button');
    fireEvent.click(addButton as HTMLButtonElement);

    await vi.waitFor(() => {
      expect(addKeyword).toHaveBeenCalledWith('new-keyword');
    });
  });

  it('shows error when addKeyword returns error', async () => {
    (addKeyword as ReturnType<typeof vi.fn>).mockResolvedValue(
      'Keyword already exists',
    );

    const { container } = render(
      <KeywordManager keywords={['existing']} onDataChange={onDataChange} />,
    );

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'existing' } });

    const buttons = container.querySelectorAll('button');
    const addBtn = Array.from(buttons).find((b) => b.textContent === 'Add');
    fireEvent.click(addBtn as HTMLButtonElement);

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Keyword already exists');
    });
  });

  it('has remove buttons for each keyword', () => {
    const { container } = render(
      <KeywordManager
        keywords={['alpha', 'beta']}
        onDataChange={onDataChange}
      />,
    );

    // Find remove buttons (× characters)
    const removeButtons = container.querySelectorAll(
      'button[aria-label^="Remove keyword"]',
    );
    expect(removeButtons).toHaveLength(2);
  });

  it('calls removeKeyword when remove button is clicked', async () => {
    const { container } = render(
      <KeywordManager
        keywords={['alpha']}
        onDataChange={onDataChange}
      />,
    );

    const removeBtn = container.querySelector(
      'button[aria-label="Remove keyword alpha"]',
    );
    fireEvent.click(removeBtn as HTMLButtonElement);

    await vi.waitFor(() => {
      expect(removeKeyword).toHaveBeenCalledWith('alpha');
    });
  });

  it('disables add button when input is empty', () => {
    const { container } = render(
      <KeywordManager keywords={[]} onDataChange={onDataChange} />,
    );

    const buttons = container.querySelectorAll('button');
    const addBtn = Array.from(buttons).find((b) => b.textContent === 'Add');
    expect(addBtn?.getAttribute('disabled')).toBe('');
  });
});
