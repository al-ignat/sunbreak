import { describe, it, expect } from 'vitest';
import {
  evaluatePatternSamples,
  validateCustomPatternDefinition,
} from '../../../src/classifier/custom-pattern-validation';

describe('custom-pattern validation', () => {
  it('accepts a valid regex definition and sanitizes flags', () => {
    const result = validateCustomPatternDefinition({
      label: 'Employee ID',
      pattern: 'EMP-[0-9]{5}',
      flags: 'mig',
      samples: {
        positive: ['Employee EMP-12345'],
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedFlags).toBe('gim');
  });

  it('rejects invalid regex syntax', () => {
    const result = validateCustomPatternDefinition({
      label: 'Broken Pattern',
      pattern: '(',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Pattern is not a valid regular expression.');
  });

  it('warns for broad patterns', () => {
    const result = validateCustomPatternDefinition({
      label: 'Too Broad',
      pattern: '.*',
    });

    expect(result.warnings).toContain(
      'Pattern is extremely broad and may match too much prompt text.',
    );
  });

  it('warns for likely catastrophic backtracking shapes', () => {
    const result = validateCustomPatternDefinition({
      label: 'Risky',
      pattern: '(.*)+',
    });

    expect(result.warnings).toContain(
      'Pattern may be vulnerable to catastrophic backtracking.',
    );
  });

  it('warns when no samples are provided', () => {
    const result = validateCustomPatternDefinition({
      label: 'Invoice',
      pattern: 'INV-[0-9]{6}',
    });

    expect(result.warnings).toContain(
      'Add sample text so the pattern can be tested before enabling it.',
    );
  });
});

describe('custom-pattern sample evaluation', () => {
  it('returns match previews for positive and negative samples', () => {
    const result = evaluatePatternSamples({
      pattern: 'INV-[0-9]{6}',
      positive: ['Invoice INV-123456 is ready'],
      negative: ['No invoice reference here'],
    });

    expect(result.positive[0]?.matches).toEqual([
      {
        value: 'INV-123456',
        startIndex: 8,
        endIndex: 18,
      },
    ]);
    expect(result.negative[0]?.matches).toHaveLength(0);
  });
});
