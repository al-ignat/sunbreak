import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/preact';
import { CustomPatternManager } from '../../../../src/ui/dashboard/CustomPatternManager';
import type { CustomPattern } from '../../../../src/storage/types';

vi.mock('../../../../src/storage/dashboard', () => ({
  upsertCustomPattern: vi.fn(),
  removeCustomPattern: vi.fn(),
  importCustomPatterns: vi.fn(),
  exportCustomPatterns: vi.fn(),
}));

import {
  removeCustomPattern,
  upsertCustomPattern,
} from '../../../../src/storage/dashboard';

function makePattern(overrides: Partial<CustomPattern> = {}): CustomPattern {
  return {
    id: 'pattern-1',
    label: 'Employee ID',
    description: 'Matches internal employee references',
    enabled: true,
    severity: 'warning',
    category: 'internal-identifier',
    sourceMode: 'template',
    templateId: 'employee-id',
    pattern: 'EMP-[0-9]{5}',
    flags: 'gi',
    samples: {
      positive: ['EMP-12345'],
      negative: ['No match'],
    },
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('CustomPatternManager', () => {
  const onDataChange = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (upsertCustomPattern as ReturnType<typeof vi.fn>).mockResolvedValue(makePattern());
    (removeCustomPattern as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows empty state when no custom patterns exist', () => {
    const { container } = render(
      <CustomPatternManager patterns={[]} onDataChange={onDataChange} />,
    );
    expect(container.textContent).toContain('No company patterns yet');
  });

  it('renders existing custom patterns', () => {
    const { container } = render(
      <CustomPatternManager patterns={[makePattern()]} onDataChange={onDataChange} />,
    );
    expect(container.textContent).toContain('Employee ID');
    expect(container.textContent).toContain('EMP-[0-9]{5}');
  });

  it('saves a template-based custom pattern', async () => {
    const { container, getByText } = render(
      <CustomPatternManager patterns={[]} onDataChange={onDataChange} />,
    );

    const labelInput = container.querySelector('input[placeholder="Employee ID"]') as HTMLInputElement;
    fireEvent.input(labelInput, { target: { value: 'Invoice Number' } });

    const templateSelect = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: 'invoice-number' } });

    fireEvent.click(getByText('Save Pattern'));

    await vi.waitFor(() => {
      expect(upsertCustomPattern).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Invoice Number',
          sourceMode: 'template',
          templateId: 'invoice-number',
        }),
      );
    });
  });

  it('removes an existing custom pattern', async () => {
    const { getByText } = render(
      <CustomPatternManager patterns={[makePattern()]} onDataChange={onDataChange} />,
    );

    fireEvent.click(getByText('Delete'));

    await vi.waitFor(() => {
      expect(removeCustomPattern).toHaveBeenCalledWith('pattern-1');
    });
  });
});
